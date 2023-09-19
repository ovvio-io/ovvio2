import EventEmitter from 'eventemitter3';
import { coreValueCompare, coreValueEquals } from '../base/core-types/index.ts';
import * as SetUtils from '../base/set.ts';
import { Dictionary } from '../base/collections/dict.ts';
import { Code, ServerError, serviceUnavailable } from '../cfds/base/errors.ts';
import { Commit, commitContentsIsRecord, DeltaContents } from './commit.ts';
import { concatChanges, DataChanges } from '../cfds/base/object.ts';
import { Record } from '../cfds/base/record.ts';
import { assert, notReached } from '../base/error.ts';
import { JSONCyclicalEncoder } from '../base/core-types/encoding/json.ts';
import { Edit } from '../cfds/base/edit.ts';
import { log } from '../logging/log.ts';
import { kRecordIdField } from '../cfds/base/scheme-types.ts';
import { Scheme } from '../cfds/base/scheme.ts';
import { repositoryForRecord } from './resolver.ts';

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

export class Repository<ST extends RepoStorage<ST>> extends EventEmitter {
  readonly storage: ST;

  constructor(storage: ST) {
    super();
    this.storage = storage;
  }

  static id(type: RepositoryType, id: string): string {
    return `${type}/${id}`;
  }

  get numberOfCommits(): number {
    return this.storage.numberOfCommits();
  }

  getCommit(id: string): Commit {
    const c = this.storage.getCommit(id);
    if (!c) {
      throw serviceUnavailable();
    }
    return c;
  }

  commits(): Iterable<Commit> {
    return this.storage.allCommits();
  }

  commitsForKey(key: string | null): Iterable<Commit> {
    return this.storage.commitsForKey(key);
  }

  leavesForKey(key: string | null, pendingCommit?: Commit): Commit[] {
    const childrenPerCommit = new Map<string, Set<Commit>>();
    for (const c of this.commitsForKey(key)) {
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

  keys(): Iterable<string> {
    return this.storage.allKeys();
  }

  /**
   * Given an iterable of commits, this method returns their Lowest Common
   * Ancestor or undefined if no such ancestor exists (meaning the commits
   * belong to disconnected histories).
   *
   * @param commits An iterable of commits.
   * @returns The LCA commit or undefined if no common ancestor exists.
   * @throws ServiceUnavailable if the commit graph is incomplete.
   */
  findMergeBase(commits: Iterable<Commit>): Commit | undefined {
    let result: Commit | undefined;
    for (const c of commits) {
      if (!result) {
        result = c;
        continue;
      }
      result = this._findMergeBase(result, c);
      if (!result) {
        break;
      }
    }
    return result;
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
    if (c.contents.record) {
      return c.contents.record as Record;
    }
    if (c.contents.base) {
      const contents: DeltaContents = c.contents as DeltaContents;
      const result = this.recordForCommit(contents.base).clone();
      assert(result.checksum === contents.edit.srcChecksum);
      result.patch(contents.edit.changes);
      assert(result.checksum === contents.edit.dstChecksum);
      return result;
    }
    notReached();
  }

  headForKey(
    key: string | null,
    session: string,
    pendingCommit?: Commit
  ): Commit | undefined {
    assert(!pendingCommit || pendingCommit.key === key);
    const leaves = this.leavesForKey(key, pendingCommit);
    if (leaves.length < 1) {
      // No commit history found. Return the null record as a starting point
      return undefined;
    }
    // Filter out any commits with equal records
    const commitsToMerge = commitsWithUniqueRecords(leaves);
    // If our leaves converged on a single value, we can simply return it
    if (commitsToMerge.length === 1) {
      return commitsToMerge[0];
    }
    // At this point our leaves have more than one value. Try to merge them all
    // to a single value. Currently we're simply doing a crude N-way merge and
    // rely on our patch to come up with a nice result. A better way may be to
    // do a recursive 3-way merge like git does.
    try {
      // Find the base for our N-way merge
      const lca = this.findMergeBase(commitsToMerge);
      // If no LCA is found then we're dealing with concurrent writers who all
      // created of the same key unaware of each other.
      // Use the null record as a base in this case.
      const base = lca
        ? this.recordForCommit(lca).clone()
        : Record.nullRecord();
      // Find the newest scheme in this merge
      let scheme: Scheme = base.scheme;
      for (const c of commitsToMerge) {
        const commitScheme = c.scheme;
        if (!commitScheme || commitScheme.isNull) {
          continue;
        }
        assert(
          scheme.isNull || commitScheme.namespace === scheme.namespace,
          'Commits with conflicting scheme detected'
        );

        if (
          commitScheme.version > scheme.version &&
          commitScheme.allowsAutoUpgradeFrom(scheme)
        ) {
          scheme = commitScheme;
        }
      }
      // Upgrade base to merge scheme
      base.upgradeScheme(scheme);
      // Compute a compound diff from our base to all unique records
      let changes: DataChanges = {};
      for (const c of commitsToMerge) {
        const record = this.recordForCommit(c).clone();
        // Before computing the diff, upgrade the record to the scheme decided
        // for this merge.
        record.upgradeScheme(scheme);
        changes = concatChanges(
          changes,
          base.diff(record, c.session === session)
        );
      }
      // Patch, and we're done.
      base.patch(changes);
      const mergeCommit = new Commit({
        session,
        key,
        contents: base,
        parents: leaves.map((c) => c.id),
      });
      this.persistCommits([this.deltaCompressIfNeeded(mergeCommit)]);
      return mergeCommit;
    } catch (e) {
      // We're dealing with partial history, so need to come up with some value
      // that makes sense
      if (e instanceof ServerError && e.code === Code.ServiceUnavailable) {
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
      // Unknown error. Rethrow.
      throw e;
    }
  }

  valueForKey(
    key: string | null,
    session: string,
    pendingCommit?: Commit
  ): Record {
    const head = this.headForKey(key, session, pendingCommit);
    return head ? this.recordForCommit(head) : Record.nullRecord();
  }

  setValueForKey(key: string | null, session: string, value: Record): boolean {
    const head = this.headForKey(key, session);
    if (head && this.recordForCommit(head).isEqual(value)) {
      return false;
    }
    if (!head && value.isNull) {
      return false;
    }
    const fullCommit = new Commit({
      session,
      key,
      contents: value.clone(),
      parents: head?.id,
    });
    this.persistCommits([this.deltaCompressIfNeeded(fullCommit)]);
    return true;
  }

  private deltaCompressIfNeeded(fullCommit: Commit): Commit {
    assert(commitContentsIsRecord(fullCommit.contents));
    return fullCommit;
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
      const commitEncoder = new JSONCyclicalEncoder();
      commitEncoder.set('c', [fullCommit]);
      const deltaLength = JSON.stringify(edit.toJS()).length;
      const fullLength = JSON.stringify(commitEncoder.getOutput()).length;
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
          severity: 'INFO',
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
    return this.headForKey(key, '') !== undefined;
  }

  persistCommits(commits: Iterable<Commit>): Commit[] {
    const result = Array.from(this.storage.persistCommits(commits, this));
    for (const c of result) {
      this.emit(EVENT_NEW_COMMIT, c);
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
    const h = commitContentsIsRecord(c.contents)
      ? c.contents.record.checksum
      : c.contents.edit.dstChecksum;
    if (!hashes.has(h)) {
      result.push(c);
      hashes.add(h);
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
