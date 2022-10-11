import { Utils } from '@ovvio/base';
import { Record } from '../base/record';
import { CRUD, isUpdateSuccessful, RowData } from './stores/crud';
import {
  IACIDTransaction,
  ACIDStore,
  runTransaction,
} from './stores/acid-store';
import { NoRetry } from '@ovvio/base/lib/utils/time';
import {
  RecordPath,
  getRefPrefix,
  metadataColumn,
  parseRefInfo,
  wcOf,
  versionOf,
} from './path-utils';
import { runPreHook, runPostHook } from './record-db-hooks';
import { getIndex, IndexValuesCallback, RecordIndexName } from './record-index';
import { deserializeDate, serializeDate } from '@ovvio/base/lib/utils';
import { Edit } from '../base/ds-state';
import { RouterStore, SetupFunction } from './stores/router-store';
import { conflict } from './errors';

export interface RefInfo {
  key: string;
  timestamp: number;
  namespace?: string;
}

export const COLUMN_KEY = 'key';
export const COLUMN_RECORD_KEY = 'record';
export const COLUMN_RECORD_VERSION = 'record_version';
export const COLUMN_LAST_MOD_KEY = 'last_mod';
export const COLUMN_REF_NS = 'ref_ns';
export const COLUMN_USER_ID = 'user_id';
export const COLUMN_SESSION_ID = 'session_id';
export const COLUMN_EDITS = 'edits';
export const COLUMN_WC_VERSION = 'wc-version';
export const COLUMN_SHADOW_VERSION = 'shadow-version';
export const COLUMN_VERSION_DESC = 'desc';
export const COLUMN_COMPRESSED_EDITS = 'c-edits';
export const COLUMN_COMPRESSED_BASE = 'c-base';
export const COLUMN_COMPRESSED_CFDS_VERSION = 'c-cfds-v';

export interface RecordDBOptions {
  tranTimeoutMs?: number;
  retryTimeoutMs?: number;
}

export interface ChangeContext {
  edits?: Edit[];
  wcVersion?: number;
  shadowVersion?: number;
  desc?: string;
}

export interface TransactionContext {
  userId: string;
  sessionId?: string;
}

export class RecordDB {
  private _acidStore: ACIDStore;
  private _tranRunner: ITransactionRunner;

  constructor(
    routeOrSetupFunc: RouterStore | SetupFunction,
    tranRunner: ITransactionRunner,
    readonly options: RecordDBOptions = {}
  ) {
    if (routeOrSetupFunc instanceof RouterStore) {
      this._acidStore = new ACIDStore(routeOrSetupFunc);
    } else {
      const router = new RouterStore(routeOrSetupFunc);
      this._acidStore = new ACIDStore(router);
    }

    this._tranRunner = tranRunner;
  }

  async scanDestRefs(
    key: string,
    f: (ref: RefInfo) => boolean | void
  ): Promise<void> {
    await this._acidStore.scanPrefix(
      getRefPrefix(key),
      (key, data) => {
        const ref = parseRefInfo(key, data);
        const res = f(ref);
        return res;
      },
      {
        consistent: true,
      }
    );
  }

  getMetadata(
    recordPath: RecordPath,
    mKey: string
  ): Promise<string | undefined> {
    return getMetadata(this._acidStore, recordPath, mKey);
  }

  setMetadata(
    recordPath: RecordPath,
    mKey: string,
    mValue: string
  ): Promise<void> {
    return setMetadata(this._acidStore, recordPath, mKey, mValue, false);
  }

  async getRecordWCVersion(
    key: string,
    consistent = true
  ): Promise<number | undefined> {
    const res = await this._acidStore.get(wcOf(key).path, {
      columns: [COLUMN_RECORD_VERSION],
      consistent,
    });
    if (res === undefined) return;
    return parseInt(res[COLUMN_RECORD_VERSION]);
  }

  async getRecordTime(
    rPath: RecordPath,
    consistent = true
  ): Promise<Date | undefined> {
    const res = await this._acidStore.get(rPath.path, {
      columns: [COLUMN_LAST_MOD_KEY],
      consistent,
    });
    if (res === undefined) return;
    return deserializeDate(res[COLUMN_LAST_MOD_KEY]);
  }

