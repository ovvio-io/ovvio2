import EventEmitter from 'eventemitter3';
import { coreValueCompare, coreValueEquals } from '../base/core-types/index.ts';
import * as SetUtils from '../base/set.ts';
import * as ArrayUtils from '../base/array.ts';
import { Dictionary } from '../base/collections/dict.ts';
import { Code, ServerError, serviceUnavailable } from '../cfds/base/errors.ts';
import { Commit, commitContentsIsRecord, DeltaContents } from './commit.ts';
import { concatChanges, DataChanges } from '../cfds/base/object.ts';
import { Record } from '../cfds/base/record.ts';
import { assert } from '../base/error.ts';
import { Edit } from '../cfds/base/edit.ts';
import { log } from '../logging/log.ts';
import { SchemeNamespace, kRecordIdField } from '../cfds/base/scheme-types.ts';
import { Scheme } from '../cfds/base/scheme.ts';
import { repositoryForRecord } from './resolver.ts';
import {
  Session,
  TrustPool,
  sessionFromRecord,
  sign,
} from '../auth/session.ts';
import { filterIterable } from '../base/common.ts';

export const EVENT_NEW_COMMIT = 'NewCommit';

export const kRepositoryTypes = ['sys', 'data', 'user'] as const;
export type RepositoryType = (typeof kRepositoryTypes)[number];

export interface RepoStorage<T extends RepoStorage<T>> {
  numberOfCommits(): number;
  getCommit(id: string): Commit | undefined;
  allCommits(): Iterable<Commit>;
  commitsForKey(key: string | null): Iterable<Commit>;
  allKeys(): Iterable<string>;
  persistCommits(c: Iterable<Commit>, repo: Repository<T>): Iterable<Commit>;
  close(): void;
}

export type Authorizer<ST extends RepoStorage<ST>> = (
  repo: Repository<ST>,
  commit: Commit,
  session: Session,
  write: boolean
) => boolean;

export class Repository<ST extends RepoStorage<ST>> extends EventEmitter {
  readonly storage: ST;
  readonly trustPool: TrustPool;
  readonly authorizer?: Authorizer<ST>;

  constructor(storage: ST, trustPool: TrustPool, authorizer?: Authorizer<ST>) {
    super();
    this.storage = storage;
    this.trustPool = trustPool;
    this.authorizer = authorizer;
  }

  static id(type: RepositoryType, id: string): string {
    return `${type}/${id}`;
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
    if (session && authorizer) {
      let count = 0;
      for (const _ of this.commits(session)) {
        ++count;
        return count;
      }
    }
    return this.storage.numberOfCommits();
  }

  getCommit(id: string, session?: Session): Commit {
    const c = this.storage.getCommit(id);
    if (!c) {
      throw serviceUnavailable();
    }
    const { authorizer } = this;
    if (session && authorizer) {
      if (!authorizer(this, c, session, false)) {
        throw serviceUnavailable();
      }
    }
    return c;
  }

  hasCommit(id: string): boolean {
    return this.storage.getCommit(id) !== undefined;
  }

  commits(session?: Session): Iterable<Commit> {
    const { authorizer } = this;
    if (session && authorizer) {
      return filterIterable(this.storage.allCommits(), (c) =>
        authorizer(this, c, session, false)
      );
    }
    return this.storage.allCommits();
  }

  commitsForKey(key: string | null, session?: Session): Iterable<Commit> {
    const { authorizer } = this;
    if (session && authorizer) {
      return filterIterable(this.storage.commitsForKey(key), (c) =>
        authorizer(this, c, session, false)
      );
    }
    return this.storage.commitsForKey(key);
  }

  leavesForKey(
    key: string | null,
    session?: Session,
    pendingCommit?: Commit
  ): Commit[] {
    const childrenPerCommit = new Map<string, Set<Commit>>();
    for (const c of this.commitsForKey(key, session)) {
      this._setChildrenPerCommit(c, childrenPerCommit);
    }
    if (pendingCommit) {
      assert(pendingCommit.key === key); // Sanity check
      this._setChildrenPerCommit(pendingCommit, childrenPerCommit);
    }
    const result: Commit[] = [];
    for (const c of this.commitsForKey(key)) {
      if (!childrenPerCommit.has(c.id)) {
        result.push(c);
      }
    }
    return result;
  }

