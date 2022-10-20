import { uniqueId } from '../../base/common.ts';
import {
  coreValueCompare,
  coreValueEquals,
} from '../../base/core-types/index.ts';
import * as SetUtils from '../../base/set.ts';
import { Dictionary } from '../../base/collections/dict.ts';
import { Code, ServerError, serviceUnavailable } from './errors.ts';
import {
  Commit,
  commitContentsIsRecord,
  commitInit,
  DeltaContents,
} from './commit.ts';
import { concatChanges, DataChanges } from './object.ts';
import { Record } from './record.ts';
import { assert, notReached } from '../../base/error.ts';
import { JSONCyclicalEncoder } from '../../base/core-types/encoding/json.ts';
import { Edit } from './edit.ts';

export class Repository {
  // Key -> Commit Id -> Commit
  private readonly _commitsByRecordKey: Dictionary<string, Set<string>>;
  private readonly _commitsById: Dictionary<string, Commit>;

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

  get numberOfCommits(): number {
    return this._commitsById.size;
  }

  getCommit(id: string): Commit {
    const c = this._commitsById.get(id);
    if (!c) {
      throw serviceUnavailable();
    }
    return c;
  }

  commits(): Iterable<Commit> {
    return this._commitsById.values();
  }

  commitsForKey(key: string): Iterable<Commit> {
    const keyMap = this._commitsByRecordKey.get(key);
    if (!keyMap) {
      return [];
    }
    return SetUtils.mapToArray(keyMap, (id) => this.getCommit(id));
  }

  leavesForKey(key: string): Commit[] {
    const childrenPerCommit = new Map<string, Set<Commit>>();
    for (const c of this.commitsForKey(key)) {
      for (const p of c.parents) {
        let children = childrenPerCommit.get(p);
        if (!children) {
          children = new Set();
          childrenPerCommit.set(p, children);
        }
        children.add(c);
      }
    }
    const result: Commit[] = [];
    for (const c of this.commitsForKey(key)) {
      if (!childrenPerCommit.has(c.id)) {
        result.push(c);
      }
    }
    return result;
  }