  async getRecordEdits(
    rPath: RecordPath,
    consistent = true
  ): Promise<Edit[] | undefined> {
    const res = await this._acidStore.get(rPath.path, {
      columns: [COLUMN_EDITS],
      consistent,
    });
    if (res === undefined) return;

    const edits = res[COLUMN_EDITS]
      ? JSON.parse(res[COLUMN_EDITS]).map((x: any) => Edit.fromJS(x))
      : undefined;

    return edits;
  }

  async getRecordWithEdits(
    rPath: RecordPath,
    consistent = true
  ): Promise<[Record | undefined, Edit[] | undefined]> {
    const res = await this._acidStore.get(rPath.path, {
      columns: [
        COLUMN_RECORD_KEY,
        COLUMN_RECORD_VERSION,
        COLUMN_EDITS,
        COLUMN_COMPRESSED_BASE,
        COLUMN_COMPRESSED_EDITS,
      ],
      consistent,
    });
    if (res === undefined) return [undefined, undefined];

    let record: Record;
    if (res[COLUMN_RECORD_KEY] !== undefined) {
      record = getRecordFromRow(res);
    } else {
      //Read from
      record = await getRecordFromCompressedRow(
        this._acidStore,
        rPath,
        res,
        consistent
      );
    }

    const edits = res[COLUMN_EDITS]
      ? JSON.parse(res[COLUMN_EDITS]).map((x: any) => Edit.fromJS(x))
      : undefined;

    return [record, edits];
  }

  async recordExists(recordPath: RecordPath): Promise<boolean> {
    return recordExists(this._acidStore, recordPath);
  }

  async getRecord(
    recordPath: RecordPath,
    consistent = true
  ): Promise<Record | undefined> {
    return getRecord(this._acidStore, recordPath, consistent);
  }

  async getIndexValue(name: RecordIndexName, ...keys: string[]) {
    const index = getIndex(name);
    if (!index) return undefined;
    return await index.getValue(this._acidStore, ...keys);
  }

  async getIndexValues(name: RecordIndexName, ...keys: string[]) {
    const index = getIndex(name);
    if (!index) return [];
    return await index.getValues(this._acidStore, ...keys);
  }

  async getIndexValuesCB(
    name: RecordIndexName,
    keys: string[],
    cb: IndexValuesCallback
  ): Promise<void> {
    const index = getIndex(name);
    if (!index) return;
    return await index.getValuesCB(this._acidStore, keys, cb);
  }

  async getIndexAllValues(name: RecordIndexName) {
    const index = getIndex(name);
    if (!index) return [];
    return await index.getAllValues(this._acidStore);
  }

  async getIndexAllValuesCB(
    name: RecordIndexName,
    cb: IndexValuesCallback
  ): Promise<void> {
    const index = getIndex(name);
    if (!index) return;
    return await index.getAllValuesCB(this._acidStore, cb);
  }

  async txn<T>(
    context: TransactionContext,
    f: (tran: RecordTransaction) => Promise<T>,
    tranTimeoutMs?: number
  ): Promise<T> {
    return await this._tranRunner<T>(
      this._acidStore,
      async tran => {
        const recTran = new RecordTransaction(tran, context);
        return await f(recTran);
      },
      tranTimeoutMs || this.options.tranTimeoutMs,
      this.options.retryTimeoutMs
    );
  }
}

export interface ITransactionRunner {
  <T>(
    storage: ACIDStore,
    f: (txn: IACIDTransaction) => Promise<T>,
    txnTimeoutMs?: number,
    retryTimeoutMs?: number
  ): Promise<T>;
}

export class RecordTransaction {
  private _transaction: IACIDTransaction;
  private _context: TransactionContext;
  private _versions: Map<string, number>;

  constructor(transaction: IACIDTransaction, context: TransactionContext) {
    this._transaction = transaction;
    this._context = context;
    this._versions = new Map<string, number>();
  }

  getMetadata(
    recordPath: RecordPath,
    mKey: string
  ): Promise<string | undefined> {
    return getMetadata(this._transaction, recordPath, mKey);
  }

  setMetadata(
    recordPath: RecordPath,
    mKey: string,
    mValue: string
  ): Promise<void> {
    return setMetadata(this._transaction, recordPath, mKey, mValue, true);
  }

