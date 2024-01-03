import { OwnedSession } from '../auth/session.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { kSecondMs } from '../base/date.ts';
import { assert } from '../base/error.ts';
import { MovingAverage } from '../base/math.ts';
import { retry } from '../base/time.ts';
import { serviceUnavailable } from '../cfds/base/errors.ts';
import { log } from '../logging/log.ts';
import { RepositoryType } from '../repo/repo.ts';
import { SyncMessage, SyncValueType } from './message.ts';
import { sendJSONToURL } from './rest-api.ts';

export interface SyncConfig {
  minSyncFreqMs: number;
  maxSyncFreqMs: number;
  syncDurationMs: number;
}

export const kSyncConfigClient: SyncConfig = {
  minSyncFreqMs: 300,
  maxSyncFreqMs: 3000,
  syncDurationMs: 600,
};

// export const kSyncConfigServer: SyncConfig = {
//   minSyncFreqMs: 100,
//   maxSyncFreqMs: 3000,
//   syncDurationMs: 1500,
// };

export const kSyncConfigServer = kSyncConfigClient;

export function syncConfigGetCycles(
  config: SyncConfig,
  actualSyncFreqMs = 0,
): number {
  return Math.floor(
    config.syncDurationMs / Math.max(actualSyncFreqMs, config.minSyncFreqMs),
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

export class SyncScheduler {
  private readonly _syncFreqAvg: MovingAverage;
  private _pendingRequests: PendingSyncRequest[];
  private _intervalId: number;

  constructor(
    readonly url: string,
    readonly syncConfig: SyncConfig,
    readonly session: OwnedSession,
    readonly orgId?: string,
  ) {
    this._syncFreqAvg = new MovingAverage(
      syncConfigGetCycles(kSyncConfigClient) * 2,
    );
    this._pendingRequests = [];
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
  ): Promise<SyncMessage<SyncValueType>> {
    let resolve!: (resp: SyncMessage<SyncValueType>) => void;
    let reject!: (err: unknown) => void;
    const result = new Promise<SyncMessage<SyncValueType>>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this._pendingRequests.push({ req: { storage, id, msg }, resolve, reject });
    return result;
  }

  private async sendPendingRequests(): Promise<void> {
    const pendingRequests = this._pendingRequests;
    if (pendingRequests.length <= 0) {
      return;
    }
    this._pendingRequests = [];
    const reqArr = pendingRequests.map((p) => ({
      ...p.req,
      msg: JSONCyclicalEncoder.serialize(p.req.msg),
    }));

    let respText: string | undefined;
    try {
      const start = performance.now();
      respText = await retry(async () => {
        const resp = await sendJSONToURL(
          this.url,
          this.session,
          reqArr,
          this.orgId,
        );
        return await resp.text();
      }, 3 * kSecondMs);

      const syncDurationMs = performance.now() - start;
      this._syncFreqAvg.addValue(syncDurationMs);
      log({
        severity: 'METRIC',
        name: 'PeerResponseTime',
        value: syncDurationMs,
        unit: 'Milliseconds',
        url: this.url,
      });
    } catch (e) {
      log({
        severity: 'INFO',
        error: 'FetchError',
        message: e.message,
        trace: e.stack,
        url: this.url,
      });
    }

    if (!respText) {
      pendingRequests.forEach((r) => r.reject(serviceUnavailable()));
      return;
    }
    try {
      const json = JSON.parse(respText);
      assert(json instanceof Array && json.length === pendingRequests.length);
      for (let i = 0; i < pendingRequests.length; ++i) {
        const syncResp = new SyncMessage<SyncValueType>({
          decoder: new JSONCyclicalDecoder(json[i].res),
        });
        pendingRequests[i].resolve(syncResp);
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
