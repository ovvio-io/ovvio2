import { Repository, RepositoryType, RepoStorage } from '../repo/repo.ts';
import { SyncMessage } from './message.ts';
import { BaseClient } from './base-client.ts';
import { Commit } from '../repo/commit.ts';
import { mapIterable } from '../base/common.ts';
import { SyncConfig, SyncScheduler } from './sync-scheduler.ts';

const COMMIT_SUBMIT_RETRY = 10;

export class RepoClient<T extends RepoStorage<T>> extends BaseClient<Commit> {
  private readonly _repo: Repository<T>;
  private readonly _submitCount: Map<string, number>;

  constructor(
    repo: Repository<T>,
    storage: RepositoryType,
    id: string,
    syncConfig: SyncConfig,
    scheduler: SyncScheduler,
    readonly orgId: string,
  ) {
    super(storage, id, syncConfig, scheduler);
    this._repo = repo;
    this._submitCount = new Map();
  }

  get repo(): Repository<T> {
    return this._repo;
  }

  protected getLocalSize(): number {
    return this._repo.numberOfCommits(this.repo.trustPool.currentSession);
  }

  protected async buildSyncMessage(
    includeMissing: boolean,
  ): Promise<SyncMessage<Commit>> {
    const repo = this.repo;
    const session = repo.trustPool.currentSession;
    return SyncMessage.build(
      this.previousServerFilter,
      this.valuesForMessage(),
      repo.numberOfCommits(session),
      this.previousServerSize,
      this.syncCycles,
      this.orgId,
      includeMissing,
      this.storage === 'events',
    );
  }

  private *valuesForMessage(): Generator<[string, Commit]> {
    const repo = this.repo;
    const counts = this._submitCount;
    const session = repo.trustPool.currentSession;
    for (const c of repo.commits(session)) {
      if ((counts.get(c.id) || 0) < COMMIT_SUBMIT_RETRY) {
        yield [c.id, c];
      }
    }
  }

  protected afterMessageSent(msg: SyncMessage<Commit>): void {
    const counts = this._submitCount;
    for (const commit of msg.values) {
      const id = commit.id;
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }

  *localIds(): Generator<string> {
    const counts = this._submitCount;
    const repo = this.repo;
    const session = repo.trustPool.currentSession;
    for (const c of repo.commits(session)) {
      if ((counts.get(c.id) || 0) < COMMIT_SUBMIT_RETRY) {
        yield c.id;
      }
    }
  }

  protected async persistPeerValues(values: Commit[]): Promise<number> {
    return (await this.repo.persistVerifiedCommits(values)).length;
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
