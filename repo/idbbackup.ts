import {
  openDB,
  deleteDB,
  DBSchema,
  IDBPDatabase,
} from 'https://esm.sh/idb@7.1.1';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { serializeDate } from '../base/date.ts';
import { ReadonlyJSONObject } from '../base/interfaces.ts';
import { log } from '../logging/log.ts';
import { Commit } from './commit.ts';
import * as StringUtils from '../base/string.ts';
import { filterIterable, mapIterable } from '../base/common.ts';
import { assert } from '../base/error.ts';
import { sep } from 'https://deno.land/std@0.160.0/path/win32.ts';

const K_DB_VERSION = 1;

interface RepoBackupSchema extends DBSchema {
  commits: {
    key: string;
    value: {
      json: ReadonlyJSONObject;
      ts: number;
    };
  };
}

export class IDBRepositoryBackup {
  private _dbPromise: Promise<IDBPDatabase<RepoBackupSchema>> | undefined;
  constructor(readonly dbName: string) {
    this.getDB(); // Start open of our DB as soon as possible
  }

  private getDB(): Promise<IDBPDatabase<RepoBackupSchema>> {
    if (this._dbPromise === undefined) {
      this._dbPromise = openDB<RepoBackupSchema>(this.dbName, K_DB_VERSION, {
        upgrade(db) {
          db.createObjectStore('commits');
        },
      });
    }
    return this._dbPromise;
  }

  async close(): Promise<boolean> {
    if (undefined === this._dbPromise) {
      return false;
    }
    const db = await this._dbPromise;
    db.close();
    this._dbPromise = undefined;
    return true;
  }

  async delete(): Promise<void> {
    await this.close();
    await deleteDB(this.dbName);
  }

  async persistCommits(
    repoId: string,
    commits: Iterable<Commit>
  ): Promise<void> {
    const db = await this.getDB();
    const txn = db.transaction('commits', 'readwrite', {
      durability: 'relaxed',
    });
    const store = txn.objectStore('commits');
    const promises: Promise<void>[] = [];
    for (const c of commits) {
      promises.push(
        (async () => {
          try {
            await store.put(
              {
                json: JSONCyclicalEncoder.serialize(c),
                ts: serializeDate(c.timestamp),
              },
              `${repoId}/${c.id}`
            );
          } catch (e) {
            log({
              severity: 'ERROR',
              error: 'BackupWriteFailed',
              message: e.message,
              trace: e.stack,
              repo: repoId,
              commit: c.id,
            });
            throw e;
          }
        })()
      );
    }
    for (const p of promises) {
      await p;
    }
    await txn.done;
  }

  async loadCommits(repoId?: string): Promise<{ [repoId: string]: Commit[] }> {
    const db = await this.getDB();
    const txn = db.transaction('commits', 'readonly');
    const result: { [repoId: string]: Commit[] } = {};
    let cursor;
    if (repoId) {
      const prefix = repoId + '/';
      cursor = await txn.store.openCursor(
        IDBKeyRange.bound(prefix, StringUtils.increment(prefix), false, true)
      );
    } else {
      cursor = await txn.store.openCursor();
    }
    while (cursor) {
      const repoId = repoIdFromKey(cursor.key);
      let arr = result[repoId];
      if (!arr) {
        arr = [];
        result[repoId] = arr;
      }
      arr.push(
        new Commit({
          decoder: new JSONCyclicalDecoder(cursor.value.json),
        })
      );
      await cursor.continue();
    }
    return result;
  }
}

function repoIdFromKey(key: string): string {
  const sepIdx = key.indexOf('/');
  assert(sepIdx > 0);
  return key.substring(0, sepIdx);
}