  async createRecord(
    rPath: RecordPath,
    rec: Record,
    context?: ChangeContext
  ): Promise<Record> {
    try {
      rec.assertValidData();
    } catch (error) {
      throw new NoRetry(error);
    }

    const lastMod = new Date();

    const newVersion = 1;

    const clone = rec.clone();
    clone.serverVersion = newVersion;

    const rowData: RowData = {
      [COLUMN_RECORD_KEY]: JSON.stringify(clone.toJS()),
      [COLUMN_LAST_MOD_KEY]: serializeDate(lastMod).toString(),
      [COLUMN_RECORD_VERSION]: newVersion.toString(),
    };

    this.fillRecordRow(rowData, context);

    const res = await this._transaction.create(rPath.path, rowData);

    if (res) {
      await this.runPostHook(rPath, undefined, clone, lastMod, rowData);

      return clone;
    }

    throw new NoRetry(
      Error(
        `Failed to create Record for key: ${rPath.key}, path: ${rPath.path}`
      )
    );
  }

  /**
   * Creates or Replaces the record by path
   * @param rPath
   * @param rec
   */
  async replaceRecord(
    rPath: RecordPath,
    rec: Record,
    loadBefore = true,
    context?: ChangeContext
  ): Promise<Record> {
    let recordBefore: Record | undefined;
    if (loadBefore) recordBefore = await this.preUpdateRecord(rPath, false);

    try {
      rec.assertValidData();
    } catch (error) {
      throw new NoRetry(error);
    }

    return await this.postUpdateRecord(rPath, recordBefore, rec, true, context);
  }

  async recordExists(recordPath: RecordPath): Promise<boolean> {
    return recordExists(this._transaction, recordPath);
  }

  getRecord(recordPath: RecordPath): Promise<Record | undefined> {
    return getRecord(this._transaction, recordPath);
  }

  async getRecordSafe(rPath: RecordPath): Promise<Record> {
    const record = await this.getRecord(rPath);
    if (!record) {
      throw new NoRetry(
        new Error(`key: ${rPath.key} not found. getRecord Failed`)
      );
    }
    return record;
  }

  async getRecordEdits(rPath: RecordPath): Promise<Edit[] | undefined> {
    const res = await this._transaction.get(rPath.path, {
      columns: [COLUMN_EDITS],
    });
    if (res === undefined) return;

    const edits = res[COLUMN_EDITS]
      ? JSON.parse(res[COLUMN_EDITS]).map((x: any) => Edit.fromJS(x))
      : undefined;

    return edits;
  }

  async updateRecord(
    rPath: RecordPath,
    rec: Record,
    options?: {
      createIfNeeded?: boolean;
      context?: ChangeContext;
      forceUpdateIndexes?: boolean;
      checkVersion?: number;
    }
  ): Promise<Record> {
    const createIfNeeded =
      (options && options.createIfNeeded === true) || false;
    const context = options && options.context;
    const forceUpdateIndexes = options && options.forceUpdateIndexes === true;

    const recordBefore = await this.preUpdateRecord(rPath, !createIfNeeded);

    return await this.postUpdateRecord(
      rPath,
      recordBefore,
      rec,
      createIfNeeded,
      context,
      forceUpdateIndexes
    );
  }

  async rmuRecord(
    rPath: RecordPath,
    f: (record: Record) => Record,
    context?: ChangeContext
  ): Promise<Record> {
    const recordBefore = await this.preUpdateRecord(rPath, true);
    if (!recordBefore) {
      throw new NoRetry(
        new Error(`key: ${rPath.key} not found. update failed`)
      );
    }

    const newRecord = f(recordBefore.clone());

    return await this.postUpdateRecord(
      rPath,
      recordBefore,
      newRecord,
      false,
      context
    );
  }

  async rmcuRecord(
    rPath: RecordPath,
    f: (record: Record | undefined) => Record,
    context?: ChangeContext
  ): Promise<Record> {
    const recordBefore = await this.preUpdateRecord(rPath, false);

    const newRecord = f(recordBefore?.clone());

    return await this.postUpdateRecord(
      rPath,
      recordBefore,
      newRecord,
      true,
      context
    );
  }

  async deleteRecord(rPath: RecordPath) {
    const recordBefore = await this.preUpdateRecord(rPath, true);

    await this._transaction.delete(rPath.path);

    await this.runPostHook(rPath, recordBefore, undefined, undefined);
  }