  keys(): Iterable<string> {
    return this._commitsByRecordKey.keys();
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
  lca(commits: Iterable<Commit>): Commit | undefined {
    let result: Commit | undefined;
    for (const c of commits) {
      if (!result) {
        result = c;
        continue;
      }
      result = this._commonAncestor(result, c);
      if (!result) {
        break;
      }
    }
    return result;
  }

  /**
   * Given two commits, this method finds the Lowest Common Ancestor between
   * the two, or undefined if the commits aren't related.
   *
   * @param c1 First commit.
   * @param c2 Second commit.
   * @param c1Ancestors Internal c1 path for recursion.
   * @param c2Ancestors Internal c2 path for recursion.
   *
   * @returns The common ancestor commit of undefined.
   * @throws ServiceUnavailable if the commit graph is incomplete.
   */
  private _commonAncestor(
    c1: Commit,
    c2: Commit,
    c1Ancestors?: Set<string>,
    c2Ancestors?: Set<string>
  ): Commit | undefined {
    if (!c1.parents.length || !c2.parents.length || c1.key !== c2.key) {
      return undefined;
    }
    if (c1.id === c2.id) {
      return c1;
    }
    if (!c1Ancestors) {
      c1Ancestors = new Set();
    }
    if (!c2Ancestors) {
      c2Ancestors = new Set();
    }
    for (const p of c1.parents) {
      if (c2Ancestors.has(p)) {
        return this.getCommit(p);
      }
      c1Ancestors.add(p);
    }
    for (const p of c2.parents) {
      if (c1Ancestors.has(p)) {
        return this.getCommit(p);
      }
      c2Ancestors.add(p);
    }
    for (const p of c1.parents) {
      const r = this._commonAncestor(
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
      const r = this._commonAncestor(
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

  headForKey(key: string, session: string): Commit | undefined {
    const leaves = this.leavesForKey(key);
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
      // Find the base of our N-way merge. If no LCA is found then we're dealing
      // with concurrent writers who all created of the same key concurrently.
      // Use the null record as a base in this case.
      const lca = this.lca(commitsToMerge);
      const base = lca ? this.recordForCommit(lca) : Record.nullRecord();
      // TODO: Scheme upgrade
      // Compute a compound diff
      let changes: DataChanges = {};
      for (const c of commitsToMerge) {
        changes = concatChanges(
          changes,
          base.diff(this.recordForCommit(c), true)
        );
      }
      const mergeRecord = base.clone();
      mergeRecord.patch(changes);
      const mergeCommit = commitInit(
        uniqueId(),
        session,
        key,
        mergeRecord,
        leaves.map((c) => c.id)
      );
      this.persistCommit(mergeCommit);
      return mergeCommit;
    } catch (e) {
      // We're dealing with partial history, so need to come up with some value
      // that makes sense
      if (e instanceof ServerError && e.code === Code.ServiceUnavailable) {
        // Since we're dealing with a partial graph, some of our leaves may not
        // actually be leaves. For example, let's consider c4 -> c3 -> c2 -> c1.
        // If we somehow temporarily lost c2 and c4, we would consider both c3
        // and c1 as leaves. Therefore, we first sort all our leaves by
        // descending timestamp.
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

  valueForKey(key: string, session: string): Record {
    const head = this.headForKey(key, session);
    return head ? this.recordForCommit(head) : Record.nullRecord();
  }

  setValueForKey(key: string, session: string, value: Record): void {
    const head = this.headForKey(key, session);
    if (head && this.recordForCommit(head).isEqual(value)) {
      return;
    }
    if (!head && value.isNull) {
      return;
    }
    const lastRecordCommit = this.lastRecordCommitForKey(key);
    const fullCommit = commitInit(uniqueId(), session, key, value, head?.id);
    let deltaCommit: Commit | undefined;
    if (lastRecordCommit) {
      const baseRecord = this.recordForCommit(lastRecordCommit);
      const edit = new Edit({
        changes: baseRecord.diff(value, false),
        srcChecksum: baseRecord.checksum,
        dstChecksum: value.checksum,
      });
      const commitEncoder = new JSONCyclicalEncoder();
      commitEncoder.set('c', [fullCommit]);
      const deltaLength = JSON.stringify(edit.toJS()).length;
      const fullLength = JSON.stringify(commitEncoder.getOutput()).length;
      // Only if our delta format is small enough relative to the full format,
      // then it's worth switching to it
      if (deltaLength <= fullLength / 2) {
        deltaCommit = commitInit(
          fullCommit.id,
          session,
          key,
          { base: lastRecordCommit.id, edit },
          fullCommit.parents
        );
        console.log(
          `Using delta format saves ${Math.round(
            (100 * (fullLength - deltaLength)) / fullLength
          )}% (${fullLength - deltaLength} bytes)`
        );
      }
    }
    this.persistCommit(deltaCommit || fullCommit);
  }

  private lastRecordCommitForKey(key: string): Commit | undefined {
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

  hasKey(key: string): boolean {
    return this.headForKey(key, '') !== undefined;
  }

  persistCommit(c: Commit): boolean {
    const localCommit = this._commitsById.get(c.id);
    if (localCommit !== undefined) {
      // Sanity check: Both copies of the same commit must be equal.
      // TODO: Rather than crash, assume the other side may be malicious
      assert(coreValueEquals(c, localCommit));
      return false;
    }
    this._commitsById.set(c.id, c);
    let set = this._commitsByRecordKey.get(c.key);
    if (!set) {
      set = new Set();
      this._commitsByRecordKey.set(c.key, set);
    }
    set.add(c.id);
    // TODO: Write to local storage
    return true;
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
