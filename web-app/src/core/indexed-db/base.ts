import { Logger } from '@ovvio/base';
import * as IDB from 'idb';
import config from '../config';
import { openDB } from 'idb/with-async-ittr';

export interface IndexedDBOptions {
  name: string;
  version: number;
  store: string;
  deleteOnUpgrade: boolean;
}

export class BaseIndexedDB<DBScheme extends IDB.DBSchema> {
  private _options: IndexedDBOptions;
  private _isAvailable: boolean = true;

  private _isConnectionOpen: boolean = false;
  private _db?: IDB.IDBPDatabase<DBScheme>;

  constructor(options: IndexedDBOptions) {
    this._options = options;
  }

  get isAvailable() {
    return this._isAvailable;
  }

  protected runTransaction(
    f: (store: IDB.IDBPObjectStore<DBScheme, [any], any>) => Promise<void>
  ) {
    return this.internalRunTransaction(f, 3);
  }

  private async internalRunTransaction(
    f: (store: IDB.IDBPObjectStore<DBScheme, [any], any>) => Promise<void>,
    attempts: number
  ): Promise<boolean> {
    const db = await this.ensureDBOpened();
    if (!db) return false;

    const txn = db.transaction(
      //@ts-ignore
      this._options.store,
      'readwrite'
    );

    const store = txn.store;

    try {
      await f(store);
      await txn.done;

      return true;
    } catch (err) {
      if (this.handleError(err, 'runTransaction') && attempts > 1) {
        return await this.internalRunTransaction(f, attempts - 1);
      }
    }

    return false;
  }

  protected onDBUpgrade(db: IDB.IDBPDatabase<DBScheme>) {}

  protected async ensureDBOpened():
    | Promise<IDB.IDBPDatabase<DBScheme>>
    | undefined {
    if (!this._isAvailable) return;
    if (this._isConnectionOpen && this._db) {
      return this._db;
    }

    if (this._db) {
      try {
        this._db.close();
      } catch {}
    }

    try {
      this._db = await openDB<DBScheme>(
        this._options.name,
        this._options.version,
        {
          blocking: () => {
            Logger.debug(
              `Indexed-DB ${this._options.name} opening. blocking event`
            );
          },
          blocked: () => {
            Logger.debug(
              `Indexed-DB ${this._options.name} opening. blocked event`
            );
          },
          upgrade: db => {
            //@ts-ignore
            if (db.objectStoreNames.contains(this._options.store)) {
              if (this._options.deleteOnUpgrade) {
                //@ts-ignore
                db.deleteObjectStore(this._options.store);
                //@ts-ignore
                db.createObjectStore(this._options.store);
                Logger.debug(
                  `Indexed-DB ${this._options.name} Store Version: ${this._options.version} re-created!`
                );
              }
            } else {
              //@ts-ignore
              db.createObjectStore(this._options.store);
              Logger.debug(
                `Indexed-DB ${this._options.name} Version: ${this._options.version} Store created!`
              );
            }
            this.onDBUpgrade(db);
          },
          terminated: () => {
            Logger.warn(`${this._options.name} connected terminated`);
            this._isConnectionOpen = false;
          },
        }
      );

      this._isConnectionOpen = true;
      Logger.debug(`Index-DB ${this._options.name} connected!`);

      return this._db;
    } catch (err: any) {
      if (err && err.name === 'VersionError') {
        if (!config.isProduction) {
          Logger.debug(
            `Indexed-DB: ${this._options.name} got "VersionError". will deleted db`
          );

          await IDB.deleteDB(this._options.name);

          Logger.debug(`Indexed-DB: ${this._options.name} db-deleted`);
          return await this.ensureDBOpened();
        }
        this._isAvailable = false;
      }

      throw err;
    }
  }

  protected getAll(count?: number): Promise<IDB.StoreValue<DBScheme, any>[]> {
    return this.internalGetAll(count, 3);
  }

  private async internalGetAll(
    count?: number,
    attempts = 3
  ): Promise<IDB.StoreValue<DBScheme, any>[]> {
    if (!this._isAvailable) return;

    try {
      const db = await this.ensureDBOpened();
      if (!db) return;

      const all = await db
        .transaction(this._options.store as any)
        .store.getAll(undefined, count);

      return all;
    } catch (err) {
      if (this.handleError(err, 'getAll') && attempts > 1) {
        return await this.internalGetAll(count, attempts - 1);
      }
    }
  }

  protected handleError(e: Error, from: string): boolean {
    if (e.name !== 'AbortError') {
      if (checkNotAvailableError(e)) {
        Logger.warn(
          `${this._options.name}-${from}: Found Indexed-DB not available error. ${e.name}:${e.message}.`
        );
        this._isAvailable = false;
      } else if (e.name === 'InvalidStateError') {
        Logger.warn(
          `${this._options.name}-${from}: Found Indexed-DB InvalidStateError error: ${e.message}.`
        );
        this._isConnectionOpen = false;
        return true;
      } else if (e.name === 'TimeoutError') {
        Logger.warn(
          `${this._options.name}-${from}: Found Indexed-DB TimeoutError error: ${e.message}.`
        );
        return true;
      } else {
        Logger.error(`${this._options.name}-${from}: IndexedDB Error`, e);
      }
    }
    return false;
  }

  protected async getCount() {
    const db = await this.ensureDBOpened();
    if (!db) return 0;
    return await db.count(this._options.store as any);
  }
}

function checkNotAvailableError(err: any) {
  if (
    //Firefox private browsing error
    navigator.userAgent.toLowerCase().indexOf('firefox') > -1 &&
    err.name === 'InvalidStateError' &&
    err.message !== undefined &&
    err.message.includes('mutation operation')
  ) {
    return true;
  }

  return false;
}

export function canUseIndexedDB() {
  if (!('indexedDB' in window)) {
    return false;
  }
  return true;
}
