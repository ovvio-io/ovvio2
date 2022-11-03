import { Repository, RepoStorage } from '../cfds/base/repo.ts';
import { EaseInOutSineTimer } from '../base/timer.ts';
import { BloomFilter } from '../base/bloom.ts';
import { SyncMessage } from './types.ts';

export interface SyncConfig {
  minSyncFreq: number;
  maxSyncFreq: number;
  syncDuration: number;
}

export const kSyncConfigClient: SyncConfig = {
  minSyncFreq: 300,
  maxSyncFreq: 3000,
  syncDuration: 2000,
};

export const kSyncConfigServer: SyncConfig = {
  minSyncFreq: 100,
  maxSyncFreq: 1000,
  syncDuration: 500,
};

export function syncConfigGetCycles(config: SyncConfig): number {
  return Math.floor(config.syncDuration / config.minSyncFreq);
}

export class Client<T extends RepoStorage<T>> {
  private readonly _timer: EaseInOutSineTimer;
  private readonly _repo: Repository<T>;
  private readonly _serverUrl: string;
  private readonly _syncConfig: SyncConfig;
  private _previousServerFilter: BloomFilter | undefined;
  private _previousServerSize: number;

  constructor(repo: Repository<T>, serverUrl: string, syncConfig: SyncConfig) {
    this._repo = repo;
    this._serverUrl = serverUrl;
    this._syncConfig = syncConfig;
    this._timer = new EaseInOutSineTimer(
      syncConfig.minSyncFreq,
      syncConfig.maxSyncFreq,
      syncConfig.maxSyncFreq * 3,
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
    this._previousServerSize = 0;
  }

  get repo(): Repository<T> {
    return this._repo;
  }

  get serverUrl(): string {
    return this.serverUrl;
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
    const repo = this.repo;
    const msg = SyncMessage.build(
      this._previousServerFilter,
      repo,
      this._previousServerSize,
      syncConfigGetCycles(this._syncConfig)
    ).toJS();
    try {
      console.log(
        `Starting sync with peer ${this._serverUrl}, ${this.repo.numberOfCommits} commits...`
      );
      const start = performance.now();
      const resp = await fetch(this._serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(msg),
      });
      const text = await resp.text();
      const json = JSON.parse(text);
      const syncResp = SyncMessage.fromJS(json);
      this._previousServerFilter = syncResp.filter;
      this._previousServerSize = syncResp.repoSize;
      if (syncResp.commits.length > 0) {
        for (const commit of syncResp.commits) {
          repo.persistCommit(commit);
        }
        this._timer.reset();
      }
      console.log(
        `Sync completed after ${performance.now() - start}ms with peer ${
          this._serverUrl
        }. ${this.repo.numberOfCommits} commits in repo.`
      );
    } catch (e) {
      debugger;
      console.error(
        `Sync error with peer ${this._serverUrl} (${this.repo.numberOfCommits} commits): ${e}`
      );
      throw e;
    }
  }

  async sync(): Promise<void> {
    const cycleCount = syncConfigGetCycles(this._syncConfig) + 1;
    // We need to do a minimum number of successful sync cycles in order to make
    // sure everything is sync'ed.
    for (let i = 0; i < cycleCount && !this.needsReplication(); ++i) {
      try {
        await this.sendSyncMessage();
      } catch (_e) {
        --i;
      }
    }
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
}
