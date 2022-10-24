import * as lmdb from 'https://deno.land/x/lmdb@v2.2.5/mod.ts';
import { resolve as resolvePath } from 'https://deno.land/std@0.160.0/path/mod.ts';
import { RepoStorage } from '../cfds/base/repo.ts';
import { Commit } from '../cfds/base/commit.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { toReverseTimestamp } from '../base/time.ts';
import { assert } from '../base/error.ts';

const KEY_SEP = '/';

export class LMDBRepoStorage implements RepoStorage {
  private _rootHandle: any;
  private _commitsByIdTableHandle: any; // id -> commit
  private _commitsByKeyTableHandle: any; // key -> [commitId, ...]

  constructor(path: string) {
    path = resolvePath(path);
    this._rootHandle = lmdb.open({
      path,
    });
    this._commitsByIdTableHandle = this._rootHandle.open('cbi');
    this._commitsByKeyTableHandle = this._rootHandle.open('cbk');
  }

  numberOfCommits(): number {
    return this._commitsByIdTableHandle.stat().entryCount;
  }

  getCommit(id: string): Commit | undefined {
    const js = this._commitsByIdTableHandle.get(id);
    return js
      ? new Commit({ decoder: new JSONCyclicalDecoder(js) })
      : undefined;
  }

  *allCommits(): Generator<Commit> {
    for (const {
      value: encodedCommit,
    } of this._commitsByIdTableHandle.getRange({
      snapshot: false,
    })) {
      yield new Commit({ decoder: new JSONCyclicalDecoder(encodedCommit) });
    }
  }

  *commitsForKey(key: string): Generator<Commit> {
    const prefix = key + KEY_SEP;
    for (const {
      key: indexKey,
      value: commitId,
    } of this._commitsByKeyTableHandle.getRange({
      start: prefix,
      end: key + String.fromCodePoint(KEY_SEP.codePointAt(0)! + 1),
      snapshot: false,
    })) {
      if (!indexKey.startsWith(prefix)) {
        break;
      }
      const commit = this.getCommit(commitId)!;
      if (commit) {
        yield commit;
      }
    }
  }

  *allKeys(): Generator<string> {
    const returnedKeys = new Set<string>();
    for (const { fullKey } of this._commitsByKeyTableHandle.getKeys({
      snapshot: false,
    })) {
      const sep = fullKey.indexOf(KEY_SEP);
      if (sep > 0) {
        const recordKey = fullKey.substring(0, sep);
        if (!returnedKeys.has(recordKey)) {
          returnedKeys.add(recordKey);
          yield recordKey;
        }
      }
    }
  }

  persistCommit(c: Commit): void {
    const existing = this.getCommit(c.id);
    if (existing) {
      assert(existing.isEqual(c)); // Sanity check
      return;
    }
    const errHandler = (err: any) => {
      console.error(`Error persisting ${c.id}: ${err}`);
      throw err;
    };
    this._commitsByIdTableHandle
      .put(c.id, JSONCyclicalEncoder.serialize(c))
      .catch(errHandler);
    this._commitsByKeyTableHandle
      .put([c.key, toReverseTimestamp(c.timestamp), c.session].join(KEY_SEP))
      .catch(errHandler);
  }
}