  private _setChildrenPerCommit(
    c: Commit,
    childrenPerCommit: Map<string, Set<Commit>>
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
    if (session && authorizer) {
      return filterIterable(this.storage.allKeys(), (key) =>
        authorizer(this, this.headForKey(key, session.id)!, session, false)
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
   * @returns The LCA commit or undefined if no common ancestor exists.
   *          Also returns the scheme to be used for this merge.
   *
   * @throws ServiceUnavailable if the commit graph is incomplete.
   */
  findMergeBase(commits: Iterable<Commit>): [Commit | undefined, Scheme] {
    let result: Commit | undefined;
    let scheme = Scheme.nullScheme();
    let noBase = false;
    for (const c of commits) {
      if (!result) {
        result = c;
        scheme = this.recordForCommit(c).scheme;
        continue;
      }
      if (!noBase) {
        result = this._findMergeBase(result, c);
        if (!result) {
          noBase = true;
        }
      }
      const s = this.recordForCommit(c).scheme;
      assert(scheme.isNull || scheme.namespace === s.namespace); // Sanity check
      if (s.version > (scheme?.version || 0)) {
        scheme = s;
      }
    }
    return [result, scheme];
  }

  /**
   * Given two commits, this method finds the base from which to perform a 3 way
   * merge for c1 and c2. The algorithm is based on a simple Lowest Common
   * Ancestor between the two, but rather than pick the actual LCA from the
   * graph, we choose the first time ancestors agree on a common value.
   *
   * @param c1 First commit.
   * @param c2 Second commit.
   * @param c1Ancestors Internal c1 path for recursion.
   * @param c2Ancestors Internal c2 path for recursion.
   *
   * @returns The base for a 3-way merge between c1 and c2, or undefined if no
   *          such base can be found.
   *
   * @throws ServiceUnavailable if the commit graph is incomplete and cannot be
   *         traversed.
   */
  private _findMergeBase(
    c1: Commit,
    c2: Commit,
    c1Ancestors?: Set<string>,
    c2Ancestors?: Set<string>
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
    if (!c1Ancestors) {
      c1Ancestors = new Set();
    }
    if (!c2Ancestors) {
      c2Ancestors = new Set();
    }
    for (const parentId of c1.parents) {
      const parent = this.getCommit(parentId);
      const checksum = parent.contentsChecksum;
      if (c2Ancestors.has(checksum)) {
        return parent;
      }
      c1Ancestors.add(checksum);
    }
    for (const parentId of c2.parents) {
      const parent = this.getCommit(parentId);
      const checksum = parent.contentsChecksum;
      if (c1Ancestors.has(checksum)) {
        return parent;
      }
      c2Ancestors.add(checksum);
    }
    for (const p of c1.parents) {
      const r = this._findMergeBase(
        this.getCommit(p),
        c2,
        c1Ancestors,
        c2Ancestors
      );
      if (r) {
        return r;
      }
    }
    for (const p of c2.parents) {
      const r = this._findMergeBase(
        c1,
        this.getCommit(p),
        c1Ancestors,
        c2Ancestors
      );
      if (r) {
        return r;
      }
    }
    return undefined;
  }

  recordForCommit(c: Commit | string): Record {
    if (typeof c === 'string') {
      c = this.getCommit(c);
    }
    if (commitContentsIsRecord(c.contents)) {
      return c.contents.record.clone();
    } else {
      const contents: DeltaContents = c.contents as DeltaContents;
      const result = this.recordForCommit(contents.base).clone();
      assert(result.checksum === contents.edit.srcChecksum);
      result.patch(contents.edit.changes);
      assert(result.checksum === contents.edit.dstChecksum);
      return result.clone();
    }
  }

  headForKey(
    key: string | null,
    session?: string,
    pendingCommit?: Commit,
    merge = true
  ): Commit | undefined {
    assert(!pendingCommit || pendingCommit.key === key);
    if (!session) {
      session = this.trustPool.currentSession.id;
    }
    const leaves = this.leavesForKey(
      key,
      session ? this.trustPool.getSession(session) : undefined,
      pendingCommit
    );
    if (leaves.length < 1) {
      // No commit history found. Return the null record as a starting point
      return undefined;
    }
    // Filter out any commits with equal records
    const commitsToMerge =
      commitsWithUniqueRecords(leaves).sort(coreValueCompare);
    // If our leaves converged on a single value, we can simply return it
    if (commitsToMerge.length === 1) {
      return commitsToMerge[0];
    }
    let result: Commit | undefined;

    if (merge) {
      // At this point our leaves have more than one value. Try to merge them all
      // to a single value. Currently we're simply doing a crude N-way merge and
      // rely on our patch to come up with a nice result. A better way may be to
      // do a recursive 3-way merge like git does.
      try {
        // Find the base for our N-way merge
        const [lca, scheme] = this.findMergeBase(commitsToMerge);
        // If no LCA is found then we're dealing with concurrent writers who all
        // created of the same key unaware of each other.
        // Use the null record as a base in this case.
        const base = lca
          ? this.recordForCommit(lca).clone()
          : Record.nullRecord();
        // Upgrade base to merge scheme
        if (!scheme.isNull) {
          base.upgradeScheme(scheme);
        }
        // Compute a compound diff from our base to all unique records
        let changes: DataChanges = {};
        for (const c of commitsToMerge) {
          const record = this.recordForCommit(c).clone();
          // Before computing the diff, upgrade the record to the scheme decided
          // for this merge.
          if (!scheme.isNull) {
            record.upgradeScheme(scheme);
          }
          changes = concatChanges(
            changes,
            base.diff(record, c.session === session)
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
          })
        );
        sign(this.trustPool.currentSession, mergeCommit).then(
          (signedCommit) => {
            this.persistVerifiedCommits([signedCommit]);
          }
        );
        return mergeCommit;
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
          return c;
        }
      }
      // No session was provided. Return the last globally written value.
      return leaves[0];
    }
    return result;
  }

  valueForKey(
    key: string | null,
    session?: string,
    pendingCommit?: Commit,
    merge = true
  ): Record {
    const head = this.headForKey(key, session, pendingCommit, merge);
    return head ? this.recordForCommit(head) : Record.nullRecord();
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
  async setValueForKey(key: string | null, value: Record): Promise<boolean> {
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
    const signedCommit = await sign(session, commit);
    await this.persistCommits([signedCommit]);
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
        fullCommit.contents.record.toJS()
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
    for (const c of commits) {
      if (await this.trustPool.verify(c)) {
        if (authorizer) {
          const session = this.trustPool.getSession(c.session);
          assert(session !== undefined);
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

  private persistVerifiedCommits(commits: Iterable<Commit>): Commit[] {
    const batchSize = 50;
    const result: Commit[] = [];
    let batch: Commit[] = [];

    for (const verifiedCommit of commits) {
      batch.push(verifiedCommit);
      if (batch.length >= batchSize) {
        ArrayUtils.append(result, this._persistCommitsBatchToStorage(batch));
        batch = [];
      }
    }
    if (batch.length > 0) {
      ArrayUtils.append(result, this._persistCommitsBatchToStorage(batch));
    }

    // Auto add newly discovered sessions to our trust pool
    for (const persistedCommit of result) {
      try {
        const record = this.valueForKey(
          persistedCommit.key,
          undefined,
          undefined,
          false
        );
        if (record.scheme.namespace === SchemeNamespace.SESSIONS) {
          sessionFromRecord(record).then((session) => {
            this.trustPool.addSession(session, persistedCommit);
          });
        }
      } catch (e: unknown) {
        // Rethrow any error not caused by a missing commit graph
        if (!(e instanceof ServerError && e.code === Code.ServiceUnavailable)) {
          throw e;
        }
      }
    }
    return result;
  }

  private _persistCommitsBatchToStorage(batch: Iterable<Commit>): Commit[] {
    const storage = this.storage;
    const result: Commit[] = [];
    for (const persistedCommit of storage.persistCommits(batch, this)) {
      this.emit(EVENT_NEW_COMMIT, persistedCommit);
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

  allCommits(): Iterable<Commit> {
    return this._commitsById.values();
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
