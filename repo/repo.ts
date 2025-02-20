import { Emitter } from '../base/emitter.ts';
import { BloomFilter } from '../base/bloom.ts';
import {
  Session,
  sessionFromRecord,
  signCommit,
  TrustPool,
} from '../auth/session.ts';
import * as ArrayUtils from '../base/array.ts';
import { Dictionary } from '../base/collections/dict.ts';
import { filterIterable, mapIterable } from '../base/common.ts';
import { coreValueCompare, coreValueEquals } from '../base/core-types/index.ts';
import { assert } from '../base/error.ts';
import * as SetUtils from '../base/set.ts';
import { Edit } from '../cfds/base/edit.ts';
import { Code, ServerError, serviceUnavailable } from '../cfds/base/errors.ts';
import { concatChanges, DataChanges } from '../cfds/base/object.ts';
import { Record as CFDSRecord } from '../cfds/base/record.ts';
import { kRecordIdField, SchemeNamespace } from '../cfds/base/scheme-types.ts';
import { Scheme } from '../cfds/base/scheme.ts';
import { log } from '../logging/log.ts';
import {
  Commit,
  commitContentsIsDelta,
  commitContentsIsRecord,
  DeltaContents,
} from './commit.ts';
import { RepositoryIndex } from './index.ts';
import { repositoryForRecord } from './resolver.ts';
import {
  AdjacencyList,
  SimpleAdjacencyList,
} from '../cfds/client/graph/adj-list.ts';
import { RendezvousHash } from '../base/rendezvous-hash.ts';
import { kMinuteMs, kSecondMs } from '../base/date.ts';
import { randomInt } from '../base/math.ts';
import { JSONObject, ReadonlyJSONObject } from '../base/interfaces.ts';
import { downloadJSON } from '../base/browser.ts';
import { CoroutineScheduler } from '../base/coroutine.ts';
import { SchedulerPriority } from '../base/coroutine.ts';
import { CONNECTION_ID } from './commit.ts';
import { compareStrings } from '../base/string.ts';

const HEAD_CACHE_EXPIRATION_MS = 300;

type RepositoryEvent = 'NewCommit';

export const kRepositoryTypes = ['sys', 'data', 'user', 'events'] as const;
export type RepositoryType = (typeof kRepositoryTypes)[number];

export interface RepoStorage<T extends RepoStorage<T>> {
  numberOfCommits(): number;
  getCommit(id: string): Commit | undefined;
  allCommitsIds(): Iterable<string>;
  commitsForKey(key: string | null): Iterable<Commit>;
  allKeys(): Iterable<string>;
  persistCommits(c: Iterable<Commit>, repo: Repository<T>): Iterable<Commit>;
  close(): void;
}

export type Authorizer<ST extends RepoStorage<ST>> = (
  repo: Repository<ST>,
  commit: Commit,
  session: Session,
  write: boolean,
) => boolean;

interface CachedHead {
  commit: Commit;
  timestamp: number;
}

export type RepositoryIndexes<T extends RepoStorage<T>> = Record<
  string,
  RepositoryIndex<T>
>;

export interface CommitGraph {
  commit: Commit;
  children: CommitGraph[];
}

export class Repository<
  ST extends RepoStorage<ST>,
  IT extends RepositoryIndexes<ST> = RepositoryIndexes<ST>,
