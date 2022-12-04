import EventEmitter from 'https://esm.sh/eventemitter3@4.0.7';
import { EaseInOutSineTimer } from '../base/timer.ts';
import { BloomFilter } from '../base/bloom.ts';
import { SyncMessage, SyncValueType } from './types.ts';
import { retry } from '../base/time.ts';
import { log } from '../logging/log.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { MovingAverage } from '../base/math.ts';
import { VersionNumber } from '../defs.ts';

export interface SyncConfig {
  minSyncFreqMs: number;
  maxSyncFreqMs: number;
  syncDurationMs: number;
}

export const kSyncConfigClient: SyncConfig = {
  minSyncFreqMs: 300,
  maxSyncFreqMs: 3000,
  syncDurationMs: 2000,
};

export const kSyncConfigServer: SyncConfig = {
  minSyncFreqMs: 100,
  maxSyncFreqMs: 60000,
  syncDurationMs: 300,
};

export function syncConfigGetCycles(
  config: SyncConfig,
  actualSyncFreqMs = 0
): number {
  return Math.floor(
    config.syncDurationMs / Math.max(actualSyncFreqMs, config.minSyncFreqMs)
  );
}

export const EVENT_ONLINE_STATUS_CHANGED = 'online_changed';
export const EVENT_PROTOCOL_VERSION_CHANGED = 'protocol_version_changed';

/**
 * A base class for sync channel clients. This class takes care of everything
 * but interacting with the values themselves. It takes care of adaptive timing,
 * network errors, and other book keeping.
 *
 * Storage and encoding of values are left for concrete subclasses.
 */
export abstract class BaseClient<
  ValueType extends SyncValueType
