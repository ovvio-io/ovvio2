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
import { ReadonlyJSONObject } from '../base/interfaces.ts';
import { log } from '../logging/log.ts';
import { Commit } from './commit.ts';
import * as StringUtils from '../base/string.ts';
import { assert } from '../base/error.ts';

const K_DB_VERSION = 1;

interface EncodedCommitContents extends ReadonlyJSONObject {
  r: ReadonlyJSONObject; // Serialized Record instance
}

interface EncodedDeltaCommitContents extends ReadonlyJSONObject {
  b: string; // Base commit id
  e: ReadonlyJSONObject; // Serialized Edit instance
}

interface EncodedCommit extends ReadonlyJSONObject {
  ver: number; // Build number
  id: string;
  k?: string; // key
  s: string; // session
  ts: number; // timestamp
  p?: string[]; // parents
  c: EncodedCommitContents | EncodedDeltaCommitContents;
}

interface RepoBackupSchema extends DBSchema {
  commits: {
    key: 'id';
    value: EncodedCommit;
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
          db.createObjectStore('commits', { keyPath: 'id' });
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
            await store.put(JSONCyclicalEncoder.serialize(c) as EncodedCommit);
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

  async loadCommits(): Promise<Commit[]> {
    const db = await this.getDB();
    const txn = db.transaction('commits', 'readonly');
    const cursor = await txn.store.openCursor();
    return (await txn.store.getAll()).map(
      (json) =>
        new Commit({
          decoder: new JSONCyclicalDecoder(json),
        })
    );
  }
}