> extends Emitter<RepositoryEvent> {
  readonly storage: ST;
  readonly trustPool: TrustPool;
  readonly indexes?: IT;
  readonly authorizer?: Authorizer<ST>;
  readonly allowedNamespaces: SchemeNamespace[];
  private readonly _cachedHeadsByKey: Map<string | null, CachedHead>;
  private readonly _commitsCache: Map<string, Commit>;
  private readonly _nsForKey: Map<string | null, SchemeNamespace>;
  private readonly _cachedRecordForCommit: Map<string, CFDSRecord>;
  private readonly _cachedValueForKey: Map<string | null, CFDSRecord>;
  private readonly _adjList: AdjacencyList;
  private readonly _pendingMergePromises: Map<
    string | null,
    Promise<Commit | undefined>
  >;
  private readonly _cachedCommitsPerUser: Map<string | undefined, string[]>;
  private readonly _commitIsCorruptedResult: Map<string, boolean>;

  allowMerge = true;

  static namespacesForType(storage: RepositoryType): SchemeNamespace[] {
    switch (storage) {
      case 'sys':
        return [
          SchemeNamespace.WORKSPACE,
          SchemeNamespace.USERS,
          SchemeNamespace.SESSIONS,
        ];
      case 'data':
        return [SchemeNamespace.NOTES, SchemeNamespace.TAGS];
      case 'user':
        return [SchemeNamespace.USER_SETTINGS, SchemeNamespace.VIEWS];
      case 'events':
        return [SchemeNamespace.EVENTS];
    }
  }

  constructor(
    storage: ST,
    trustPool: TrustPool,
    allowedNamespaces: SchemeNamespace[],
    authorizer?: Authorizer<ST>,
    indexes?: (repo: Repository<ST, IT>) => IT,
    readonly priorityRepo = false,
  ) {
    super();
    this.storage = storage;
    this.trustPool = trustPool;
    this.allowedNamespaces = allowedNamespaces;
    this.authorizer = authorizer;
    this._cachedHeadsByKey = new Map();
    this._cachedValueForKey = new Map();
    this._commitsCache = new Map();
    this._nsForKey = new Map();
    this._cachedRecordForCommit = new Map();
    this._adjList = new SimpleAdjacencyList();
    if (indexes) {
      this.indexes = indexes(this);
    }
    this._pendingMergePromises = new Map();
    this._cachedCommitsPerUser = new Map();
    this._commitIsCorruptedResult = new Map();
  }

  static id(type: RepositoryType, id: string): string {
    return this.normalizeId(`${type}/${id}`);
  }

  static parseId(id: string): [type: RepositoryType, id: string] {
    while (id.startsWith('/')) {
      id = id.substring(1);
    }
    const comps = id.split('/');
    return [comps[0] as RepositoryType, comps[1]];
  }

  static normalizeId(id: string): string {
    if (!id.startsWith('/')) {
      id = '/' + id;
    }
    if (id.endsWith('/')) {
      id = id.substring(0, id.length - 1);
    }
    return id;
  }

  static readonly sysDirId = this.id('sys', 'dir');

  get orgId(): string {
    return this.trustPool.orgId;
  }

  numberOfCommits(session?: Session): number {
    const { authorizer } = this;
    if (
      session &&
      session.id !== this.trustPool.currentSession.id &&
      authorizer
    ) {
      let count = 0;
      for (const _ of this.commits(session)) {
        ++count;
      }
      return count;
    }
    return this.storage.numberOfCommits();
  }

  getCommit(id: string, session?: Session): Commit {
    let c = this._commitsCache.get(id);
    if (!c) {
      c = this.storage.getCommit(id);
      if (c) {
        this._commitsCache.set(id, c);
        // this._runUpdatesOnNewCommit(c);
      }
    }
    if (!c) {
      throw serviceUnavailable();
    }
    const { authorizer } = this;
    if (
      session &&
      session.id !== this.trustPool.currentSession.id &&
      authorizer
    ) {
      if (!authorizer(this, c, session, false)) {
        throw serviceUnavailable();
      }
    }
    return c;
  }

  hasCommit(id: string): boolean {
    return this.storage.getCommit(id) !== undefined;
  }

  *commits(session?: Session): Generator<Commit> {
    const { authorizer } = this;
    const checkAuth =
      session && session.id !== this.trustPool.currentSession.id && authorizer;
    let resultIds: Iterable<string>;
    if (!checkAuth) {
      resultIds = this.storage.allCommitsIds();
    } else {
      const uid = session.owner;
      let cachedCommits = this._cachedCommitsPerUser.get(uid);
      if (!cachedCommits) {
        cachedCommits = Array.from(
          filterIterable(this.storage.allCommitsIds(), (id) =>
            authorizer(this, this.getCommit(id), session, false),
          ),
        );
        this._cachedCommitsPerUser.set(uid, cachedCommits);
      }
      resultIds = cachedCommits;
    }
    for (const id of resultIds) {
      yield this.getCommit(id);
    }
  }

  *commitsForKey(key: string | null, session?: Session): Generator<Commit> {
    const { authorizer } = this;
    const commits = this.storage.commitsForKey(key);
    for (const c of commits) {
      // if (!this._commitsCache.has(c.id)) {
      //   this._runUpdatesOnNewCommit(c);
      // }
      if (
        !session ||
        session.id === this.trustPool.currentSession.id ||
        !authorizer ||
        authorizer(this, c, session, false)
      ) {
        yield c;
      }
    }
  }

  keyExists(key: string | null): boolean {
    for (const _c of this.storage.commitsForKey(key)) {
      return true;
    }
    return false;
  }

  /**
   * This method computes a quick diff between the given commit and all of its
   * parents. It determines which fields were changed in this commit, rather
   * than what the changes were.
   *
   * @param commit The commit to inspect.
   * @returns An array of fields changed in this commit or null if the full
   *          information isn't yet available for this commit due to partial
   *          commit graph.
   */
  changedFieldsInCommit(commit: Commit | string): string[] | null {
    if (typeof commit === 'string') {
      if (!this.hasCommit(commit)) {
        return null;
      }
      commit = this.getCommit(commit);
    }
    if (!this.hasRecordForCommit(commit)) {
      return null;
    }
    const finalRecord = this.recordForCommit(commit);
    const fields = new Set<string>();
    for (const p of commit.parents) {
      if (!this.hasRecordForCommit(p)) {
        return null;
      }
      const rec = this.recordForCommit(p);
      SetUtils.update(fields, rec.diffKeys(finalRecord, false));
    }
    return Array.from(fields);
  }

  /**
   * This method determines, to a high probability, whether the given commit is
   * a leaf commit or not, even when the full graph isn't available.
   *
   * It works by inspecting the bloom filters of the newest 2log[4](N) commits,
   * and checking for the presence of the candidate commit. If present in all
   * filters, the commit guaranteed not to be a leaf.
   *
   * @param candidate The commit to inspect.
   * @returns true if the commit is a leaf and can be safely included in a merge
   *          commit, false otherwise.
   */
  commitIsHighProbabilityLeaf(candidate: Commit | string): boolean {
    const id = typeof candidate === 'string' ? candidate : candidate.id;
    if (this._adjList.hasInEdges(id)) {
      return false;
    }
    if (typeof candidate === 'string') {
      if (!this.hasCommit(id)) {
        return false;
      }
      candidate = this.getCommit(id);
    }
    const commitsForKey = Array.from(this.commitsForKey(candidate.key)).sort(
      compareCommitsDesc,
    );
    const graphSize = Math.max(
      commitsForKey.length,
      commitsForKey[commitsForKey.length - 1].ancestorsCount,
    );
    // 2log[fpr](N) = K. Since FPR = 0.25, we're using 2log[4](N).
    const agreementSize = 2 * (Math.log2(graphSize) / Math.log2(4));
    if (commitsForKey.length < agreementSize) {
      // We must consider the newest commits as leaves, otherwise we'd deadlock
      // and not converge on all branches. These cases work out OK because the
      // merge will take the latest commit per connection thus skipping
      // temporary gaps in the graph.
      return true;
    }
    const dateCutoff = candidate.timestamp.getTime();
    for (let i = 0; i <= agreementSize; ++i) {
      const c = commitsForKey[i];
      if (c.timestamp.getTime() <= dateCutoff) {
        return c.session === this.trustPool.currentSession.id;
      }
      if (!c.ancestorsFilter.has(id)) {
        return (
          c.session === this.trustPool.currentSession.id ||
          !commitInGracePeriod(c)
        );
      }
    }
    return false;
  }

  leavesForKey(key: string | null, session?: Session): Commit[] {
    const adjList = this._adjList;
    const result: Commit[] = [];
    for (const c of this.commitsForKey(key, session)) {
      if (!adjList.hasInEdges(c.id) && this.hasRecordForCommit(c)) {
        result.push(c);
      }
    }
    return this.filterLatestCommitsByConnection(result);
  }

  keys(session?: Session): Iterable<string> {
    const { authorizer } = this;
    if (
      session &&
      session.id !== this.trustPool.currentSession.id &&
      authorizer
    ) {
      return filterIterable(this.storage.allKeys(), (key) =>
        authorizer(this, this.headForKey(key)!, session, false),
      );
    }
    return this.storage.allKeys();
  }

  /**
   * Given an iterable of commits, this method returns their Lowest Common
   * Ancestor or undefined if no such ancestor exists (meaning the commits
   * belong to disconnected histories).
   *
   * @param commits An iterable of commits.
   *
   * @returns A tuple of 3 values:
   *          1. The commits to include in the merge. Commits with broken
   *             ancestry path are skipped from the merge if a common base can't
   *             be found.
   *
   *          2. The base commit (LCA) to use for the merge, or undefined if
   *             one can't be found.
   *
   *          3. The scheme to use for the merge.
   */
  findMergeBase(
    commits: Commit[],
  ): [
    commits: Commit[],
    base: Commit | undefined,
    scheme: Scheme,
    reachedRoot: boolean,
  ] {
    let result: Commit | undefined;
    let scheme = Scheme.nullScheme();
    let reachedRoot = false;
    const includedCommits: Commit[] = [];
    for (const c of commits) {
      if (!result) {
        if (this.hasRecordForCommit(c)) {
          result = c;
          scheme = this.recordForCommit(c).scheme;
          includedCommits.push(c);
        }
        continue;
      }
      if (!this.hasRecordForCommit(c)) {
        continue;
      }
      let [newBase, foundRoot] = this._findLCAMergeBase(result, c);
      reachedRoot = reachedRoot || foundRoot;
      // if (!newBase) {
      //   [newBase, foundRoot] = this._findChronologicalMergeBase(result, c);
      //   reachedRoot = reachedRoot || foundRoot;
      // }
      if (!newBase) {
        continue;
      }
      result = newBase;
      includedCommits.push(c);
      const s = this.recordForCommit(c).scheme;
      assert(scheme.isNull || scheme.namespace === s.namespace); // Sanity check
      if (s.version > (scheme?.version || 0)) {
        scheme = s;
      }
    }
    // if (result && commits.includes(result)) {
    //   result = undefined;
    // }
    return [includedCommits, result, scheme, reachedRoot];
  }

  /**
   * Given two commits, this method finds the base from which to perform a 3 way
   * merge for c1 and c2. This is a simple iterative LCA implementation based on
   * the assumption of a DAG (if it's not, something is terribly broken).
   *
   * NOTE: This method ignores any broken branches and treats them as the end
   *       of the chain. This has a few effects:
   *
   *       1. A band actor can't bring the entire system to a freeze by not
   *          sending part of the graph.
   *
   *       2. The system is much more responsive by not waiting for the full
   *          graph to be available.
   *
   *       3. A slow party may have some of its edits reverted if not acting
   *          fast enough during concurrent editing.
   *
   * @param c1 First commit.
   * @param c2 Second commit.
   *
   * @returns The base for a 3-way merge between c1 and c2, or undefined if no
   *          such base can be found.
   */
  private _findLCAMergeBase(
    c1: Commit,
    c2: Commit,
  ): [Commit | undefined, boolean] {
    if (!c1.parents.length || !c2.parents.length) {
      return [undefined, true];
    }
    if (c1.key !== c2.key) {
      return [undefined, false];
    }
    if (c1.contentsChecksum === c2.contentsChecksum) {
      return [c1, false];
    }
    if (c1.parents.includes(c2.id)) {
      return [c2, false];
    }
    if (c2.parents.includes(c1.id)) {
      return [c1, false];
    }
    const parents1 = new Set<string>(c1.parents);
    const parents2 = new Set<string>(c2.parents);
    // parents1.add(c1.id);
    // parents2.add(c2.id);

    let reachedRoot = false;
    while (true) {
      const bases = SetUtils.intersection(parents1, parents2);
      if (bases.size > 0) {
        const prioritizedBases = Array.from(bases)
          .filter((id) => this.hasCommit(id))
          .map((id) => this.getCommit(id))
          .sort(compareCommitsDesc);
        for (const base of prioritizedBases) {
          if (this.hasRecordForCommit(base)) {
            return [base, reachedRoot];
          }
        }
      }
      let updated = false;
      for (const parentId of Array.from(parents1)) {
        if (this.hasCommit(parentId)) {
          const parent = this.getCommit(parentId);
          if (parent.parents.length == 0) {
            reachedRoot = true;
            continue;
          }
          for (const p of parent.parents) {
            if (!parents1.has(p)) {
              parents1.add(p);
              updated = true;
            }
          }
        }
      }
      for (const parentId of Array.from(parents2)) {
        if (this.hasCommit(parentId)) {
          const parent = this.getCommit(parentId);
          if (parent.parents.length == 0) {
            reachedRoot = true;
            continue;
          }
          for (const p of parent.parents) {
            if (!parents2.has(p)) {
              parents2.add(p);
              updated = true;
            }
          }
        }
      }
      if (!updated) {
        break;
      }
    }
    return [undefined, reachedRoot];
  }

  private _findChronologicalMergeBase(
    c1: Commit,
    c2: Commit,
  ): [base: Commit | undefined, reachedRoot: boolean] {
    if (commitInGracePeriod(c1)) {
      return [undefined, false];
    }
    if (commitInGracePeriod(c2)) {
      return [undefined, false];
    }
    const minTs = Math.min(c1.timestamp.getTime(), c2.timestamp.getTime());
    const base = this.findCommitBefore(c1.key, minTs, [c1.session, c2.session]);
    return [base, base === undefined];
  }

  private findCommitBefore(
    key: string | null,
    ts: number,
    sessions?: string | Iterable<string>,
  ): Commit | undefined {
    const commits = Array.from(this.commitsForKey(key)).sort(
      compareCommitsDesc,
    );
    if (!sessions) {
      sessions = [];
    } else if (typeof sessions === 'string') {
      sessions = [sessions];
    } else {
      sessions = Array.from(sessions);
    }
    for (const candidate of commits) {
      if (
        candidate.timestamp.getTime() < ts &&
        (sessions as string[]).includes(candidate.session) &&
        this.hasRecordForCommit(candidate)
      ) {
        return candidate;
      }
    }
    return undefined;
  }

  hasRecordForCommit(c: Commit | string): boolean {
    if (typeof c === 'string') {
      if (!this.hasCommit(c)) {
        return false;
      }
      c = this.getCommit(c);
    }
    if (commitContentsIsRecord(c.contents)) {
      return true;
    }
    return (
      this.hasRecordForCommit(c.contents.base) && !this.commitIsCorrupted(c)
    );
  }

  commitIsCorrupted(c: Commit): boolean {
    if (commitContentsIsRecord(c.contents)) {
      return false;
    }
    if (this._commitIsCorruptedResult.has(c.id)) {
      return this._commitIsCorruptedResult.get(c.id)!;
    }
    const contents: DeltaContents = c.contents as DeltaContents;
    // Assume everything is good if we don't have the base commit to check with
    if (!this.hasCommit(contents.base)) {
      this._commitIsCorruptedResult.set(c.id, false);
      return false;
    }
    const result = this.recordForCommit(contents.base).clone();
    if (result.checksum === contents.edit.srcChecksum) {
      result.patch(contents.edit.changes);
      if (result.checksum === contents.edit.dstChecksum) {
        this._commitIsCorruptedResult.set(c.id, false);
        return false;
      }
    }
    this._commitIsCorruptedResult.set(c.id, true);
    return true;
  }

  findNonCorruptedParentsFromCommits(parents: (Commit | string)[]): Commit[] {
    const parentsToCheck: Commit[] = [];
    for (const p of parents) {
      if (typeof p === 'string') {
        if (this.hasCommit(p)) {
          parentsToCheck.push(this.getCommit(p));
        }
      } else {
        parentsToCheck.push(p);
      }
    }
    const result: Commit[] = [];
    for (const p of parentsToCheck) {
      if (this.commitIsCorrupted(p) || !this.hasRecordForCommit(p)) {
        ArrayUtils.append(
          result,
          this.findNonCorruptedParentsFromCommits(p.parents),
        );
      } else {
        result.push(p);
      }
    }
    return result;
  }

  findLatestNonCorruptedCommitForKey(key: string | null): Commit | undefined {
    const commits = Array.from(this.commitsForKey(key)).sort(
      compareCommitsDesc,
    );
    for (const c of commits) {
      if (!this.commitIsCorrupted(c) && this.hasRecordForCommit(c)) {
        return c;
      }
    }
    return undefined;
  }

  static callCount = 0;

  recordForCommit(c: Commit | string, readonly?: boolean): CFDSRecord {
    try {
      if (++Repository.callCount === 10) {
        debugger;
      }
      let result = this._cachedRecordForCommit.get(
        typeof c === 'string' ? c : c.id,
      );
      if (!result) {
        if (typeof c === 'string') {
          c = this.getCommit(c);
        }
        if (commitContentsIsRecord(c.contents)) {
          result = c.contents.record;
        } else {
          const contents: DeltaContents = c.contents as DeltaContents;
          result = this.recordForCommit(contents.base).clone();
          let commitCorrupted = false;
          if (result.checksum === contents.edit.srcChecksum) {
            result.patch(contents.edit.changes);
            if (result.checksum !== contents.edit.dstChecksum) {
              commitCorrupted = true;
            }
          } else {
            commitCorrupted = true;
          }
          if (commitCorrupted) {
            // if (!readonly) {
            //   const goodCommitsToMerge =
            //     this.findNonCorruptedParentsFromCommits(c.parents);
            //   if (goodCommitsToMerge.length > 0) {
            //     // If any of the checksums didn't match, we create a new commit that
            //     // reverts the bad one we've just found. While discarding data, this
            //     // allows parties to continue their work without being stuck.
            //     this.createMergeCommit(
            //       goodCommitsToMerge,
            //       undefined,
            //       c.id,
            //       false,
            //     );
            //   }
            // }
            const lastGoodCommit = this.findLatestNonCorruptedCommitForKey(
              c.key,
            );
            // No good parents are available. This key is effectively null.
            result = lastGoodCommit
              ? this.recordForCommit(lastGoodCommit)
              : CFDSRecord.nullRecord();
          }
          // assert(result.checksum === contents.edit.srcChecksum);
          // result.patch(contents.edit.changes);
          // assert(result.checksum === contents.edit.dstChecksum);
        }
        this._cachedRecordForCommit.set(c.id, result);
      }
      return readonly ? result : result.clone();
    } finally {
      --Repository.callCount;
    }
  }

  private cacheHeadForKey(
    key: string | null,
    head: Commit | undefined,
  ): Commit | undefined {
    if (!head) {
      return undefined;
    }
    if (!this.hasRecordForCommit(head)) {
      return undefined;
      // const ancestors = this.findNonCorruptedParentsFromCommits(head.parents);
      // if (!ancestors || ancestors.length === 0) {
      //   head = this.findLatestNonCorruptedCommitForKey(head.key);
      // } else {
      //   ancestors.sort(compareCommitsDesc);
      //   head = ancestors[0];
      // }
    }
    if (head) {
      this._cachedHeadsByKey.set(key, {
        commit: head,
        timestamp: performance.now(),
      });
    }
    return head;
  }

  private pickBestCommitForCurrentClient(
    commits: Iterable<Commit>,
  ): Commit | undefined {
    commits = Array.from(commits).sort(compareCommitsDesc);
    for (const c of commits) {
      if (c.connectionId === CONNECTION_ID && this.hasRecordForCommit(c)) {
        return c;
      }
    }
    const sessionId = this.trustPool.currentSession.id;
    for (const c of commits) {
      if (c.session === sessionId && this.hasRecordForCommit(c)) {
        return c;
      }
    }
    for (const c of commits) {
      if (this.hasRecordForCommit(c)) {
        return c;
      }
    }
    // No good commits found
    return undefined;
  }

  /**
   * This method finds and returns the head for the given key. This is a
   * readonly operation and does not attempt to merge any leaves.
   *
   * @param key The key to search for.
   *
   * @returns The head commit, or undefined if no commit can be found for this
   *          key. Note that while this method may return undefined, some
   *          commits may still be present for this key. This happens when these
   *          commits are delta commits, and their base isn't present thus
   *          rendering them unreadable.
   */
  headForKey(key: string | null): Commit | undefined {
    const cacheEntry = this._cachedHeadsByKey.get(key);
    if (
      cacheEntry &&
      cacheEntry.commit.session === CONNECTION_ID &&
      performance.now() - cacheEntry.timestamp <= HEAD_CACHE_EXPIRATION_MS
    ) {
      return cacheEntry.commit;
    }
    const leaves = this.leavesForKey(key);
    if (leaves.length === 1 && this.hasRecordForCommit(leaves[0])) {
      return this.cacheHeadForKey(key, leaves[0]);
    }
    if (leaves.length > 1) {
      const head = this.pickBestCommitForCurrentClient(leaves);
      if (head) {
        return this.cacheHeadForKey(key, head);
      }
    }
    return this.cacheHeadForKey(
      key,
      this.pickBestCommitForCurrentClient(this.commitsForKey(key)),
    );
  }

  private createMergeCommit(
    commitsToMerge: Commit[],
    // parents?: string[],
    mergeLeader?: string,
    revert?: string,
    deltaCompress = true,
  ): Promise<Commit | undefined> {
    if (commitsToMerge.length <= 0 /*|| !this.allowMerge*/) {
      return Promise.resolve(undefined);
    }
    const key = commitsToMerge[0].key;
    let result = this._pendingMergePromises.get(key);
    if (!result) {
      result = this._createMergeCommitImpl(
        commitsToMerge,
        // parents,
        mergeLeader,
        revert,
        deltaCompress,
      );
      result.finally(() => {
        if (this._pendingMergePromises.get(key) === result) {
          this._pendingMergePromises.delete(key);
        }
      });
      this._pendingMergePromises.set(key, result);
    } else {
      // Disallow concurrent commits for any given key
      return Promise.resolve(undefined);
    }
    return result;
  }

  private filterLatestCommitsByConnection(commits: Iterable<Commit>): Commit[] {
    const connectionToCommit = new Map<string, Commit>();
    for (const c of commits) {
      const prev = connectionToCommit.get(c.connectionId);
      if (!prev || prev.timestamp < c.timestamp) {
        connectionToCommit.set(c.connectionId, c);
      }
    }
    return Array.from(connectionToCommit.values());
  }

  private createMergeRecord(
    commitsToMerge: Commit[],
  ): [CFDSRecord, Commit | undefined] {
    commitsToMerge = this.filterLatestCommitsByConnection(
      commitsToMerge,
    ).filter((c) => this.hasRecordForCommit(c));
    if (!commitsToMerge.length) {
      return [CFDSRecord.nullRecord(), undefined];
    }
    const session = this.trustPool.currentSession.id;
    const roots = commitsToMerge
      .filter((c) => c.parents.length === 0)
      .sort(compareCommitsAsc);
    commitsToMerge = commitsToMerge
      .filter((c) => c.parents.length > 0)
      .sort(compareCommitsAsc);
    // Find the base for our N-way merge
    let lca: Commit | undefined, scheme: Scheme, foundRoot: boolean;
    // When merging roots, we use the null record as the merge base
    if (roots.length > 0) {
      scheme = roots[0].scheme!;
      foundRoot = true;
    } else if (commitsToMerge.length === 1) {
      // Special case: a single chain of commits.
      scheme =
        this.recordForCommit(commitsToMerge[0]).scheme || Scheme.nullScheme();
      foundRoot = false;
    } else {
      [commitsToMerge, lca, scheme, foundRoot] =
        this.findMergeBase(commitsToMerge);
    }
    if (commitsToMerge.length === 0 && !foundRoot && roots.length === 0) {
      return [CFDSRecord.nullRecord(), undefined];
    }
    // If no LCA is found then we're dealing with concurrent writers who all
    // created of the same key unaware of each other.
    // Use the null record as a base in this case.
    const base = lca
      ? this.recordForCommit(lca).clone()
      : CFDSRecord.nullRecord();
    // Upgrade base to merge scheme
    if (!scheme.isNull) {
      base.upgradeScheme(scheme);
    }
    // Compute all changes to be applied in this merge
    let changes: DataChanges = {};
    // First, handle any new roots that may have appeared as leaves.
    // We transform them to diff format by computing a diff from null.
    // Note that we start with these changes in order to let later changes
    // override them as concurrent root creation is likely a temporary
    // error.
    const nullRecord = CFDSRecord.nullRecord();
    for (const c of roots) {
      const record = this.recordForCommit(c);
      if (record.isNull) {
        continue;
      }
      changes = concatChanges(
        changes,
        nullRecord.diff(record, c.session === session),
      );
    }
    // Second, compute a compound diff from our base to all unique records
    for (const c of commitsToMerge) {
      const record = this.recordForCommit(c);
      // Before computing the diff, upgrade the record to the scheme decided
      // for this merge.
      if (!scheme.isNull) {
        record.upgradeScheme(scheme);
      }
      changes = concatChanges(
        changes,
        base.diff(record, c.session === session),
      );
    }
    // Patch, and we're done.
    base.patch(changes);
    return [base, lca];
  }

  private ancestorsFilterForKey(key: string | null): [BloomFilter, number] {
    const adjList = this._adjList;
    const ancestors = new Set<string>();
    for (const commit of this.commitsForKey(key)) {
      if (adjList.hasInEdges(commit.id)) {
        ancestors.add(commit.id);
      }
    }
    const result = new BloomFilter({
      size: ancestors.size,
      fpr: 0.25,
    });
    for (const id of ancestors) {
      result.add(id);
    }
    return [result, ancestors.size];
  }

  private async _createMergeCommitImpl(
    commitsToMerge: Commit[],
    // parents?: string[],
    mergeLeader?: string,
    revert?: string,
    deltaCompress = true,
  ): Promise<Commit | undefined> {
    if (commitsToMerge.length <= 0 /*|| !this.allowMerge*/) {
      return undefined;
    }
    const key = commitsToMerge[0].key;
    const session = this.trustPool.currentSession.id;
    const [ancestorsFilter, ancestorsCount] = this.ancestorsFilterForKey(key);
    assert(ancestorsCount > 0, 'Merge commit got empty ancestors filter'); // Sanity check
    try {
      const [merge, base] = this.createMergeRecord(commitsToMerge);
      if (merge.isNull) {
        return undefined;
      }
      let mergeCommit = new Commit({
        session,
        key,
        contents: merge,
        parents: commitsToMerge.map((c) => c.id),
        ancestorsFilter,
        ancestorsCount,
        mergeBase: base?.id,
        mergeLeader,
        revert,
        orgId: this.orgId,
      });
      if (deltaCompress) {
        mergeCommit = this.deltaCompressIfNeeded(mergeCommit);
      }
      const signedCommit = await signCommit(
        this.trustPool.currentSession,
        mergeCommit,
      );
      this.persistVerifiedCommits([signedCommit]);
      return this.cacheHeadForKey(key, signedCommit);
    } catch (e) {
      if (!(e instanceof ServerError && e.code === Code.ServiceUnavailable)) {
        debugger;
        throw e; // Unknown error. Rethrow.
      }
    }
  }

  async mergeIfNeeded(key: string | null): Promise<Commit | undefined> {
    const leaves = this.leavesForKey(key);
    if (!leaves.length) {
      return undefined;
    }
    if (leaves.length === 1) {
      return undefined;
    }
    const sessionId = this.trustPool.currentSession.id;
    // In order to keep merges simple and reduce conflicts and races,
    // concurrent editors choose a soft leader amongst all currently active
    // writers. Non-leaders will back off and not perform any merge commits,
    // instead waiting for the leader(s) to merge.
    const mergeLeaderSession = mergeLeaderFromLeaves(leaves) || sessionId;
    if (
      leaves.length > 1 &&
      //this.allowMerge &&
      mergeLeaderSession === sessionId
    ) {
      // Filter out any commits with equal records
      const commitsToMerge = commitsWithUniqueRecords(
        leaves.filter((c) => this.commitIsHighProbabilityLeaf(c)),
      ).sort(coreValueCompare);
      if (commitsToMerge.length === 1) {
        return undefined;
      }
      const mergeCommit = await this.createMergeCommit(
        commitsToMerge,
        mergeLeaderSession,
      );
      if (mergeCommit) {
        return mergeCommit;
      }
    }
    return undefined;
  }

  valueForKey(key: string | null, readonly?: boolean): CFDSRecord {
    let result = this._cachedValueForKey.get(key);
    if (!result) {
      const head = this.headForKey(key);
      if (head) {
        result = this.recordForCommit(head, readonly);
      }
      if (!result) {
        result = CFDSRecord.nullRecord();
      }
      this._cachedValueForKey.set(key, result);
    }
    if (!readonly) {
      result = result.clone();
    }
    return result;
  }

  valueForKeyReadonlyUnsafe(key: string | null): CFDSRecord {
    return this.valueForKey(key, true);
  }

  /**
   * Updates the head record for a given key.
   *
   * @param key The key who's head to update.
   * @param value The value to write.
   *
   * @returns Whether or not a new commit had been generated. Regardless of the
   * returned value, future calls to `valueForKey` will return the updated
   * record.
   */
  async setValueForKey(
    key: string | null,
    value: CFDSRecord,
    parentCommit: string | Commit | undefined,
  ): Promise<Commit | undefined> {
    if (this._pendingMergePromises.has(key)) {
      // Refuse committing while a merge is in progress
      throw serviceUnavailable();
    }
    // All keys start with null records implicitly, so need need to persist
    // them. Also, we forbid downgrading a record back to null once initialized.
    if (value.isNull) {
      return undefined;
    }
    assert(this.allowedNamespaces.includes(value.scheme.namespace));
    if (this.valueForKey(key).isEqual(value)) {
      return undefined;
    }
    const session = this.trustPool.currentSession;
    if (typeof parentCommit === 'string') {
      if (!this.hasCommit(parentCommit)) {
        throw serviceUnavailable();
      }
      parentCommit = this.getCommit(parentCommit);
    }
    if (!parentCommit) {
      parentCommit = this.pickBestCommitForCurrentClient(
        this.commitsForKey(key),
      );
    }
    if (parentCommit) {
      const headRecord = this.recordForCommit(parentCommit);
      if (headRecord.isEqual(value)) {
        return undefined;
      }
    }
    const [ancestorsFilter, ancestorsCount] = this.ancestorsFilterForKey(key);
    let commit = new Commit({
      session: session.id,
      key,
      contents: value.clone(),
      parents: parentCommit?.id,
      ancestorsFilter,
      ancestorsCount,
      orgId: this.orgId,
    });
    commit = this.deltaCompressIfNeeded(commit);
    const signedCommit = await signCommit(session, commit);
    this._cachedHeadsByKey.delete(key);
    this.persistVerifiedCommits([signedCommit]);
    return (await this.mergeIfNeeded(key)) || signedCommit;
  }

  /**
   * Given a key and an edited record for this key, this method rebases the
   * changes from the record on top of the any changes made concurrently for
   * this key. Use it to merge remote changes with any local edits before
   * committing them.
   *
   * @param key The key to rebase.
   * @param record The locally edited record.
   * @param headId The commit from which the edited record was derived from.
   *
   * @returns A new record with local changes rebased on top of remote changes.
   *          This record can be used to safely update the UI, as well as update
   *          the repo value.
   */
  rebase(
    key: string,
    record: CFDSRecord,
    headId: string | Commit | undefined,
  ): [CFDSRecord, string | undefined] {
    const currentHead = this.headForKey(key);
    if (!currentHead || currentHead.id === headId) {
      return [record, headId instanceof Commit ? headId.id : undefined];
    }
    const baseRecord = headId
      ? this.recordForCommit(headId)
      : CFDSRecord.nullRecord();
    const headRecord = this.recordForCommit(currentHead);
    if (headRecord.isEqual(record)) {
      return [record, headId instanceof Commit ? headId.id : undefined];
    }
    if (!headRecord.isNull && !baseRecord.scheme.isEqual(headRecord.scheme)) {
      baseRecord.upgradeScheme(headRecord.scheme);
    }
    if (!record.isNull && !baseRecord.scheme.isEqual(record.scheme)) {
      baseRecord.upgradeScheme(record.scheme);
    }
    const changes = concatChanges(
      baseRecord.diff(headRecord, false),
      baseRecord.diff(record, true),
    );
    baseRecord.patch(changes);
    return [baseRecord, currentHead.id];
  }

  private deltaCompressIfNeeded(fullCommit: Commit): Commit {
    assert(commitContentsIsRecord(fullCommit.contents));
    if (
      // Periodically create a full commit to prevent all parties from being stuck
      // to a specific commit.
      randomInt(0, 20) === 0 ||
      // Sessions are too important to apply delta compression to, since they
      // bootstrap everything else.
      fullCommit.scheme?.namespace === SchemeNamespace.SESSIONS
    ) {
      return fullCommit;
    }
    const key = fullCommit.key;
    const lastRecordCommit = this.lastRecordCommitForKey(key);
    let deltaCommit: Commit | undefined;
    if (lastRecordCommit) {
      const baseRecord = this.recordForCommit(lastRecordCommit);
      const changes = baseRecord.diff(fullCommit.contents.record, false);
      const edit = new Edit({
        changes: changes,
        srcChecksum: baseRecord.checksum,
        dstChecksum: fullCommit.contentsChecksum,
      });
      const deltaLength = JSON.stringify(edit.toJS()).length;
      const fullLength = JSON.stringify(
        fullCommit.contents.record.toJS(),
      ).length;
      // Only if our delta format is small enough relative to the full format,
      // then it's worth switching to it
      if (deltaLength <= fullLength * 0.85) {
        deltaCommit = new Commit({
          id: fullCommit.id,
          session: fullCommit.session,
          key,
          contents: { base: lastRecordCommit.id, edit },
          parents: fullCommit.parents,
          ancestorsFilter: fullCommit.ancestorsFilter,
          ancestorsCount: fullCommit.ancestorsCount,
          mergeBase: fullCommit.mergeBase,
          mergeLeader: fullCommit.mergeLeader,
          revert: fullCommit.revert,
          orgId: this.orgId,
        });
        // log({
        //   severity: 'METRIC',
        //   name: 'DeltaFormatSavings',
        //   value: Math.round((100 * (fullLength - deltaLength)) / fullLength),
        //   unit: 'Percent',
        // });
      }
    }
    return deltaCommit || fullCommit;
  }

  private lastRecordCommitForKey(key: string | null): Commit | undefined {
    let result: Commit | undefined;
    for (const c of this.commitsForKey(key)) {
      if (!commitContentsIsRecord(c.contents)) {
        continue;
      }
      if (!result || c.timestamp.getTime() > result.timestamp.getTime()) {
        result = c;
      }
    }
    return result;
  }

  hasKey(key: string | null): boolean {
    return this.keyExists(key);
  }

  async verifyCommits(commits: Iterable<Commit>): Promise<Commit[]> {
    const authorizer = this.authorizer;
    commits = Array.from(commits).sort(
      (c1, c2) => c1.timestamp.getTime() - c2.timestamp.getTime(),
    );
    const result: Commit[] = [];
    for (const batch of ArrayUtils.slices(
      commits,
      navigator.hardwareConcurrency,
    )) {
      const promises: Promise<void>[] = [];
      for (const c of batch) {
        promises.push(
          (async () => {
            if (await this.trustPool.verify(c)) {
              if (authorizer) {
                const session = this.trustPool.getSession(c.session);
                if (!session) {
                  return;
                }
                if (authorizer(this, c, session, true)) {
                  result.push(c);
                } else {
                  debugger;
                  // authorizer(this, c, session, true);
                }
              } else {
                result.push(c);
              }
            } else {
              // debugger;
              // this.trustPool.verify(c);
            }
          })(),
        );
      }
      await Promise.allSettled(promises);
    }
    return result;
  }

  async persistCommits(commits: Iterable<Commit>): Promise<Commit[]> {
    const batchSize = 50;
    const result: Commit[] = [];
    let batch: Commit[] = [];
    commits = filterIterable(
      commits,
      (c) =>
        (c.scheme?.namespace === undefined ||
          this.allowedNamespaces.includes(c.scheme?.namespace)) &&
        !this._commitsCache.has(c.id),
    );
    for (const verifiedCommit of await this.verifyCommits(commits)) {
      batch.push(verifiedCommit);
      if (batch.length >= batchSize) {
        ArrayUtils.append(result, this.persistVerifiedCommits(batch));
        batch = [];
      }
    }
    if (batch.length > 0) {
      ArrayUtils.append(result, this.persistVerifiedCommits(batch));
    }
    return result;
  }

  namespaceForKey(key: string | null): SchemeNamespace {
    let result = this._nsForKey.get(key);
    if (result) {
      return result;
    }
    const commits = this.commitsForKey(key);
    for (const c of commits) {
      const scheme = c.scheme;
      if (scheme && !scheme.isNull) {
        result = scheme.namespace;
        break;
      }
    }
    if (result) {
      this._nsForKey.set(key, result);
    }
    return result || SchemeNamespace.Null;
  }

  persistVerifiedCommits(commits: Iterable<Commit>): Commit[] {
    const adjList = this._adjList;
    const result: Commit[] = [];
    const commitsAffectingTmpRecords: Commit[] = [];

    commits = filterIterable(
      commits,
      (c) => c.orgId === undefined || c.orgId === this.orgId,
    );
    for (const batch of ArrayUtils.slices(commits, 50)) {
      // for (const c of batch) {
      //   assert(
      //     !c.orgId || c.orgId === this.orgId,
      //     `Incompatible organization id. Trying to persist commit from "${c.orgId}" to "${this.orgId}"`,
      //   );
      // }
      ArrayUtils.append(result, this._persistCommitsBatchToStorage(batch));
      for (const c of batch) {
        for (const p of c.parents) {
          adjList.addEdge(c.id, p, 'parent');
        }
        // Invalidate temporary merge values on every commit change
        if (!this._cachedHeadsByKey.has(c.key)) {
          this._cachedValueForKey.delete(c.key);
          commitsAffectingTmpRecords.push(c);
        }
      }
    }
    this._cachedCommitsPerUser.clear();

    const leaves = result.filter((c) => this.commitIsHighProbabilityLeaf(c));
    for (const c of leaves) {
      this._cachedHeadsByKey.delete(c.key);
    }
    for (const c of SetUtils.unionIter(
      commitsAffectingTmpRecords,
      result.filter((c) => this.commitIsHighProbabilityLeaf(c)),
    )) {
      this._runUpdatesOnNewLeafCommit(c);
    }
    // Notify everyone else
    if (this.priorityRepo || typeof Deno !== 'undefined') {
      // Do it synchronously in the server
      for (const c of result) {
        this.emit('NewCommit', c);
      }
    } else {
      // And asynchronously in the client
      CoroutineScheduler.sharedScheduler().forEach(
        result,
        (c) => this.emit('NewCommit', c),
        SchedulerPriority.Background,
      );
    }
    return result;
  }

  private _runUpdatesOnNewLeafCommit(commit: Commit): void {
    this._commitsCache.set(commit.id, commit);
    // Auto add newly discovered sessions to our trust pool
    // try {
    if (this.namespaceForKey(commit.key) === SchemeNamespace.SESSIONS) {
      this._cachedHeadsByKey.delete(commit.key);
      const headRecord = this.valueForKey(commit.key, undefined);
      if (headRecord.scheme.namespace === SchemeNamespace.SESSIONS) {
        sessionFromRecord(headRecord).then((session) => {
          this.trustPool.addSession(session, commit);
        });
      }
    }
    // } catch (e: unknown) {
    //   // Rethrow any error not caused by a missing commit graph
    //   if (!(e instanceof ServerError && e.code === Code.ServiceUnavailable)) {
    //     throw e;
    //   }
    // }
  }

  private _persistCommitsBatchToStorage(batch: Iterable<Commit>): Commit[] {
    const storage = this.storage;
    const result: Commit[] = [];
    for (const persistedCommit of storage.persistCommits(batch, this)) {
      this._cachedHeadsByKey.delete(persistedCommit.key);
      result.push(persistedCommit);
    }
    return result;
  }

  repositoryIdForCommit(c: Commit | string): string {
    if (typeof c === 'string') {
      c = this.getCommit(c);
    }
    const record = this.recordForCommit(c);
    const repoFieldName = repositoryForRecord(
      c.key,
      record,
      this.trustPool.currentSession.owner,
    );
    if (repoFieldName === kRecordIdField) {
      const commit = typeof c === 'string' ? this.getCommit(c) : c;
      assert(commit !== undefined && commit.key !== undefined);
      return commit.key!;
    }
    const result = record.get<string>(repoFieldName);
    assert(result?.length > 0);
    return result;
  }

  graphForKey(key: string | null): CommitGraph[] {
    const commits = Array.from(this.commitsForKey(key));
    const roots = commits.filter((c) => !c.parents || !c.parents.length);
    const result: CommitGraph[] = [];
    for (const r of roots) {
      result.push(this.subGraphForCommit(r.id));
    }
    return result;
  }
  private subGraphForCommit(id: string): CommitGraph {
    const adjList = this._adjList;
    const root = this.getCommit(id);
    const graph: CommitGraph = {
      commit: root,
      children: [],
    };
    for (const { vertex } of adjList.inEdges(root.id)) {
      graph.children.push(this.subGraphForCommit(vertex));
    }
    return graph;
  }

  debugNetworkForKey(key: string | null): ReadonlyJSONObject {
    const nodes: JSONObject[] = [];
    const edges: JSONObject[] = [];
    const knownCommits = new Set<string>();
    const localCommits = new Set<string>();
    for (const commit of this.commitsForKey(key)) {
      localCommits.add(commit.id);
      knownCommits.add(commit.id);
      nodes.push({
        data: {
          id: commit.id,
          name: `${commit.connectionId}-${commit.timestamp.toLocaleString()}`,
          session: commit.session,
          connectionId: commit.connectionId,
          ts: commit.timestamp.getTime(),
          mergeBase: commit.mergeBase || null,
          mergeLeader: commit.mergeLeader || null,
          checksum: commit.contentsChecksum,
          revert: commit.revert,
        },
      });
      for (const p of commit.parents) {
        knownCommits.add(p);
        edges.push({
          data: {
            id: `${commit.id}-${p}`,
            source: commit.id,
            target: p,
          },
        });
      }
    }
    for (const id of knownCommits) {
      if (!localCommits.has(id)) {
        nodes.push({
          data: {
            id,
            name: `Missing-${id}`,
            session: 'Missing',
          },
        });
      }
    }

    return {
      elements: {
        nodes,
        edges,
      },
    };
  }

  downloadDebugNetworkForKey(key: string | null): void {
    downloadJSON(
      `${key}-${new Date().toISOString()}.json`,
      this.debugNetworkForKey(key),
    );
  }

  revertAllKeysToBefore(ts: number): void {
    for (const key of this.keys()) {
      const commits = Array.from(this.commitsForKey(key)).sort(
        compareCommitsDesc,
      );
      for (let i = 0; i < commits.length; ++i) {
        const c = commits[i];
        if (c.timestamp.getTime() <= ts) {
          if (i === 0) {
            break;
          }
          if (this.hasRecordForCommit(c)) {
            console.log(`Reverting ${key} to ${c.timestamp.toLocaleString()}`);
            this.setValueForKey(key, this.recordForCommit(c), undefined);
            break;
          }
        }
      }
    }
  }

  findLatestAncestorFromCommit(
    commit: Commit | string,
    filter: (c: Commit) => boolean,
  ): Commit | undefined {
    if (typeof commit === 'string') {
      if (!this.hasCommit(commit)) {
        return undefined;
      }
      commit = this.getCommit(commit);
    }
    for (const c of Array.from(this.commitsForKey(commit.key)).sort(
      compareCommitsDesc,
    )) {
      if (
        this.hasRecordForCommit(c) &&
        c.timestamp.getTime() < commit.timestamp.getTime() &&
        filter(c)
      ) {
        return c;
      }
    }
    // let parentsToCheck: Set<string> = new Set(commit.parents);
    // while (parentsToCheck.size > 0) {
    //   let latestParent: undefined | Commit;
    //   const parents = parentsToCheck;
    //   parentsToCheck = new Set();
    //   for (const id of parents) {
    //     if (this.hasCommit(id)) {
    //       const c = this.getCommit(id);
    //       if (
    //         (!latestParent ||
    //           c.timestamp.getTime() > latestParent.timestamp.getTime()) &&
    //         filter(c)
    //       ) {
    //         latestParent = c;
    //       } else {
    //         SetUtils.update(parentsToCheck, c.parents);
    //       }
    //     }
    //   }
    //   if (latestParent !== undefined) {
    //     return latestParent;
    //   }
    // }
    return undefined;
  }

  revertHeadsByConnectionId(connectionIds: string | string[]): void {
    if (!(connectionIds instanceof Array)) {
      connectionIds = [connectionIds];
    }
    for (const key of this.keys()) {
      const head = this.headForKey(key);
      if (head && connectionIds.includes(head.connectionId)) {
        const parent = this.findLatestAncestorFromCommit(
          head,
          (c) => !connectionIds.includes(c.connectionId),
        );
        if (parent && this.hasRecordForCommit(parent)) {
          console.log(
            `Reverting ${key} to ${parent.timestamp.toLocaleString()}`,
          );
          this.setValueForKey(key, this.recordForCommit(parent), undefined);
        }
      }
    }
  }
}

