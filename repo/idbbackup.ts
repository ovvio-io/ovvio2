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
import { kDayMs, kMinuteMs, kSecondMs } from '../base/date.ts';
import { notReached } from '../base/error.ts';
import { filterIterable } from '../base/common.ts';
import { MultiSerialScheduler } from '../base/serial-scheduler.ts';
import { slices } from '../base/array.ts';
import { getOrganizationId } from '../net/rest-api.ts';

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
  private readonly _persistedCommitIds: Set<string>;
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
    this._persistedCommitIds = new Set();
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
    return MultiSerialScheduler.get('idb-write', 3).run(() =>
      SerialScheduler.get(`idb:${this.dbName}`).run(async () => {
        const db = await this.open();
        const txn = db.transaction('commits', 'readwrite', {
          durability: 'relaxed',
        });
        const store = txn.objectStore('commits');
        const promises: Promise<void>[] = [];
        let result = 0;
        for (const chunk of slices(
          filterIterable(commits, (c) => !this._persistedCommitIds.has(c.id)),
          50,
        )) {
          for (const c of chunk) {
            if (IDBRepositoryBackup._didLogout) {
              txn.abort();
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
                    this._persistedCommitIds.add(c.id);
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
        }
        for (const p of promises) {
          await p;
        }
        if (result > 0) {
          txn.commit();
        }
        // else {
        //   txn.abort();
        // }
        await txn.done;
        // db.close();
        return result;
      }),
    );
  }

  loadCommits(repoId: string): Promise<Commit[]> {
    // debugger;
    return MultiSerialScheduler.get('idb-load').run(() =>
      SerialScheduler.get(`idb:${this.dbName}`).run(async () => {
        try {
          console.log(`Starting IDB load for ${this.dbName}...`);
          const startTime = performance.now();
          const db = await this.open();
          const txn = db.transaction('commits', 'readonly', {
            durability: 'relaxed',
          });
          const entries = (await txn.store.getAll()) || [];
          // txn.abort();
          console.log(
            `Loading from IDB Backup took ${
              performance.now() - startTime
            }ms for ${this.dbName}`,
          );
          const result: Commit[] = [];
          const [storageType, id] = Repository.parseId(repoId);
          const now = Date.now();
          for (const json of entries) {
            // if (storageType === 'events' && json.ts < now - kDayMs * 7) {
            //   continue;
            // }
            const commit = new Commit({
              decoder: new JSONCyclicalDecoder(json),
              orgId: getOrganizationId(),
            });
            this._persistedCommitIds.add(commit.id);
            result.push(commit);
          }
          // db.close();
          return result || [];
        } catch (err: unknown) {
          console.log('IDB error: ' + err);
          return [];
        }
      }),
    );
  }
}