> extends EventEmitter {
  private readonly _timer: EaseInOutSineTimer;
  private readonly _serverUrl: string;
  private readonly _syncConfig: SyncConfig;
  private readonly _syncFreqAvg: MovingAverage;
  private _previousServerFilter: BloomFilter | undefined;
  private _previousServerSize: number;
  private _connectionOnline = false;
  private _serverVersionNumber: VersionNumber = VersionNumber.Unknown;

  constructor(serverUrl: string, syncConfig: SyncConfig) {
    super();
    this._serverUrl = serverUrl;
    this._syncConfig = syncConfig;
    this._timer = new EaseInOutSineTimer(
      syncConfig.minSyncFreqMs,
      syncConfig.maxSyncFreqMs,
      syncConfig.maxSyncFreqMs * 3,
      async () => {
        try {
          await this.sendSyncMessage();
        } catch (e) {
          log({
            severity: 'INFO',
            error: 'UnknownSyncError',
            message: e.message,
            trace: e.stack,
          });
        }
      },
      true,
      'Sync timer'
    );
    this._syncFreqAvg = new MovingAverage(
      syncConfigGetCycles(this.syncConfig) * 2
    );
    this._previousServerSize = 0;
  }

  get serverUrl(): string {
    return this.serverUrl;
  }

  get isOnline(): boolean {
    return this._connectionOnline;
  }

  get previousServerFilter(): BloomFilter | undefined {
    return this._previousServerFilter;
  }

  get previousServerSize(): number {
    return this._previousServerSize;
  }

  get syncConfig(): SyncConfig {
    return this._syncConfig;
  }

  get syncCycles(): number {
    return syncConfigGetCycles(this.syncConfig, this._syncFreqAvg.currentValue);
  }

  get serverVersion(): VersionNumber {
    return this._serverVersionNumber;
  }

  private set serverVersion(v: VersionNumber) {
    if (this._serverVersionNumber !== v) {
      this._serverVersionNumber = v;
      this.emit(EVENT_PROTOCOL_VERSION_CHANGED);
    }
  }

  protected abstract buildSyncMessage(): SyncMessage<ValueType>;
  protected abstract persistPeerValues(values: ValueType[]): number;
  abstract localIds(): Iterable<string>;

  private _setIsOnline(value: boolean): void {
    if (value !== this._connectionOnline) {
      this._connectionOnline = value;
      this.emit(EVENT_ONLINE_STATUS_CHANGED);
    }
  }

  startSyncing(): typeof this {
    this._timer.schedule();
    return this;
  }

  stopSyncing(): typeof this {
    this._timer.unschedule();
    this._timer.reset();
    return this;
  }

  private async sendSyncMessage(): Promise<void> {
    const syncConfig = this._syncConfig;
    const reqMsg = this.buildSyncMessage();
    const msg = JSONCyclicalEncoder.serialize(reqMsg);
    let respText: string | undefined;
    try {
      const start = performance.now();
      respText = await retry(async () => {
        const resp = await fetch(this._serverUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(msg),
        });
        return await resp.text();
      }, syncConfig.minSyncFreqMs);

      const syncDurationMs = performance.now() - start;
      this._syncFreqAvg.addValue(syncDurationMs);
      log({
        severity: 'INFO',
        name: 'PeerResponseTime',
        value: syncDurationMs,
        unit: 'Milliseconds',
        url: this._serverUrl,
      });
    } catch (e) {
      log({
        severity: 'INFO',
        error: 'FetchError',
        message: e.message,
        trace: e.stack,
        url: this._serverUrl,
      });
    }

    if (!respText) {
      this._setIsOnline(false);
      return;
    }
    let syncResp: typeof reqMsg;
    try {
      const json = JSON.parse(respText);
      syncResp = new SyncMessage({ decoder: new JSONCyclicalDecoder(json) });
    } catch (e) {
      log({
        severity: 'INFO',
        error: 'SerializeError',
        value: respText,
        message: e.message,
        trace: e.stack,
      });
      this._setIsOnline(false);
      return;
    }

    this._previousServerFilter = syncResp.filter;
    this._previousServerSize = syncResp.size;
    let persistedCount = 0;
    if (
      // We only write to newer versions and ignore new values
      syncResp.buildVersion <= VersionNumber.Current &&
      syncResp.values.length
    ) {
      const start = performance.now();
      // persistedCount = repo.persistCommits(syncResp.commits).length;
      persistedCount = this.persistPeerValues(syncResp.values);
      log({
        severity: 'INFO',
        name: 'CommitsPersistTime',
        value: performance.now() - start,
        unit: 'Milliseconds',
      });
      log({
        severity: 'INFO',
        name: 'CommitsPersistCount',
        value: persistedCount,
        unit: 'Count',
      });
    }
    if (persistedCount > 0 || this.needsReplication()) {
      this.touch();
    }
    this._setIsOnline(true);
  }

  /**
   * Returns a promise that completes when both peers have reached consensus.
   * This method is probabilistic and fakes the appearance of a steady state
   * between this client and the server. It's intended to be used in back-office
   * and diagnostics tools, and not in app-to-server or server-to-server
   * communication (which rely on indefinite polling loop).
   */
  async sync(): Promise<void> {
    const syncConfig = this._syncConfig;
    const cycleCount = syncConfigGetCycles(syncConfig) + 1;
    // We need to do a minimum number of successful sync cycles in order to make
    // sure everything is sync'ed. Also need to make sure we don't have any
    // local commits that our peer doesn't have (local changes or peer recovery)
    let i = 0;
    do {
      await this.sendSyncMessage();
      ++i;
    } while (i < cycleCount || this.needsReplication());
  }

  needsReplication(): boolean {
    const serverFilter = this._previousServerFilter;
    if (!serverFilter) {
      return true;
    }
    for (const id of this.localIds()) {
      if (!serverFilter.has(id)) {
        return true;
      }
    }
    return false;
  }

  touch(): void {
    // this._timer.unschedule();
    // this.sendSyncMessage();
    this._timer.reset();
    this._timer.schedule();
  }
}