function commitsWithUniqueRecords(commits: Iterable<Commit>): Commit[] {
  const result: Commit[] = [];
  for (const c of commits) {
    const checksum = c.contentsChecksum;
    let found = false;
    for (let i = 0; i < result.length; ++i) {
      const r = result[i];
      if (r.contentsChecksum === checksum) {
        if (c.timestamp > r.timestamp || c.connectionId === CONNECTION_ID) {
          result[i] = c;
          found = true;
          break;
        }
      }
    }
    if (!found) {
      result.push(c);
    }
  }
  return result;
}

function compareCommitsDesc(c1: Commit, c2: Commit): number {
  return compareCommitsAsc(c1, c2) * -1;
}

function compareCommitsAsc(c1: Commit, c2: Commit): number {
  // Use the commit id as a consistent tie breaker when timestamps are equal
  const dt = c1.timestamp.getTime() - c2.timestamp.getTime();
  return dt === 0 ? compareStrings(c1.id, c2.id) : dt;
}

function mergeLeaderFromLeaves(leaves: Commit[]): string | undefined {
  const hash = new RendezvousHash<string>();
  const now = Date.now();
  for (const c of leaves) {
    if (Math.abs(now - c.timestamp.getTime()) <= 5 * kSecondMs) {
      hash.addPeer(c.session);
    }
  }
  return hash.peerForKey(leaves[0].key);
}

