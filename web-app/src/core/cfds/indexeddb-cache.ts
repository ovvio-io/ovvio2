import * as IDB from 'idb';
import { Record } from '@ovvio/cfds/lib/base/record';
import { Logger } from '@ovvio/base';
import { CacheEntry, ClientCache } from '@ovvio/cfds/lib/client/client-cache';
import { BaseIndexedDB, canUseIndexedDB } from '../indexed-db/base';
import { CFDS_COMP_MIN_VERSION } from '@ovvio/cfds/lib/base/defs';

const DB_NAME_PREFIX = 'records_';
const STORE_NAME = 'records';

export interface DBScheme extends IDB.DBSchema {
  [STORE_NAME]: {
    value: {
      // store.getAll() doesn't return keys so we duplicate them alongside
      // our values so we can efficiently issue a single optimized scan.
      key: string;
      json: string;
      didList: boolean;
      errorCode: number | undefined;
      depth: number | undefined;
    };
    key: string;
  };
}

interface Metadata {
  version?: number;
  didList?: boolean;
  errorCode?: number;
  isDeleted?: boolean;
  depth?: number;
}

interface StoreEntry {
  key: string;
  json?: string;
  version?: number;
  didList?: boolean;
  errorCode?: number;
  isDeleted?: boolean;
  depth?: number;
}

const PARTIAL_DB_VERSION = 11;

function getVersion() {
  const parts: string[] = CFDS_COMP_MIN_VERSION.split('.');
  parts.push(PARTIAL_DB_VERSION.toString());
  let version = parseInt(parts[0]);

  for (const v of parts.slice(1)) {
    let vStr = v === '*' || v === 'x' ? '0' : v;
    for (let i = 0; i < vStr.length; i++) {
      version *= 10;
    }
    version += parseInt(vStr);
  }

  return version;
}

const DB_VERSION = getVersion();

class IDBCache extends BaseIndexedDB<DBScheme> implements ClientCache {
  private _metadata: Map<string, Metadata>;

  constructor(userId: string) {
    super({
      name: `${DB_NAME_PREFIX}${userId}`,
      version: DB_VERSION,
      store: STORE_NAME,
      deleteOnUpgrade: true,
    });

    this._metadata = new Map();
  }

  persistError(key: string, errorCode: number): Promise<boolean> {
    return this.internalPersist(
      {
        key,
        errorCode,
      },
      'persistError',
      3
    );
  }

  persistVersion(
    key: string,
    record: Record,
    didList: boolean
  ): Promise<boolean> {
    return this.internalPersist(
      {
        key,
        record,
        didList,
      },
      'persistVersion',
      3
    );
  }

  async internalPersist(
    entry: CacheEntry,
    methodName: string,
    attempts: number
  ): Promise<boolean> {
    if (!this.isAvailable) return false;

    if (!this.checkMetadata(entry)) {
      return false;
    }

    try {
      const db = await this.ensureDBOpened();
      if (!db) return false;
      const txn = db.transaction(
        //@ts-ignore
        STORE_NAME,
        'readwrite'
      );
      const store = txn.store;
      let storyEntry: StoreEntry = await store.get(entry.key);

      if (storyEntry === undefined) {
        //Insert
        storyEntry = {
          key: entry.key,
          json: entry.record ? JSON.stringify(entry.record.toJS()) : undefined,
          version: entry.record ? entry.record.serverVersion : undefined,
          didList: entry.didList,
          errorCode: entry.errorCode,
          depth: entry.depth,
        };
      } else {
        if (!this.updateStoreEntry(storyEntry, entry)) {
          this._metadata.set(entry.key, {
            version: storyEntry.version,
            didList: storyEntry.didList,
            errorCode: storyEntry.errorCode,
            isDeleted: storyEntry.isDeleted,
            depth: storyEntry.depth,
          });
          //No need to update
          return false;
        }
      }

      await store.put(storyEntry, entry.key);

      await txn.done;

      this._metadata.set(entry.key, {
        version: entry.record?.serverVersion,
        didList: entry.didList,
        errorCode: entry.errorCode,
        depth: entry.depth,
      });

      return true;
    } catch (e) {
      if (this.handleError(e, methodName) && attempts > 1) {
        return await this.internalPersist(entry, methodName, attempts - 1);
      }
    }

    return false;
  }

  loadAll(f: (entry: CacheEntry) => void): Promise<void> {
    return this.internalLoadAll(f, 3);
  }

  async internalLoadAll(
    f: (entry: CacheEntry) => void,
    attempts: number
  ): Promise<void> {
    if (!this.isAvailable) return;

    try {
      const metaMap = this._metadata;

      const db = await this.ensureDBOpened();
      if (!db) return;

      //@ts-ignore
      // const iter = await db.transaction(STORE_NAME).store.openCursor();
      // for await (const { value } of iter) {
      // const { key, json, didList, errorCode } = value;
      const all = await db.transaction(STORE_NAME).store.getAll();
      for (const { key, json, didList, errorCode, isDeleted, depth } of all) {
        const record = json ? Record.fromJS(JSON.parse(json)) : undefined;

        metaMap.set(key, {
          version: record ? record.serverVersion : 0,
          didList,
          errorCode,
          isDeleted,
          depth,
        });

        f({
          key,
          record,
          didList,
          errorCode,
          isDeleted,
          depth,
        });
      }
    } catch (e) {
      if (this.handleError(e, 'loadAll') && attempts > 1) {
        return await this.internalLoadAll(f, attempts - 1);
      }
    }
  }

  private checkMetadata(entry: CacheEntry) {
    const data = this._metadata.get(entry.key);
    if (!data) {
      return true;
    }
    if (entry.didList !== data.didList) {
      return true;
    }
    if (entry.errorCode !== data.errorCode) {
      return true;
    }
    if (entry.depth !== data.depth) {
      return true;
    }
    if (entry.record) {
      return entry.record.serverVersion > data.version;
    }
    if (entry.isDeleted) {
      return Boolean(entry.isDeleted) !== Boolean(data.isDeleted);
    }
    return false;
  }

  private updateStoreEntry(storeEntry: StoreEntry, cacheEntry: CacheEntry) {
    let result = false;
    if (storeEntry.didList !== cacheEntry.didList) {
      storeEntry.didList = cacheEntry.didList;
      result = true;
    }

    if (storeEntry.errorCode !== cacheEntry.errorCode) {
      storeEntry.errorCode = cacheEntry.errorCode;
      result = true;
    }

    if (storeEntry.depth !== cacheEntry.depth) {
      storeEntry.depth = cacheEntry.depth;
      result = true;
    }

    if (Boolean(storeEntry.isDeleted) !== Boolean(cacheEntry.isDeleted)) {
      storeEntry.isDeleted = cacheEntry.isDeleted;
      return true;
    }

    const addRecord = storeEntry.version === undefined && cacheEntry.record;
    const updateRecord = cacheEntry.record?.serverVersion > storeEntry.version;
    const removeRecord = storeEntry.version !== undefined && !cacheEntry.record;

    if (addRecord || updateRecord || removeRecord) {
      storeEntry.json = cacheEntry.record
        ? JSON.stringify(cacheEntry.record.toJS())
        : undefined;
      storeEntry.version = cacheEntry.record?.serverVersion;
      result = true;
    }

    return result;
  }
}

export function createIDBCache(userId: string): IDBCache | undefined {
  if (!canUseIndexedDB()) {
    Logger.warn('IndexedDB is not supported. will not use caching');
    return;
  }

  Logger.debug('Index DB is support. will be used for caching');
  return new IDBCache(userId);
}
