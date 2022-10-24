import { Repository } from '../cfds/base/repo.ts';
import { EaseInOutSineTimer } from '../base/timer.ts';
import { BloomFilter } from '../base/bloom.ts';
import { SyncMessage } from './types.ts';

export class Client {
  private readonly _timer: EaseInOutSineTimer;
  private readonly _repo: Repository;
  private readonly _serverUrl: string;
  private _previousServerFilter: BloomFilter | undefined;

  constructor(repo: Repository, serverUrl: string) {
    this._repo = repo;
    this._serverUrl = serverUrl;
    this._timer = new EaseInOutSineTimer(
      300,
      3000,
      10000,
      () => {
        this.sendSyncMessage();
      },
      true,
      'Sync timer'
    );
  }

  get repo(): Repository {
    return this._repo;
  }

  get serverUrl(): string {
    return this.serverUrl;
  }

  startSyncing(): Client {
    this._timer.schedule();
    return this;
  }

  stopSyncing(): Client {
    this._timer.unschedule();
    this._timer.reset();
    return this;
  }

  private async sendSyncMessage(): Promise<void> {
    const repo = this.repo;
    const msg = SyncMessage.build(this._previousServerFilter, repo).toJS();
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
    }
  }

  async sync(): Promise<void> {
    do {
      await this.sendSyncMessage();
    } while (this.needsReplication());
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
