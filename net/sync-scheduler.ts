import { TrustPool } from '../auth/session.ts';
import { JSONCyclicalEncoder } from '../base/core-types/encoding/json.ts';
import {
  JSONCyclicalDecoder,
  JSONEncoder,
  JSONDecoder,
} from '../base/core-types/encoding/json.ts';
import { kSecondMs } from '../base/date.ts';
import { assert } from '../base/error.ts';
import { ReadonlyJSONArray, ReadonlyJSONObject } from '../base/interfaces.ts';
import { MovingAverage, randomInt } from '../base/math.ts';
import { SerialScheduler } from '../base/serial-scheduler.ts';
import { retry } from '../base/time.ts';
import { serviceUnavailable } from '../cfds/base/errors.ts';
import { log } from '../logging/log.ts';
import { RepositoryType } from '../repo/repo.ts';
import { SyncMessage, SyncValueType } from './message.ts';
import { sendJSONToURL } from './rest-api.ts';

const K_MAX_REQ_BATCH = 20;

export interface SyncConfig {
  minSyncFreqMs: number;
  maxSyncFreqMs: number;
  syncDurationMs: number;
  pollingBackoffDurationMs: number;
  timeoutMs: number;
}

export const kSyncConfigClient: SyncConfig = {
  minSyncFreqMs: 0.3 * kSecondMs,
  maxSyncFreqMs: 1.5 * kSecondMs,
  syncDurationMs: kSecondMs,
  pollingBackoffDurationMs: 20 * kSecondMs,
  timeoutMs: 10 * kSecondMs,
};

export const kSyncConfigServer: SyncConfig = {
  ...kSyncConfigClient,
  pollingBackoffDurationMs: 3 * kSecondMs,
  timeoutMs: 5 * kSecondMs,
};

// export const kSyncConfigServer = kSyncConfigClient;

export function syncConfigGetCycles(
  config: SyncConfig,
  actualSyncFreqMs = 0,
): number {
  return Math.min(
    3,
    Math.max(
      1,
      Math.floor(
        config.syncDurationMs /
          Math.max(actualSyncFreqMs, config.minSyncFreqMs),
      ),
    ),
  );
}

interface SyncRequest {
  storage: RepositoryType;
  id: string;
  msg: SyncMessage<SyncValueType>;
}

interface PendingSyncRequest {
  req: SyncRequest;
  resolve: (resp: SyncMessage<SyncValueType>) => void;
  reject: (err: unknown) => void;
}

export enum SyncPriority {
  MIN = 0,
  normal = MIN,
  firstLoad = 1,
  localChanges = 2,
  MAX = localChanges,
}

export class SyncScheduler {
  private readonly _syncFreqAvg: MovingAverage;
  private _pendingRequests: Map<SyncPriority, PendingSyncRequest[]>;
  private _intervalId: number;
  private _fetchInProgress = false;

  constructor(
    readonly url: string,
    readonly syncConfig: SyncConfig,
    readonly trustPool: TrustPool,
    readonly orgId: string,
  ) {
    this._syncFreqAvg = new MovingAverage(
      syncConfigGetCycles(kSyncConfigClient) * 2,
    );
    this._pendingRequests = new Map();
    this._intervalId = setInterval(() => this.sendPendingRequests(), 200);
  }

  get syncCycles(): number {
    return syncConfigGetCycles(this.syncConfig, this._syncFreqAvg.currentValue);
  }

  close(): void {
    if (this._intervalId >= 0) {
      clearInterval(this._intervalId);
      this._intervalId = -1;
    }
  }

  send(
    storage: RepositoryType,
    id: string,
    msg: SyncMessage<SyncValueType>,
    priority: SyncPriority = SyncPriority.normal,
  ): Promise<SyncMessage<SyncValueType>> {
    let resolve!: (resp: SyncMessage<SyncValueType>) => void;
    let reject!: (err: unknown) => void;
    const result = new Promise<SyncMessage<SyncValueType>>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    let queue = this._pendingRequests.get(priority);
    if (!queue) {
      queue = [];
      this._pendingRequests.set(priority, queue);
    }
    queue.push({ req: { storage, id, msg }, resolve, reject });
    return result;
  }

  private async sendPendingRequests(): Promise<void> {
    if (this._fetchInProgress) {
      return;
    }
    const pendingRequests: PendingSyncRequest[] = [];
    for (
      let priority: number = SyncPriority.MAX;
      priority >= SyncPriority.MIN;
      --priority
    ) {
      const queue = this._pendingRequests.get(priority);
      if (!queue) {
        continue;
      }
      for (let i = 0; i < K_MAX_REQ_BATCH && queue.length > 0; ++i) {
        pendingRequests.push(queue.shift()!);
      }
      if (pendingRequests.length >= K_MAX_REQ_BATCH) {
        break;
      }
    }
    if (!pendingRequests.length) {
      return;
    }
    const reqArr = pendingRequests.map((p) => ({
      ...p.req,
      msg: JSONCyclicalEncoder.serialize(p.req.msg),
    }));

    let respText: string | undefined;
    try {
      this._fetchInProgress = true;
      const start = performance.now();
      const resp = await sendJSONToURL(
        this.url,
        this.trustPool.currentSession,
        reqArr,
        this.orgId,
        this.syncConfig.timeoutMs,
      );
      respText = resp.status === 200 ? await resp.text() : undefined;

      const syncDurationMs = performance.now() - start;
      this._syncFreqAvg.addValue(syncDurationMs);
      if (randomInt(0, 20) === 0) {
        log({
          severity: 'METRIC',
          name: 'PeerResponseTime',
          value: syncDurationMs,
          unit: 'Milliseconds',
          url: this.url,
        });
      }
    } catch (e) {
      log({
        severity: 'INFO',
        error: 'FetchError',
        message: e.message,
        trace: e.stack,
        url: this.url,
      });
    } finally {
      this._fetchInProgress = false;
    }

    if (!respText) {
      pendingRequests.forEach((r) => r.reject(serviceUnavailable()));
      return;
    }
    try {
      const json = JSON.parse(respText) as ReadonlyJSONArray;
      assert(json instanceof Array && json.length === pendingRequests.length);
      for (const req of pendingRequests) {
        let found = false;
        for (const resp of json as ReadonlyJSONObject[]) {
          if (resp.storage === req.req.storage && resp.id === req.req.id) {
            const syncResp = new SyncMessage<SyncValueType>({
              decoder: new JSONCyclicalDecoder(resp.res as ReadonlyJSONObject),
              orgId: this.orgId,
            });
            req.resolve(syncResp);
            found = true;
            break;
          }
        }
        if (!found) {
          req.reject(serviceUnavailable());
        }
      }
    } catch (e) {
      log({
        severity: 'INFO',
        error: 'SerializeError',
        value: respText,
        message: e.message,
        trace: e.stack,
      });
      pendingRequests.forEach((r) => r.reject(serviceUnavailable()));
      return;
    }
  }
}
