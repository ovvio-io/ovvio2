import { EaseInOutSineTimer } from '../base/timer.ts';
import { BloomFilter } from '../base/bloom.ts';
import { SyncMessage } from './types.ts';
import { CoreValue } from '../base/core-types/base.ts';
import { retry } from '../base/time.ts';
import { log } from '../logging/log.ts';

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

export function syncConfigGetCycles(config: SyncConfig): number {
  return Math.floor(config.syncDurationMs / config.minSyncFreqMs);
}

export type OnlineStatusHandler = () => void;

export abstract class BaseClient<ValueType extends CoreValue> {
  private readonly _timer: EaseInOutSineTimer;
  private readonly _serverUrl: string;
  private readonly _syncConfig: SyncConfig;
  private readonly _onlineHandler?: OnlineStatusHandler;
  private _previousServerFilter: BloomFilter | undefined;
  private _previousServerSize: number;
  private _connectionOnline = false;

  constructor(
    serverUrl: string,
    syncConfig: SyncConfig,
    onlineHandler?: OnlineStatusHandler
  ) {
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
    this._onlineHandler = onlineHandler;
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
    return syncConfigGetCycles(this.syncConfig);
  }

  protected abstract buildSyncMessage(): SyncMessage<ValueType>;
  protected abstract persistPeerValues(values: ValueType[]): number;
  abstract localIds(): Iterable<string>;

  private _setIsOnline(value: boolean): void {
    if (value !== this._connectionOnline) {
      this._connectionOnline = value;
      if (this._onlineHandler) {
        this._onlineHandler();
      }
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
    const msg = reqMsg.toJS();
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
      log({
        severity: 'INFO',
        name: 'PeerResponseTime',
        value: performance.now() - start,
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
      syncResp = SyncMessage.fromJS(json);
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
    this._previousServerSize = syncResp.repoSize;
    let persistedCount = 0;
    if (syncResp.values.length) {
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
