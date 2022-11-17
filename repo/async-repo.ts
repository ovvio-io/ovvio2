import EventEmitter from 'https://esm.sh/eventemitter3@4.0.7';
import { Dictionary } from '../base/collections/dict.ts';
import { Record } from '../cfds/base/record.ts';
import { Commit } from './commit.ts';
import { MemRepoStorage, Repository, RepoStorage } from './repo.ts';
import * as SetUtils from '../base/set.ts';
import * as ArrayUtils from '../base/array.ts';

export type CommitDiscoveryHandler = (c: Commit[]) => void;

export interface AsyncRepoStorage<T extends AsyncRepoStorage<T>> {
  registerDiscoveryHandler(handler: CommitDiscoveryHandler): () => void;
  getNumberOfCommits(): Promise<number>;
  getCommit(id: string): Promise<Commit | undefined>;
  allCommits(): AsyncIterable<Commit>;
  commitsForKey(key: string | null): AsyncIterable<Commit>;
  allKeys(): AsyncIterable<string>;
  persistCommits(c: Iterable<Commit>): Promise<Iterable<Commit>>;
  close(): Promise<void>;
}

export const EVENT_KEYS_CHANGED = 'keys_changed';

export class AsyncRepository<
  ST extends AsyncRepoStorage<ST>
> extends EventEmitter {
  private _repo: Repository<MemRepoStorage>;
  private _storage: ST;
  private _session: string;
  private _closeDiscoveryHandler: undefined | (() => void);
  // key -> session -> commit id
  private _cachedHeads: Dictionary<string | null, string | undefined>;

  constructor(storage: ST, session: string) {
    super();
    this._repo = new Repository(new MemRepoStorage(undefined, 10000));
    this._storage = storage;
    this._session = session;
    this._closeDiscoveryHandler = storage.registerDiscoveryHandler(
      (commits) => {
        this.onCommitsDiscovered(commits);
      }
    );
    this._cachedHeads = new Map();
  }

  get storage(): ST {
    return this.storage;
  }

  get session(): string {
    return this._session;
  }

  get numberOfCommits(): number {
    return this._repo.numberOfCommits;
  }

  keys(): Iterable<string> {
    return this._repo.keys();
  }

  close(): void {
    if (this._closeDiscoveryHandler) {
      this._closeDiscoveryHandler();
      this._closeDiscoveryHandler = undefined;
    }
  }

  headForKey(key: string | null, pendingCommit?: Commit): Commit | undefined {
    const head = this._repo.headForKey(key, this.session, pendingCommit);
    this._cachedHeads.set(key, head?.id);
    return head;
  }

  setValueForKey(key: string | null, value: Record): boolean {
    if (this._repo.setValueForKey(key, this.session, value)) {
      if (this._cachedHeads.delete(key)) {
        this.emit(EVENT_KEYS_CHANGED, [key]);
      }
      return true;
    }
    return false;
  }

  hasKey(key: string | null): boolean {
    return this._repo.hasKey(key);
  }

  async persistCommits(commits: Iterable<Commit>): Promise<Commit[]> {
    const persistedCommits = Array.from(
      await this.storage.persistCommits(commits)
    );
    this._repo.storage.persistCommits(persistedCommits);
    this.onCommitsDiscovered(persistedCommits);
    return persistedCommits;
  }

  private onCommitsDiscovered(commits: Iterable<Commit>): void {
    const cachedHeads = this._cachedHeads;
    const changedKeys = new Set<string | null>();
    for (const c of commits) {
      const key = c.key;
      if (cachedHeads.delete(key)) {
        changedKeys.add(key);
      }
    }
    if (changedKeys.size > 0) {
      this.emit(EVENT_KEYS_CHANGED, Array.from(changedKeys));
    }
  }

  async loadAllCommits(): Promise<void> {
    const persistedCommits: Commit[] = [];
    const repo = this._repo;
    const memStorage = repo.storage;
    for await (const c of this.storage.allCommits()) {
      ArrayUtils.append(persistedCommits, memStorage.persistCommits([c]));
    }
    if (persistedCommits.length > 0) {
      this.onCommitsDiscovered(persistedCommits);
    }
  }
}
