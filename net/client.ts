import { Repository, RepoStorage } from '../cfds/base/repo.ts';
import { EaseInOutSineTimer } from '../base/timer.ts';
import { BloomFilter } from '../base/bloom.ts';
import { SyncMessage } from './types.ts';
import { retry } from '../base/time.ts';
import { log } from '../logging/log.ts';
import { count } from '../base/common.ts';

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

export class Client<T extends RepoStorage<T>> {
  private readonly _timer: EaseInOutSineTimer;
  private readonly _repo: Repository<T>;
  private readonly _serverUrl: string;
  private readonly _syncConfig: SyncConfig;
  private readonly _onlineHandler?: OnlineStatusHandler;
  private _previousServerFilter: BloomFilter | undefined;
  private _previousServerSize: number;

  private _connectionOnline = false;

  constructor(
    repo: Repository<T>,
    serverUrl: string,
    syncConfig: SyncConfig,
    onlineHandler?: OnlineStatusHandler
  ) {
    this._repo = repo;
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
          // Silently ignore sync errors while polling
        }
      },
      true,
      'Sync timer'
    );
    this._onlineHandler = onlineHandler;
    this._previousServerSize = 0;
  }

  get repo(): Repository<T> {
    return this._repo;
  }

  get serverUrl(): string {
    return this.serverUrl;
  }

  get isOnline(): boolean {
    return this._connectionOnline;
  }

  private _setIsOnline(value: boolean): void {
    if (value !== this._connectionOnline) {
      this._connectionOnline = value;
      if (this._onlineHandler) {
        this._onlineHandler();
      }
    }
  }

  startSyncing(): Client<T> {
    this._timer.schedule();
    return this;
  }

  stopSyncing(): Client<T> {
    this._timer.unschedule();
    this._timer.reset();
    return this;
  }

  private async sendSyncMessage(): Promise<void> {
    const syncConfig = this._syncConfig;
    const repo = this.repo;
    const msg = SyncMessage.build(
      this._previousServerFilter,
      repo,
      this._previousServerSize,
      syncConfigGetCycles(syncConfig)
    ).toJS();
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
    let syncResp: SyncMessage;
    try {
      const json = JSON.parse(respText);
      syncResp = SyncMessage.fromJS(json);
    } catch (e) {
      log({ severity: 'INFO', error: 'SerializeError', value: respText });
      this._setIsOnline(false);
      return;
    }

    this._previousServerFilter = syncResp.filter;
    this._previousServerSize = syncResp.repoSize;
    let persistedCount = 0;
    if (syncResp.commits.length) {
      const start = performance.now();
      persistedCount = repo.persistCommits(syncResp.commits).length;
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
    for (const c of this.repo.commits()) {
      if (!serverFilter.has(c.id)) {
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
