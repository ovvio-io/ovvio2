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
import { Repository, MemRepoStorage } from './repo.ts';
import { EaseInOutSineTimer } from '../base/timer.ts';
import { kMinuteMs, kSecondMs } from '../base/date.ts';
import { notReached } from '../base/error.ts';

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
  private static _didLogout = false;
  private readonly _commitPersistedTs: Map<string, number>;
  private readonly _backupTimer: EaseInOutSineTimer;
  private _openPromise: Promise<IDBPDatabase<RepoBackupSchema>> | undefined;

  static async logout(): Promise<never> {
    this._didLogout = true;
    const databases = await indexedDB.databases();
    for (const info of databases) {
      if (!info.name) {
        continue;
      }
      await indexedDB.deleteDatabase(info.name);
    }
    location.reload();
    notReached();
  }

  constructor(
    readonly dbName: string,
    readonly repo: Repository<MemRepoStorage>,
  ) {
    this._commitPersistedTs = new Map();
    this._backupTimer = new EaseInOutSineTimer(
      kSecondMs,
      kMinuteMs,
      5 * kMinuteMs,
      async () => {
        let count = 0;
        let batch: Commit[] = [];
        const maxBatchSize = 100;
        const maxBackupCount = 100;
        for (const c of repo.commits()) {
          batch.push(c);
          if (batch.length >= maxBatchSize) {
            count += await this.persistCommits(batch);
            batch = [];
          }
          if (count >= maxBackupCount) {
            break;
          }
        }
        if (count > 0) {
          this._backupTimer.reset();
        }
      },
      true,
      'IDB Background Save',
    ).schedule();
  }

  private open(): Promise<IDBPDatabase<RepoBackupSchema>> {
    if (!this._openPromise) {
      this._openPromise = openDB<RepoBackupSchema>(this.dbName, K_DB_VERSION, {
        upgrade(db) {
          db.createObjectStore('commits', { keyPath: 'id' });
        },
      });
    }
    return this._openPromise;
  }

  persistCommits(commits: Iterable<Commit>): Promise<number> {
    if (IDBRepositoryBackup._didLogout) {
      return Promise.resolve(0);
    }
    return SerialScheduler.get(`idb:${this.dbName}`).run(async () => {
      const db = await this.open();
      const txn = db.transaction('commits', 'readwrite', {
        durability: 'relaxed',
      });
      const store = txn.objectStore('commits');
      const promises: Promise<void>[] = [];
      let result = 0;
      for (const c of commits) {
        if (IDBRepositoryBackup._didLogout) {
          return result;
        }
        promises.push(
          (async () => {
            try {
              if ((await store.getKey(c.id)) === undefined) {
                if (IDBRepositoryBackup._didLogout) {
                  return;
                }
                await store.put(
                  JSONCyclicalEncoder.serialize(c) as EncodedCommit,
                );
                ++result;
              }
            } catch (e) {
              this._backupTimer.reset();
              log({
                severity: 'ERROR',
                error: 'BackupWriteFailed',
                message: e.message,
                trace: e.stack,
                repo: this.dbName,
                commit: c.id,
              });
              throw e;
            }
          })(),
        );
      }
      for (const p of promises) {
        await p;
      }
      await txn.done;
      // db.close();
      return result;
    });
  }

  loadCommits(): Promise<Commit[]> {
    // debugger;
    return SerialScheduler.get(`idb:${this.dbName}`).run(async () => {
      try {
        const startTime = performance.now();
        const db = await this.open();
        const txn = db.transaction('commits', 'readonly');
        const result = ((await txn.store.getAll()) || []).map(
          (json) =>
            new Commit({
              decoder: new JSONCyclicalDecoder(json),
            }),
        );
        // db.close();
        console.log(
          `Loading from IDB Backup took ${
            performance.now() - startTime
          }ms for ${this.dbName}`,
        );
        return result || [];
      } catch (err: unknown) {
        console.log('IDB error: ' + err);
        return [];
      }
    });
  }
}
