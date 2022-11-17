import { Repository, RepoStorage } from '../repo/repo.ts';
import { SyncMessage, CommitsSyncMessage } from './types.ts';
import { BaseClient, OnlineStatusHandler, SyncConfig } from './base-client.ts';
import { Commit } from '../repo/commit.ts';
import { mapIterable } from '../base/common.ts';

export class RepoClient<T extends RepoStorage<T>> extends BaseClient<Commit> {
  private readonly _repo: Repository<T>;

  constructor(
    repo: Repository<T>,
    serverUrl: string,
    syncConfig: SyncConfig,
    onlineHandler?: OnlineStatusHandler
  ) {
    super(serverUrl, syncConfig, onlineHandler);
    this._repo = repo;
  }

  get repo(): Repository<T> {
    return this._repo;
  }

  protected buildSyncMessage(): SyncMessage<Commit> {
    const repo = this.repo;
    return CommitsSyncMessage.build(
      this.previousServerFilter,
      mapIterable(repo.commits(), (c) => [c.id, c]),
      repo.numberOfCommits,
      this.previousServerSize,
      this.syncCycles
    );
  }

  *localIds(): Generator<string> {
    for (const c of this.repo.commits()) {
      yield c.id;
    }
  }

  protected persistPeerValues(values: Commit[]): number {
    return this.repo.persistCommits(values).length;
  }
}
