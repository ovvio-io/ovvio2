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
import { SerialScheduler } from '../base/serial-scheduler.ts';

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
    key: string;
    value: EncodedCommit;
  };
}

export class IDBRepositoryBackup {
  private _openCount = 0;

  constructor(readonly dbName: string) {}

  private open(): Promise<IDBPDatabase<RepoBackupSchema>> {
    return openDB<RepoBackupSchema>(this.dbName, K_DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('commits', { keyPath: 'id' });
      },
    });
  }

  // async delete(): Promise<void> {
  //   await this.close();
  //   await deleteDB(this.dbName);
  // }

  persistCommits(repoId: string, commits: Iterable<Commit>): Promise<void> {
    return SerialScheduler.get('idb').run(async () => {
      const db = await this.open();
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
                JSONCyclicalEncoder.serialize(c) as EncodedCommit
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
      db.close();
    });
  }

  loadCommits(): Promise<Commit[]> {
    return SerialScheduler.get('idb').run(async () => {
      const db = await this.open();
      const txn = db.transaction('commits', 'readonly');
      const result = (await txn.store.getAll()).map(
        (json) =>
          new Commit({
            decoder: new JSONCyclicalDecoder(json),
          })
      );
      db.close();
      return result;
    });
  }
}