export class MemRepoStorage implements RepoStorage<MemRepoStorage> {
  // Key -> Commit Id -> Commit
  private readonly _commitsByRecordKey: Dictionary<string | null, Set<string>>;
  private readonly _commitsById: Map<string, Commit>;

  constructor(commits?: Iterable<Commit>) {
    this._commitsByRecordKey = new Map();
    this._commitsById = new Map();
    if (commits) {
      for (const c of commits) {
        let keyMap = this._commitsByRecordKey.get(c.key);
        if (!keyMap) {
          keyMap = new Set();
          this._commitsByRecordKey.set(c.key, keyMap);
        }
        keyMap.add(c.id);
        this._commitsById.set(c.id, c);
      }
    }
  }

  numberOfCommits(): number {
    return this._commitsById.size;
  }

  getCommit(id: string): Commit | undefined {
    return this._commitsById.get(id);
  }

  allCommitsIds(): Iterable<string> {
    return this._commitsById.keys();
  }

  commitsForKey(key: string): Iterable<Commit> {
    const keyMap = this._commitsByRecordKey.get(key);
    if (!keyMap) {
      return [];
    }
    return SetUtils.mapToArray(keyMap, (id) => this.getCommit(id));
  }

  *allKeys(): Generator<string> {
    for (const k of this._commitsByRecordKey.keys()) {
      if (typeof k === 'string') {
        yield k;
      }
    }
  }

