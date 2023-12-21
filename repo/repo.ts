import { Emitter } from '../base/emitter.ts';
import {
  Session,
  sessionFromRecord,
  signCommit,
  TrustPool,
} from '../auth/session.ts';
import * as ArrayUtils from '../base/array.ts';
import { Dictionary } from '../base/collections/dict.ts';
import { filterIterable } from '../base/common.ts';
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

const HEAD_CACHE_EXPIRATION_MS = 1000;

type RepositoryEvent = 'NewCommit';

export const kRepositoryTypes = ['sys', 'data', 'user'] as const;
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

export class Repository<
  ST extends RepoStorage<ST>,
  IT extends RepositoryIndexes<ST> = RepositoryIndexes<ST>,
> extends Emitter<RepositoryEvent> {
  readonly storage: ST;
  readonly trustPool: TrustPool;
  readonly indexes?: IT;
  readonly authorizer?: Authorizer<ST>;
  private readonly _cachedHeadsByKey: Map<string | null, CachedHead>;
  private readonly _commitsCache: Map<string, Commit>;
  private readonly _nsForKey: Map<string | null, SchemeNamespace>;
  private readonly _cachedRecordForCommit: Map<string, CFDSRecord>;
  private readonly _adjList: AdjacencyList;

  allowMerge = true;

  constructor(
    storage: ST,
    trustPool: TrustPool,
    authorizer?: Authorizer<ST>,
    indexes?: (repo: Repository<ST, IT>) => IT,
  ) {
    super();
    this.storage = storage;
    this.trustPool = trustPool;
    this.authorizer = authorizer;
    this._cachedHeadsByKey = new Map();
    this._commitsCache = new Map();
    this._nsForKey = new Map();
    this._cachedRecordForCommit = new Map();
    this._adjList = new SimpleAdjacencyList();
    if (indexes) {
      this.indexes = indexes(this);
    }
  }

  static id(type: RepositoryType, id: string): string {
    return `${type}/${id}`;
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
        return count;
      }
    }
    return this.storage.numberOfCommits();
  }

  getCommit(id: string, session?: Session): Commit {
    let c = this._commitsCache.get(id);
    if (!c) {
      c = this.storage.getCommit(id);
      if (c) {
        this._commitsCache.set(id, c);
        this._runUpdatesOnNewCommit(c);
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
    const checkAuth = session &&
      session.id !== this.trustPool.currentSession.id && authorizer;
    for (const id of this.storage.allCommitsIds()) {
      const commit = this.getCommit(id);
      if (!checkAuth || authorizer(this, this.getCommit(id), session, false)) {
        yield commit;
      }
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

  leavesForKey(
    key: string | null,
    session?: Session,
    pendingCommit?: Commit,
  ): Commit[] {
    const adjList = this._adjList;
    const result: Commit[] = [];
    for (const c of this.commitsForKey(key, session)) {
      if (!adjList.hasInEdges(c.id)) {
        result.push(c);
      }
    }
    if (pendingCommit && !adjList.hasInEdges(pendingCommit.id)) {
      result.push(pendingCommit);
    }
    return result;
    // for (const c of this.commitsForKey(key, session)) {
    // const childrenPerCommit = new Map<string, Set<Commit>>();
    //   this._setChildrenPerCommit(c, childrenPerCommit);
    // }
    // if (pendingCommit) {
    //   assert(pendingCommit.key === key); // Sanity check
    //   this._setChildrenPerCommit(pendingCommit, childrenPerCommit);
    // }
    // const result: Commit[] = [];
    // for (const c of this.commitsForKey(key)) {
    //   if (!childrenPerCommit.has(c.id)) {
    //     result.push(c);
    //   }
    // }
    // return result;
  }

  private _setChildrenPerCommit(
    c: Commit,
    childrenPerCommit: Map<string, Set<Commit>>,
  ): void {
    for (const p of c.parents) {
      let children = childrenPerCommit.get(p);
      if (!children) {
        children = new Set();
        childrenPerCommit.set(p, children);
      }
      children.add(c);
    }
  }

  keys(session?: Session): Iterable<string> {
    const { authorizer } = this;
    if (
      session &&
      session.id !== this.trustPool.currentSession.id &&
      authorizer
    ) {
      return filterIterable(
        this.storage.allKeys(),
        (key) =>
          authorizer(this, this.headForKey(key, session.id)!, session, false),
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
    commits: Iterable<Commit>,
  ): [commits: Commit[], base: Commit | undefined, scheme: Scheme] {
    let result: Commit | undefined;
    let scheme = Scheme.nullScheme();
    const includedCommits: Commit[] = [];
    for (const c of commits) {
      if (!result) {
        result = c;
        scheme = this.recordForCommit(c).scheme;
        continue;
      }
      const newBase = this._findMergeBase(result, c);
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
    return [includedCommits, result, scheme];
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
  private _findMergeBase(
    c1: Commit,
    c2: Commit,
  ): Commit | undefined {
    if (!c1.parents.length || !c2.parents.length || c1.key !== c2.key) {
      return undefined;
    }
    if (c1.contentsChecksum === c2.contentsChecksum) {
      return c1;
    }
    if (c1.parents.includes(c2.id)) {
      return c2;
    }
    if (c2.parents.includes(c1.id)) {
      return c1;
    }
    let parents1 = new Set<string>(c1.parents);
    let parents2 = new Set<string>(c2.parents);
    parents1.add(c1.id);
    parents2.add(c2.id);
    const c1Ancestors = new Set<string>(parents1);
    const c2Ancestors = new Set<string>(parents2);

    while (parents1.size > 0 || parents2.size > 0) {
      SetUtils.update(
        c1Ancestors,
        SetUtils.filter(parents1, (id) => this.hasCommit(id)),
      );
      SetUtils.update(
        c2Ancestors,
        SetUtils.filter(parents2, (id) => this.hasCommit(id)),
      );
      const bases = SetUtils.intersection(c1Ancestors, c2Ancestors);
      if (bases.size > 0) {
        return Array.from(bases).map((id) => this.getCommit(id)).sort(
          compareCommitsDesc,
        )[0];
      }
      const newParents1 = new Set<string>();
      for (const parentId of parents1) {
        if (this.hasCommit(parentId)) {
          const parent = this.getCommit(parentId);
          SetUtils.update(newParents1, parent.parents);
        }
      }
      const newParents2 = new Set<string>();
      for (const parentId of parents2) {
        if (this.hasCommit(parentId)) {
          const parent = this.getCommit(parentId);
          SetUtils.update(newParents2, parent.parents);
        }
      }
      parents1 = newParents1;
      parents2 = newParents2;
    }
    return undefined;
  }

  recordForCommit(c: Commit | string): CFDSRecord {
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
        assert(result.checksum === contents.edit.srcChecksum);
        result.patch(contents.edit.changes);
        assert(result.checksum === contents.edit.dstChecksum);
      }
      result.checksum;
      this._cachedRecordForCommit.set(c.id, result);
    }
    return result.clone();
  }

  private cacheHeadForKey(
    key: string | null,
    head: Commit | undefined,
  ): Commit | undefined {
    // Look for a commit with a full value, so we don't crash on a later read
    while (head) {
      if (
        commitContentsIsRecord(head.contents) ||
        this.hasCommit(head.contents.base)
      ) {
        break;
      }
      let found = false;
      for (const p of head.parents) {
        if (this.hasCommit(p)) {
          head = this.getCommit(p);
          found = true;
          break;
        }
      }
      if (!found) {
        head = undefined;
      }
    }
    if (head) {
      this._cachedHeadsByKey.set(key, {
        commit: head,
        timestamp: performance.now(),
      });
    }
    return head;
  }

  /**
   * This method finds and returns the head for the given key. If a merge is
   * needed, it'll be attempted automatically.
   *
   * @param key The key to search for.
   *
   * @param session The caller's session id. Used to ensure internal consistency
   *                for this session.
   *
   * @param pendingCommit A commit that's yet to be persisted to the repository,
   *                      but will be persisted immediately after this call.
   *                      It'll be taken into account as if it's already part
   *                      of the commit graph.
   *
   * @param merge Whether to perform a merge when needed, or force a read-only
   *              read that won't generate any new commits.
   *
   * @returns The head commit, or undefined if no commit can be found for this
   *          key. Note that while this method may return undefined, some
   *          commits may still be present for this key. This happens when these
   *          commits are delta commits, and their base isn't present thus
   *          rendering them unreadable.
   */
  headForKey(
    key: string | null,
    session?: string,
    pendingCommit?: Commit,
    merge = true,
  ): Commit | undefined {
    assert(!pendingCommit || pendingCommit.key === key);
    if (!session) {
      session = this.trustPool.currentSession.id;
    }
    const cacheEntry = this._cachedHeadsByKey.get(key);
    if (
      cacheEntry &&
      cacheEntry.commit.session === session &&
      performance.now() - cacheEntry.timestamp <= HEAD_CACHE_EXPIRATION_MS
    ) {
      return cacheEntry.commit;
    }
    const leaves = this.leavesForKey(
      key,
      session ? this.trustPool.getSession(session) : undefined,
      pendingCommit,
    );
    if (leaves.length < 1) {
      // No commit history found. Return the null record as a starting point
      return undefined;
    }
    // Filter out any commits with equal records
    let commitsToMerge = commitsWithUniqueRecords(leaves).sort(
      coreValueCompare,
    );
    // If our leaves converged on a single value, we can simply return it.
    if (commitsToMerge.length === 1) {
      return this.cacheHeadForKey(key, commitsToMerge[0]);
    }
    let result: Commit | undefined;
    if (merge && this.allowMerge) {
      // At this point our leaves have more than one value. Try to merge them all
      // to a single value. Currently we're simply doing a crude N-way merge and
      // rely on our patch to come up with a nice result. A better way may be to
      // do a recursive 3-way merge like git does.
      try {
        const roots = commitsToMerge.filter((c) => c.parents.length === 0);
        commitsToMerge = commitsToMerge.filter((c) => c.parents.length > 0);
        // Find the base for our N-way merge
        let lca: Commit | undefined, scheme: Scheme;
        [commitsToMerge, lca, scheme] = this.findMergeBase(commitsToMerge);
        if (commitsToMerge.length === 0) {
          throw serviceUnavailable();
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
        const mergeCommit = this.deltaCompressIfNeeded(
          new Commit({
            session,
            key,
            contents: base,
            parents: leaves.map((c) => c.id),
          }),
        );
        signCommit(this.trustPool.currentSession, mergeCommit).then(
          (signedCommit) => {
            this.persistVerifiedCommits([signedCommit]);
          },
        );
        return this.cacheHeadForKey(key, mergeCommit);
      } catch (e) {
        if (!(e instanceof ServerError && e.code === Code.ServiceUnavailable)) {
          throw e; // Unknown error. Rethrow.
        }
      }
    }
    if (!result) {
      // Since we're dealing with a partial graph, some of our leaves may not
      // actually be leaves. For example, let's consider c4 -> c3 -> c2 -> c1.
      // If we somehow temporarily lost c2 and c4, we would consider both c3
      // and c1 as leaves. Therefore, we first sort all our leaves from
      // newest to oldest.
      leaves.sort(compareCommitsDesc);
      // Preserve local consistency for the caller and return whichever value
      // it wrote last.
      for (const c of leaves) {
        if (c.session === session) {
          const head = this.cacheHeadForKey(key, c);
          if (head) {
            return head;
          }
        }
      }
    }
    // No match found. Find the last written value we can handle safely
    for (
      const c of Array.from(this.commitsForKey(key)).sort(
        compareCommitsDesc,
      )
    ) {
      const head = this.cacheHeadForKey(key, c);
      if (head) {
        return head;
      }
    }
    return undefined;
  }

  valueForKey(
    key: string | null,
    session?: string,
    pendingCommit?: Commit,
    merge = true,
  ): CFDSRecord {
    const head = this.headForKey(key, session, pendingCommit, merge);
    return head ? this.recordForCommit(head) : CFDSRecord.nullRecord();
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
  ): Promise<boolean> {
    // All keys start with null records implicitly, so need need to persist
    // them. Also, we forbid downgrading a record back to null once initialized.
    if (value.isNull) {
      return false;
    }
    const session = this.trustPool.currentSession;
    const head = await this.headForKey(key);
    const headRecord = head ? this.recordForCommit(head) : undefined;
    if (headRecord?.isEqual(value)) {
      return false;
    }
    let commit = new Commit({
      session: session.id,
      key,
      contents: value.clone(),
      parents: head?.id,
    });
    commit = this.deltaCompressIfNeeded(commit);
    if (
      commitContentsIsDelta(commit.contents) &&
      commit.contents.edit.isEmpty
    ) {
      return false;
    }
    const signedCommit = await signCommit(session, commit);
    this._cachedHeadsByKey.delete(key);
    this.persistVerifiedCommits([signedCommit]);
    return true;
  }

  private deltaCompressIfNeeded(fullCommit: Commit): Commit {
    assert(commitContentsIsRecord(fullCommit.contents));
    // return fullCommit;
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
        });
        log({
          severity: 'METRIC',
          name: 'DeltaFormatSavings',
          value: Math.round((100 * (fullLength - deltaLength)) / fullLength),
          unit: 'Percent',
        });
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
    return this.headForKey(key, undefined, undefined, false) !== undefined;
  }

  async *verifyCommits(commits: Iterable<Commit>): AsyncIterable<Commit> {
    const authorizer = this.authorizer;
    commits = Array.from(commits).sort((c1, c2) =>
      c1.timestamp.getTime() - c2.timestamp.getTime()
    );
    for (const c of commits) {
      if (await this.trustPool.verify(c)) {
        if (authorizer) {
          const session = this.trustPool.getSession(c.session);
          if (!session) {
            continue;
          }
          if (authorizer(this, c, session, true)) {
            yield c;
          }
        } else {
          yield c;
        }
      }
    }
  }

  async persistCommits(commits: Iterable<Commit>): Promise<Commit[]> {
    const batchSize = 50;
    const result: Commit[] = [];
    let batch: Commit[] = [];
    commits = filterIterable(commits, (c) => !this._commitsCache.has(c.id));
    for await (const verifiedCommit of this.verifyCommits(commits)) {
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
    for (const batch of ArrayUtils.slices(commits, 50)) {
      ArrayUtils.append(result, this._persistCommitsBatchToStorage(batch));
      for (const c of batch) {
        for (const p of c.parents) {
          adjList.addEdge(c.id, p, 'parent');
        }
      }
    }
    for (const c of result) {
      this._cachedHeadsByKey.delete(c.key);
    }
    for (const c of result) {
      this._runUpdatesOnNewCommit(c);
    }
    return result;
  }

  private _runUpdatesOnNewCommit(commit: Commit): void {
    this._commitsCache.set(commit.id, commit);
    // Auto add newly discovered sessions to our trust pool
    try {
      if (this.namespaceForKey(commit.key) === SchemeNamespace.SESSIONS) {
        this._cachedHeadsByKey.delete(commit.key);
        const headRecord = this.valueForKey(
          commit.key,
          undefined,
          undefined,
          false,
        );
        if (headRecord.scheme.namespace === SchemeNamespace.SESSIONS) {
          sessionFromRecord(headRecord).then((session) => {
            this.trustPool.addSession(session, commit);
          });
        }
      }
    } catch (e: unknown) {
      // Rethrow any error not caused by a missing commit graph
      if (!(e instanceof ServerError && e.code === Code.ServiceUnavailable)) {
        throw e;
      }
    }
    // Notify everyone else
    this.emit('NewCommit', commit);
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
    const repoFieldName = repositoryForRecord(c.key, record);
    if (repoFieldName === kRecordIdField) {
      const commit = typeof c === 'string' ? this.getCommit(c) : c;
      assert(commit !== undefined && commit.key !== undefined);
      return commit.key!;
    }
    const result = record.get<string>(repoFieldName);
    assert(result?.length > 0);
    return result;
  }
}

function commitsWithUniqueRecords(commits: Iterable<Commit>): Commit[] {
  const hashes = new Set<string>();
  const result: Commit[] = [];
  for (const c of commits) {
    const checksum = c.contentsChecksum;
    if (!hashes.has(checksum)) {
      result.push(c);
      hashes.add(checksum);
    }
  }
  return result;
}

function compareCommitsDesc(c1: Commit, c2: Commit): number {
  // Use the commit id as a consistent tie breaker when timestamps are equal
  if (coreValueEquals(c1.timestamp, c2.timestamp)) {
    return coreValueCompare(c1.id, c2.id);
  }
  // Reverse order so we get descending timestamps
  return coreValueCompare(c2.timestamp, c1.timestamp);
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