  private async preUpdateRecord(
    rPath: RecordPath,
    throwOnNotFound: boolean,
    checkVersion?: number
  ): Promise<Record | undefined> {
    //Before:
    const rowBefore = await this._transaction.get(rPath.path, {
      columns: [COLUMN_RECORD_KEY, COLUMN_LAST_MOD_KEY, COLUMN_RECORD_VERSION],
    });

    if (!rowBefore) {
      if (throwOnNotFound) {
        throw new NoRetry(
          new Error(`key: ${rPath.key} not found. update failed`)
        );
      }
      return;
    }

    const recordBefore = getRecordFromRow(rowBefore);

    if (checkVersion !== undefined) {
      if (recordBefore === undefined) {
        throw new NoRetry(
          new Error(`key: ${rPath.key} not found. checkVersion failed`)
        );
      }
      if (recordBefore.serverVersion !== checkVersion) {
        throw new NoRetry(
          conflict(
            `key: ${rPath.key} found. check version mismatch: check: ${checkVersion}, actual: ${recordBefore.serverVersion}`
          )
        );
      }
    }

    if (!this._versions.has(rPath.path)) {
      this._versions.set(rPath.path, recordBefore.serverVersion);
    }

    const lastMod = rowBefore[COLUMN_LAST_MOD_KEY]
      ? Utils.deserializeDate(rowBefore[COLUMN_LAST_MOD_KEY])
      : undefined;

    await this.runPreHook(rPath, recordBefore, lastMod);

    return recordBefore;
  }

  private async postUpdateRecord(
    rPath: RecordPath,
    recordBefore: Record | undefined,
    recordAfter: Record,
    createRow: boolean,
    context?: ChangeContext,
    forceUpdateIndexes = false
  ) {
    try {
      recordAfter.assertValidData();
    } catch (error) {
      throw new NoRetry(error);
    }

    const lastMod = new Date();

    const clone = recordAfter.clone();
    clone.serverVersion = (this._versions.get(rPath.path) || 0) + 1; //Bump to next version

    const rowData = {
      [COLUMN_RECORD_KEY]: JSON.stringify(clone.toJS()),
      [COLUMN_LAST_MOD_KEY]: Utils.serializeDate(lastMod).toString(),
      [COLUMN_RECORD_VERSION]: clone.serverVersion.toString(),
    };

    this.fillRecordRow(rowData, context);

    const upResult = await this._transaction.update(rPath.path, {
      setColumns: rowData,
      createRow,
      replaceRow: false,
      removeColumns: [COLUMN_WC_VERSION], //TODO: remove this in the future
    });

    if (!isUpdateSuccessful(upResult)) {
      throw new NoRetry(new Error(`key: ${rPath.key} update/replace failed`));
    }

    await this.runPostHook(
      rPath,
      recordBefore,
      clone,
      lastMod,
      rowData,
      forceUpdateIndexes
    );

    return clone;
  }

  private fillRecordRow(rowData: RowData, changeContext?: ChangeContext) {
    rowData[COLUMN_USER_ID] = this._context.userId;
    rowData[COLUMN_SESSION_ID] = this._context.sessionId || '';

    rowData[COLUMN_EDITS] = '';
    rowData[COLUMN_SHADOW_VERSION] = '';
    rowData[COLUMN_VERSION_DESC] = '';

    if (changeContext) {
      if (changeContext.edits && changeContext.edits.length > 0) {
        rowData[COLUMN_EDITS] = JSON.stringify(
          changeContext.edits.map(e => e.toJS())
        );
      }
      if (changeContext.shadowVersion) {
        rowData[COLUMN_SHADOW_VERSION] = changeContext.shadowVersion.toString();
      }
      if (changeContext.desc) {
        rowData[COLUMN_VERSION_DESC] = changeContext.desc;
      }
    }
  }

  private runPreHook(
    rPath: RecordPath,
    record: Record,
    lastMod: Date | undefined
  ): Promise<void> {
    return runPreHook(this._transaction, rPath, record, lastMod);
  }

  private runPostHook(
    rPath: RecordPath,
    recordBefore: Record | undefined,
    recordAfter: Record | undefined,
    lastMod: Date | undefined,
    rowData?: RowData,
    forceUpdateIndexes = false
  ): Promise<void> {
    return runPostHook(
      this._transaction,
      rPath,
      recordBefore,
      recordAfter,
      lastMod,
      rowData,
      forceUpdateIndexes
    );
  }