  *persistCommits(commits: Iterable<Commit>): Generator<Commit> {
    for (const c of commits) {
      const localCommit = this._commitsById.get(c.id);
      if (localCommit !== undefined) {
        // Sanity check: Both copies of the same commit must be equal.
        // TODO: Rather than crash, assume the other side may be malicious
        assert(coreValueEquals(c, localCommit));
        continue;
      }
      this._commitsById.set(c.id, c);
      let set = this._commitsByRecordKey.get(c.key);
      if (!set) {
        set = new Set();
        this._commitsByRecordKey.set(c.key, set);
      }
      set.add(c.id);
      yield c;
    }
  }

  close(): void {}
}

function pickLatestCommitBySession(commits: Commit[]): Commit[] {
  const commitBySession = new Map<string, Commit>();
  for (const c of commits) {
    const existing = commitBySession.get(c.session);
    if (!existing || existing.timestamp.getTime() < c.timestamp.getTime()) {
      commitBySession.set(c.session, c);
    }
  }
  return Array.from(commitBySession.values());
}

const gFirstSeenCommit = new Map<string, number>();
function commitInGracePeriod(c: Commit): boolean {
  let firstSeen = gFirstSeenCommit.get(c.id);
  if (!firstSeen) {
    firstSeen = Date.now();
    gFirstSeenCommit.set(c.id, firstSeen);
  }
  return Date.now() - firstSeen > 3 * kSecondMs;
}
