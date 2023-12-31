import { Repository, RepositoryType, RepoStorage } from '../repo/repo.ts';
import { SyncMessage } from './message.ts';
import { BaseClient } from './base-client.ts';
import { Commit } from '../repo/commit.ts';
import { mapIterable } from '../base/common.ts';
import { generateRequestSignature } from '../auth/session.ts';
import { SyncConfig, SyncScheduler } from './sync-scheduler.ts';

export class RepoClient<T extends RepoStorage<T>> extends BaseClient<Commit> {
  private readonly _repo: Repository<T>;

  constructor(
    repo: Repository<T>,
    storage: RepositoryType,
    id: string,
    syncConfig: SyncConfig,
    scheduler: SyncScheduler,
  ) {
    super(storage, id, syncConfig, scheduler);
    this._repo = repo;
    this.ready = true;
  }

  get repo(): Repository<T> {
    return this._repo;
  }

  protected getLocalSize(): number {
    return this._repo.numberOfCommits(this.repo.trustPool.currentSession);
  }

  protected async buildSyncMessage(): Promise<SyncMessage<Commit>> {
    const repo = this.repo;
    const session = repo.trustPool.currentSession;
    return SyncMessage.build(
      this.previousServerFilter,
      mapIterable(repo.commits(session), (c) => [c.id, c]),
      repo.numberOfCommits(session),
      this.previousServerSize,
      this.syncCycles,
    );
  }

  *localIds(): Generator<string> {
    for (const c of this.repo.commits()) {
      yield c.id;
    }
  }

  protected async persistPeerValues(values: Commit[]): Promise<number> {
    return (await this.repo.persistCommits(values)).length;
  }

  async sync(): Promise<void> {
    const allowMerge = this.repo.allowMerge;
    this.repo.allowMerge = false;
    try {
      await super.sync();
    } finally {
      this.repo.allowMerge = allowMerge;
    }
  }
}