  commit(): Promise<void> {
    return this._transaction.commit();
  }

  abort(err?: Error): Promise<void> {
    return this._transaction.abort(err);
  }
}

async function getRecord(
  crud: CRUD,
  recordPath: RecordPath,
  consistent?: boolean
): Promise<Record | undefined> {
  const res = await crud.get(recordPath.path, {
    columns: [
      COLUMN_RECORD_KEY,
      COLUMN_RECORD_VERSION,
      COLUMN_COMPRESSED_BASE,
      COLUMN_COMPRESSED_EDITS,
    ],
    consistent,
  });
  if (res === undefined) return;

  if (res[COLUMN_RECORD_KEY] !== undefined) {
    return getRecordFromRow(res);
  } else {
    //Read from
    return await getRecordFromCompressedRow(crud, recordPath, res, consistent);
  }
}

export function getRecordFromRow(rowData: RowData) {
  const versionStr = rowData[COLUMN_RECORD_VERSION] || '1';

  return Record.fromJS(
    JSON.parse(rowData[COLUMN_RECORD_KEY]),
    parseInt(versionStr)
  );
}

async function recordExists(
  crud: CRUD,
  recordPath: RecordPath
): Promise<boolean> {
  const res = await crud.get(recordPath.path, {
    columns: [COLUMN_RECORD_KEY],
  });
  if (res === undefined) return false;
  return true;
}

async function getMetadata(
  crud: CRUD,
  recordPath: RecordPath,
  mKey: string
): Promise<string | undefined> {
  const mdColumn = metadataColumn(mKey);
  const res = await crud.get(recordPath.path, {
    columns: [mdColumn],
  });

  if (res === undefined) return;
  return res[mdColumn];
}

async function setMetadata(
  crud: CRUD,
  recordPath: RecordPath,
  mKey: string,
  mValue: string,
  createRow: boolean
): Promise<void> {
  const mdColumn = metadataColumn(mKey);

  const setColumns: any = {};
  setColumns[mdColumn] = mValue;

  const result = await crud.update(recordPath.path, {
    setColumns,
    createRow,
  });

  if (isUpdateSuccessful(result)) return;

  throw new NoRetry(
    Error(`set Metadata failed for: ${recordPath}:${mKey}. Result: ${result}`)
  );
}

export function createRecordDB(
  routeOrSetupFunc: RouterStore | SetupFunction,
  options: RecordDBOptions = {}
) {
  return new RecordDB(routeOrSetupFunc, runTransaction, options);
}

async function getRecordFromCompressedRow(
  crud: CRUD,
  rPath: RecordPath,
  rowData: RowData,
  consistent?: boolean
) {
  const baseVersion = parseInt(rowData[COLUMN_COMPRESSED_BASE]);

  const baseRecord = await getRecord(
    crud,
    versionOf(rPath.key, baseVersion),
    consistent
  );
  if (baseRecord === undefined) {
    throw new Error(
      `Failed to get compressed record: ${rPath.key}:${rPath.version}, base version: ${baseVersion} not found`
    );
  }

  const cEditsStr = rowData[COLUMN_COMPRESSED_EDITS];
  const cEditsJS: any[] = JSON.parse(cEditsStr);
  const cEdits = cEditsJS.map(e => Edit.fromJS(e));

  for (const edit of cEdits) {
    Utils.assert(
      baseRecord.checksum === edit.srcChecksum,
      `getRecordFromCompressedRow srcChecksum mismatch for ${rPath.key}:${rPath.version}. rec checksum: ${baseRecord.checksum}, edit checksum; ${edit.srcChecksum}`
    );

    baseRecord.patch(edit.changes);

    Utils.assert(
      baseRecord.checksum === edit.dstChecksum,
      `getRecordFromCompressedRow dstChecksum mismatch for ${rPath.key}:${rPath.version}. rec checksum: ${baseRecord.checksum}, edit checksum; ${edit.dstChecksum}`
    );
  }

  baseRecord.serverVersion = parseInt(rowData[COLUMN_RECORD_VERSION] || '1');

  return baseRecord;
}
