/*eslint require-await: "error"*/
/**
 * This file implements an ACID layer on top of a primitive CRUD storage.
 * The current implementation guarantees serializability by applying [Strong
 * Strict Two-Phase Locking protocol]{@link https://en.wikipedia.org/wiki/Two-phase_locking#Strong_strict_two-phase_locking}.
 *
 * Primitive CRUD Storage Assumptions:
 * -----------------------------------
 *
 * - A CP system as defined by CAP
 *
 * - Linearizable at the row level
 *
 * - Has a known expected latency (for timeouts calibration)
 *
 * - Can be partially available: some rows may be available while others aren't
 *
 *
 * Background:
 * -----------
 *
 * In the context of collaborative editing, we assume a very low number of
 * concurrent writers (if any). Typically we'll have a single writer at most,
 * with multiple concurrent readers. Therefore, we implement a simple lock
 * mechanism rather then a classic read/write lock. This allows us to
 * dramatically reduce the number of DB ops per transaction, which is good for
 * latency, our wallet, and DevOps.
 *
 * By making the diff-sync mechanism aware of the lock implementation, we're
 * actually able to sometimes bypass the lock entirely for sync loops that do
 * only reads (the common case).
 *
 * Algorithm:
 * ----------
 *
 * Writer
 * ------
 *
 * 1. Atomically create a row to hold the transaction data, that includes:
 *    { expiration: <future timestamp>, status: "New" }. Failure will result in
 *    a timeout for the caller.
 *
 * 2. Lock individual rows under this transaction. This is done by applying CAS
 *    on the `txn` column of the row, and setting it to the transaction row's
 *    key. A lock can be taken if, and only if, the `txn` column of the row is
 *    empty (otherwise the row is already locked by a concurrent transaction).
 *
 *    If the lock can't be obtained after {@link TIMEOUT_LOCK_MS}, the writer
 *    will back off and abort the transaction. If contention becomes too high,
 *    some or all transactions affecting the same keys won't be able to make
 *    any progress. This will directly translate to resources being momentarily
 *    to clients, triggering their offline mode (yay for offline mode).
 *
 *    Writers will typically issue lock requests in parallel to speed up the
 *    duration of the entire transaction.
 *
 * 3. Finalize the transaction by either committing or aborting it.
 *
 * 3.1. Commit: Try to atomically set the txn's status from New to Commit.
 *              Also include the txn's results as new columns, in a single
 *              atomic CAS operation. This effectively creates an atomic write
 *              ahead entry.
 *
 *              Note: Only the original creator of a transaction will ever
 *                    attempt to transition to Commit status. Any parallel
 *                    updates are guaranteed to only try to Abort.
 *
 * 3.2. Abort:  Try to atomically set the txn's status from New to Abort.
 *              Failure means a parallel recovery process is trying to abort
 *              this txn. In this case the client continues as normal, trying
 *              to complete steps 4 and 5. Aborting is idempotent.
 *
 *    Timeout
 *
 * 4. Unlock data rows and apply txn results as a single atomic action.
 *    Both Abort and Commit try to clear the the row's txn column if it still
 *    equals to the current transaction key. Commit also updates all modified
 *    columns in this single CAS operation.
 *
 *    CAS failure means the row has already been unlocked by a concurrent Abort.
 *    We can safely move on and continue the cleanup procedure.
 *
 * 5. Delete the transaction row after confirming all data rows have been
 *    properly updated. Failure to delete means the backend is unavailable.
 *
 *
 * Reader
 * ------
 *
 * 1. Read a row's contents.
 *
 * 2. If txn column is empty, return contents as the row is currently not being
 *    held by any transaction.
 *
 * 3. If txn column is not empty, this means the row is locked.
 *
 * 3.1. Consistent Read: The reader will read the txn's row and wait until its
 *                       expiration date. While waiting, the reader will
 *                       periodically sample the data row and check if the
 *                       transaction had released its lock or if expiration had
 *                       passed.
 *
 * 3.2. Stale Read:      Check if txn had expired in the background. Return the
 *                       row data immediately to the caller.
 *
 * 4. If the txn's expiration had passed, begin recovery for the data row.
 *
 *
 * Recovery
 * --------
 *
 * A writer is essentially a state machine that can only move from one step to
 * the following in order (1 -> 2 -> 3 -> 4 -> 5). A writer may fail after any
 * of the steps above, and each failure point (4 points in total) requires
 * different recovery steps.
 *
 * After 1
 * -------
 *
 * The txn row was created but no locks were obtained. No harm done, but we're
 * left with a garbage row. Some later GC will take care of it.
 *
 * Note that the GC must verify no locks are being held by this txn before it
 * can safely delete the txn row. In practice, storage is cheap enough that we
 * are not doing any GC at the time of this writing.
 *
 * A simple but effective GC implementation would be to connect BigTable with
 * BigQuery, find appropriate transactions, abort them if needed, then delete
 * their rows. Run this process once every few months or so if/when buildup
 * begins to be meaningful.
 *
 * After 2
 * -------
 *
 * Some locks where taken but the transaction wasn't finalized. The reader will
 * try to atomically transition the txn from New to Abort status. Upon success
 * it'll atomically unlock its data row. Failure at any of these steps means
 * some concurrent activity is happening.
 *
 * Note that the reader does not delete the txn row, nor does it release any
 * other data rows. Eventual readers of other data rows will follow the same
 * procedure, and lazily cleared their respective rows. The txn row itself will
 * eventually be deleted by a GC for step 1.
 *
 * A late writer or a concurrent recovery may also disrupt our reader, and try
 * to mutate the txn or data rows concurrently. Upon detecting any concurrent
 * activity on either the txn or the data row, the reader will back off and
 * retry the entire GET flow from its start.
 *
 * After 3:
 * --------
 *
 * The transaction has been successfully finalized with either Commit or Abort
 * status, but data rows remain locked. The reader will read the txn row for
 * the desired result, and atomically try to unlock the data row with a single
 * CAS operation. Basically, repeat step 4 of Writer only for this row.
 *
 * On CAS failure the reader will restart the entire GET flow.
 *
 * After 4:
 * --------
 *
 * Txn has successfully finalized and released all its locks, but the txn row
 * remains. This is identical to failure after step 1, and will be handled by
 * a future GC pass in the same way.
 */
import Utils, { EnvVars, assert } from '@ovvio/base/lib/utils';
import {
  RowData,
  CRUD,
  ScanningCRUD,
  UpdateResult,
  isUpdateSuccessful,
  UpdateRequest,
  GetOptions,
  ScanCallback,
  ScanOptions,
  ScanPrefixCallback,
  SizeEstimate,
} from './crud';
import { NoRetry, retry, TryAgain } from '@ovvio/base/lib/utils/time';
import * as ServerError from '../errors';
import { JSONObject } from '@ovvio/base/lib/utils/interfaces';
import { notReached } from '@ovvio/base/lib/utils/error';
import { Logger } from '@ovvio/base';

const TIMEOUT_SCALE = EnvVars.getInt('CFDS_ACID_TIMEOUT_SCALE', 1)!;

const TIMEOUT_LOCK_MS = 500 * TIMEOUT_SCALE;
const TIMEOUT_READ_MS = 500 * TIMEOUT_SCALE;
const TIMEOUT_INIT_MS = 150 * TIMEOUT_SCALE;
const TIMEOUT_COMMIT_MS = 50 * TIMEOUT_SCALE;
const TIMEOUT_UPDATE_MS = 100 * TIMEOUT_SCALE;

const TIMEOUT_TXN_MS = 1000 * TIMEOUT_SCALE; // 1 sec
const TIMEOUT_RETRY_TXN_MS = 10000 * TIMEOUT_SCALE; // 10 sec

const TRAN_EXPECTED_MULTI = Utils.EnvVars.getInt(
  'ACID_STORE_TRAN_EXPECTED_MULTI',
  2
)!;

const ROW_COL_TXN = '__txn';
const ROW_COL_VERSION = '__ver';

const TXN_COL_EXPIRATION = 'expiration';
const TXN_COL_STATUS = 'status';
const TXN_COL_KEY_PREFIX = 'k_';

const TXN_KEY_SUFFIX = '_txn';

const debugLog = (message: string, extra?: any) => {}; //logger.debug(message, extra);

enum TxnStatus {
  /**
   * The transaction have yet to be initialized (no txn row exists).
   * No changes have been made to the storage at this stage.
   *
   * Persistence: Writer, In mem
   */
  Init = 'init',

  /**
   * The transaction has been successfully initialized and is waiting to be
   * committed or aborted.
   *
   * Note: This status is local to the caller's process and may not reflect the
   * actual status of the transaction in the overall system.
   */
  New = 'new',

  /**
   * The transaction has been aborted.
   */
  Abort = 'abort',

  /**
   * The transaction has been successfully committed.
   */
  Commit = 'commit',
}

enum TxnRowStatus {
  /**
   * Row is locked, but no other information is available about it
   */
  Locked = 'locked',
  /**
   * Row is locked, and its content have been successfully read.
   */
  Read = 'read',

  /**
   * Row is locked and its contents have been updated. A commit operation will
   * replace the row contents with the updated contents from the txn's WAL.
   */
  Replaced = 'replaced',
  /**
   * Row is locked and marked for deletion. A commit operation will delete this
   * row upon unlocking it.
   */
  Deleted = 'deleted',
  /**
   * Row is unlocked. No further actions can be taken with it, and it can be
   * safely discarded.
   */
  Unlocked = 'unlocked',
}

interface EncodedRowState extends JSONObject {
  s: TxnRowStatus;
  d?: RowData;
}

/**
 * This class encapsulates the state/view of a single row within a single
 * transaction. It also handles all row-level operations to the underlying
 * storage.
 *
 * Creating a row state instance can be done either by calling lock() or
 * decode(). This class can't be initialized directly.
 */
class TxnRowState {
  // Data always has ROW_COL_VERSION and ROW_COL_TXN
  private _data?: RowData;
  private _status: TxnRowStatus;
  /**
   * Row is locked and transient. It should not exist, and acts only as a
   * placeholder so no concurrent writers can read/modify it.
   * Transient rows have a single txn column and no other columns. If no writes
   * are performed to this row during the txn (causing it to be "created"),
   * it'll be deleted upon commit/abort.
   */
  private _transient: boolean = true;

  /**
   * Lock a given row and include it in a transaction.
   *
   * @param txnKey The transaction's key.
   *
   * @param dataRowKey The row to acquire the lock for.
   *
   * @param storage The underlying storage.
   *
   * @throws Conflict if the row is already locked by a different txn
   */
  static async lock(
    acidStorage: ACIDStore,
    txnKey: string,
    dataRowKey: string
  ): Promise<TxnRowState> {
    const storage = acidStorage.storage;
    const result = await retry<Promise<UpdateResult>>(async () => {
      // Try to acquire a lock on our data row
      const r = await storage.update(dataRowKey, {
        checkColumns: { [ROW_COL_TXN]: '' },
        setColumns: { [ROW_COL_TXN]: txnKey },
        createRow: true,
      });
      debugLog(`Txn ${txnKey} try lock ${dataRowKey}: ${r}`);
      if (isUpdateSuccessful(r)) {
        return r;
      }
      // Condition fail is the only valid result at this point. Try to release
      // this row and try again
      if (r === UpdateResult.ConditionFail) {
        const rowData = await storage.get(dataRowKey, {
          columns: [ROW_COL_TXN],
          consistent: false,
        });
        if (rowData === undefined) {
          const created = await storage.create(dataRowKey, {
            [ROW_COL_TXN]: txnKey,
          });
          debugLog(`Txn ${txnKey} try lock created ${dataRowKey}: ${created}`);
          if (created) {
            return UpdateResult.Created;
          }
        } else {
          debugLog(
            `Txn ${txnKey} lock conflict 2 on ${dataRowKey}: ${Utils.prettyJSON(
              rowData
            )}`
          );
        }
        // If the row still appears to be locked under a different txn, try to
        // release it
        if (
          rowData &&
          rowData[ROW_COL_TXN] &&
          rowData[ROW_COL_TXN] !== txnKey
        ) {
          await releaseRowOrThrow(
            acidStorage,
            rowData[ROW_COL_TXN],
            dataRowKey
          );
        }
        // Successfully unlocked our data row. Try again immediately without
        // waiting.
        throw new TryAgain(ServerError.txnConflict(txnKey, dataRowKey));
      }
      notReached(
        `Unexpected update result when locking "${r}" for txn "${dataRowKey}"`
      );
    }, TIMEOUT_LOCK_MS);

    assert(isUpdateSuccessful(result)); // Sanity check
    if (result === UpdateResult.Created) {
      // Fake initial values for transient rows, so other code can assume these
      // values always exist
      return new this(
        acidStorage,
        txnKey,
        dataRowKey,
        TxnRowStatus.Read,
        {
          [ROW_COL_VERSION]: '0',
          [ROW_COL_TXN]: txnKey,
        },
        true
      );
    } else {
      return new this(acidStorage, txnKey, dataRowKey, TxnRowStatus.Locked);
    }
  }

  private constructor(
    readonly acidStore: ACIDStore,
    readonly txnKey: string,
    readonly dataRowKey: string,
    status: TxnRowStatus = TxnRowStatus.Locked,
    data?: RowData,
    transient: boolean = true
  ) {
    debugLog(`Txn ${txnKey} locked ${dataRowKey}`);
    this._status = status;
    this._data = data;
    this._transient = transient;
  }

  get status(): TxnRowStatus {
    return this._status;
  }

  async rowExists(): Promise<boolean> {
    if (this.status === TxnRowStatus.Locked) {
      await this.getData();
    }
    const status = this.status;
    return (
      status !== TxnRowStatus.Deleted &&
      (status !== TxnRowStatus.Read || !this._transient)
    );
  }

  async getData(): Promise<RowData | undefined> {
    const storage = this.acidStore.storage;
    const { txnKey, dataRowKey } = this;
    // We perform an actual read only on the first call. Later calls return
    // the cached in-mem value. This value is guaranteed to be correct for the
    // entire duration of the txn.
    if (this._status === TxnRowStatus.Locked) {
      const probablyData = await storage.get(dataRowKey);
      debugLog(`Txn ${this.txnKey} read ${this.dataRowKey}`);
      if (probablyData === undefined || probablyData[ROW_COL_TXN] !== txnKey) {
        debugLog(
          `Txn ${this.txnKey} conflict on ${dataRowKey}: data = ${
            probablyData ? Utils.prettyJSON(probablyData) : undefined
          }`
        );
        throw ServerError.txnConflict(txnKey, dataRowKey);
      }
      assert(
        probablyData !== undefined && probablyData[ROW_COL_TXN] === txnKey,
        `Inconsistency detected: "${dataRowKey}" is expected to be locked under "${txnKey}" but has lock value "${
          probablyData === undefined ? undefined : probablyData[ROW_COL_TXN]
        }"`
      );
      const data = probablyData!;
      this.setData(data, TxnRowStatus.Read);
      this._transient = isTransientData(data);
    }
    return Utils.deepCopy(this._data);
  }

  setData(data: RowData | undefined, status: TxnRowStatus) {
    // Verify that our state machine at least looks correct
    assert(
      (status === TxnRowStatus.Locked ||
        status === TxnRowStatus.Unlocked ||
        status === TxnRowStatus.Deleted) ===
        (data === undefined),
      `Status "${status}" doesn't match row data`
    );
    if (data !== undefined) {
      // Sanity check
      assert(data[ROW_COL_TXN] === this.txnKey);
      data = Utils.deepCopy<RowData>(data)!;
      // Make sure we always have a valid version
      data[ROW_COL_VERSION] = String(parseInt(data[ROW_COL_VERSION] || '1'));
    }
    this._data = data;
    this._status = status;
  }

  encode(): string {
    let obj: EncodedRowState = {
      s: this._status,
    };
    if (this._data !== undefined) {
      obj.d = this._data;
    }
    return JSON.stringify(obj);
  }

  static decode(
    storage: ACIDStore,
    txnKey: string,
    dataRowKey: string,
    encodedStr?: string
  ): TxnRowState {
    const obj: EncodedRowState = encodedStr
      ? JSON.parse(encodedStr)
      : undefined;
    return new this(
      storage,
      txnKey,
      dataRowKey,
      obj ? obj.s : TxnRowStatus.Locked,
      obj ? obj.d : undefined,
      isTransientData(obj?.d)
    );
  }

  async finalizeDataRowAndUnlock(): Promise<boolean> {
    switch (this._status) {
      case TxnRowStatus.Locked:
      case TxnRowStatus.Read:
        return await this.unlockRow();

      case TxnRowStatus.Deleted:
        return await this.deleteDataRow();

      case TxnRowStatus.Replaced:
        assert(this._data !== undefined); // Sanity check
        return await this.replaceRow();

      default:
        throw new Error(`Invalid row state: "${this.status}"`);
    }
  }

  private async deleteDataRow(): Promise<boolean> {
    const storage = this.acidStore.storage;

    const success = isUpdateSuccessful(
      await retry<Promise<UpdateResult>>(
        async () =>
          await storage.delete(this.dataRowKey, {
            [ROW_COL_TXN]: this.txnKey,
          }),
        TIMEOUT_UPDATE_MS
      )
    );
    debugLog(`Txn ${this.txnKey} deleted ${this.dataRowKey}: ${success}`);
    this.setData(undefined, TxnRowStatus.Unlocked);
    return success;
  }

  async unlockRow(): Promise<boolean> {
    // Sanity check: no double unlock
    assert(this._status !== TxnRowStatus.Unlocked);
    // If we got this far and our row was never accessed, then we must
    // forcefully read it to determine if its a real or transient row. Backing
    // stores like Bigtable don't provide this info during the locking phase.
    if (this._status === TxnRowStatus.Locked) {
      await this.getData();
    }
    if (this._transient) {
      return await this.deleteDataRow();
    }
    const storage = this.acidStore.storage;
    const result = await storage.update(this.dataRowKey, {
      checkColumns: { [ROW_COL_TXN]: this.txnKey },
      setColumns: { [ROW_COL_TXN]: '' },
      createRow: false,
    });
    if (result === UpdateResult.Updated) {
      debugLog(`Txn ${this.txnKey} unlocked ${this.dataRowKey}: ${result}`);
    }
    assert(result !== UpdateResult.Created); // Sanity check
    // Regardless if the update succeeded or failed, this row is no longer being
    // locked by our txn, effectively making this a success from the caller's
    // point of view.
    this.setData(undefined, TxnRowStatus.Unlocked);
    return true;
  }

  private async replaceRow(): Promise<boolean> {
    assert(this._status === TxnRowStatus.Replaced);
    assert(this._data !== undefined); // Sanity check
    const data = this._data!;
    assert(
      parseInt(data[ROW_COL_VERSION] || '0') > 0,
      'Missing or invalid row version'
    );
    data[ROW_COL_TXN] = '';
    const storage = this.acidStore.storage;
    const result = await storage.update(this.dataRowKey, {
      checkColumns: { [ROW_COL_TXN]: this.txnKey },
      setColumns: data,
      replaceRow: true,
      createRow: false,
    });
    if (result === UpdateResult.Updated) {
      debugLog(`Txn ${this.txnKey} replaced ${this.dataRowKey}: ${result}`);
    }
    assert(result !== UpdateResult.Created); // Sanity check
    this.setData(undefined, TxnRowStatus.Unlocked);
    return isUpdateSuccessful(result);
  }
}

function isTransientData(data?: RowData) {
  if (data) {
    return Object.keys(data).length === 1;
  }
  return true;
}

export interface IACIDTransaction extends CRUD {
  readonly status: TxnStatus;
  commit(): Promise<void>;
  abort(err?: Error): Promise<void>;
}

/**
 * Runs a serializable transaction on top an {@link ACIDStore} instance.
 */

interface TransactionOptions {
  key: string;
  startTime?: number;
  expiration: number;
}

export class Transaction implements IACIDTransaction {
  readonly key: string;
  private readonly _expiration: number;
  private readonly _startTime?: number;
  private _status: TxnStatus;
  private _rows: Map<string, Promise<TxnRowState>>;
  private _initPromise?: Promise<void>;

  constructor(readonly acidStore: ACIDStore, options: TransactionOptions) {
    this.key = options.key; // Utils.uniqueId() + TXN_KEY_SUFFIX;
    this._startTime = options.startTime; // Date.now();
    this._expiration = options.expiration; //this._startTime + timeoutMs;
    this._rows = new Map();
    this._status = TxnStatus.Init;
  }

  /**
   * Returns the status of this transaction.
   */
  get status(): TxnStatus {
    return this._status;
  }

  get isActive(): boolean {
    const status = this.status;
    return status === TxnStatus.Init || status === TxnStatus.New;
  }

  get expiration() {
    return this._expiration;
  }

  get rowsLength() {
    return this._rows.size;
  }

  async create(key: string, data: RowData): Promise<boolean> {
    if (this._status === TxnStatus.Abort) {
      throw ServerError.txnConflict(this.key, key);
    }

    assertNoInternalColumns(data);

    const state = await this.getRowState(key);
    if (await state.rowExists()) {
      return false;
    }

    const tempData: RowData = {
      [ROW_COL_VERSION]: '1',
      [ROW_COL_TXN]: this.key,
      ...data,
    };

    state.setData(tempData, TxnRowStatus.Replaced);
    return true;
  }

  async get(key: string, options?: GetOptions): Promise<RowData | undefined> {
    if (this._status === TxnStatus.Abort) {
      throw ServerError.txnConflict(this.key, key);
    }
    const state = await this.getRowState(key);
    if (!(await state.rowExists())) {
      return undefined;
    }
    const data = await state.getData();
    if (data !== undefined) {
      hideInternalColumns(data);
    }
    return data;
  }

  async update(key: string, request: UpdateRequest): Promise<UpdateResult> {
    if (this._status === TxnStatus.Abort) {
      throw ServerError.txnConflict(this.key, key);
    }
    assertNoInternalColumns(request.setColumns);
    const state = await this.getRowState(key);
    const rowExists = await state.rowExists();

    if (!rowExists && !request.createRow) {
      return UpdateResult.NotFound;
    }

    const txnKey = this.key;
    const hopefullyRowData = await state.getData();
    assert(
      hopefullyRowData !== undefined,
      `Unexpected state: row "${key}" locked by "${txnKey}" has no data`
    );
    let rowData = hopefullyRowData!;
    // Sanity check
    assert(
      rowData[ROW_COL_TXN] === txnKey,
      `Unexpected state: row "${key}" was supposed to be locked locked by "${txnKey}" but is locked by "${rowData[ROW_COL_TXN]}".`
    );

    // Check condition
    if (!checkRowColumns(rowData, request.checkColumns)) {
      return UpdateResult.ConditionFail;
    }

    // Replace row if needed
    if (request.replaceRow) {
      rowData = {
        [ROW_COL_TXN]: rowData[ROW_COL_TXN],
        [ROW_COL_VERSION]: rowData[ROW_COL_VERSION],
      };
    }

    //Remove Columns
    if (request.removeColumns) {
      for (const c of request.removeColumns) {
        delete rowData[c];
      }
    }

    // Update columns
    for (const k of Utils.keysOf(request.setColumns)) {
      rowData[k] = request.setColumns[k];
    }

    // Increment row version
    rowData[ROW_COL_VERSION] = String(
      parseInt(rowData[ROW_COL_VERSION] || '0') + 1
    );

    // "Save" this update within the view of the txn
    state.setData(rowData, TxnRowStatus.Replaced);
    return rowExists ? UpdateResult.Updated : UpdateResult.Created;
  }

  async delete(key: string, checkColumns?: RowData): Promise<UpdateResult> {
    if (this._status === TxnStatus.Abort) {
      throw ServerError.txnConflict(this.key, key);
    }
    const state = await this.getRowState(key);

    if (!(await state.rowExists())) {
      return UpdateResult.NotFound;
    }

    if (checkColumns && !checkRowColumns(await state.getData(), checkColumns)) {
      return UpdateResult.ConditionFail;
    }

    state.setData(undefined, TxnRowStatus.Deleted);
    return UpdateResult.Updated;
  }

  scanPrefix(keyPrefix: string, callback: ScanPrefixCallback): Promise<void> {
    if (this._status === TxnStatus.Abort) {
      throw ServerError.txnConflict(this.key, keyPrefix + '/*');
    }
    //TODO: need full impl
    return this.acidStore.scanPrefix(keyPrefix, callback);
  }

  /**
   * Aborts this transaction, discarding all applied changes.
   */
  async abort(err?: Error): Promise<void> {
    // This method is a NOP if this txn has already been decided
    if (this._status !== TxnStatus.New) {
      return;
    }
    // Update the txn state atomically. This method throws if the backend is
    // unavailable
    const storage = this.acidStore.storage;
    const result = await retry(
      () =>
        storage.update(this.key, {
          setColumns: { [TXN_COL_STATUS]: TxnStatus.Abort },
          checkColumns: { [TXN_COL_STATUS]: TxnStatus.New },
          createRow: false,
        }),
      TIMEOUT_COMMIT_MS
    );
    assert(result !== UpdateResult.Created); // Sanity check
    // Condition fail can mean one of two scenarios:
    //
    // 1. Someone already aborted this transaction concurrently. No special
    //    handling is required.
    //
    // 2. A previous commit sent by this writer was accepted by our backing
    //    store, but a network error caused us to miss the accept ack. If we
    //    blindly proceed with the abort procedure, we will corrupt the data
    //    rows. To avoid that, we first read the txn row and verify its status.
    if (result === UpdateResult.ConditionFail) {
      const txnRow = await retry(
        () => storage.get(this.key, { columns: [TXN_COL_STATUS] }),
        TIMEOUT_READ_MS
      );
      if (txnRow !== undefined && txnRow[TXN_COL_STATUS] === TxnStatus.Commit) {
        this._status = TxnStatus.Commit;
        await this.propagateCommitResults();
        return;
      }
    }
    // Set our local status regardless if we've actually succeeded to write it.
    // This prevents any future local ops, while letting a future recovery
    // process clean up any mess left over by this txn.
    this._status = TxnStatus.Abort;

    debugLog(`Txn ${this.key} aborted`);

    // No one but us (the writer) has the full knowledge of all affected rows,
    // so we try to play nice and unlock all rows.
    await this.unlockAllRows();

    if (err !== undefined) {
      throw new NoRetry(err);
    }
  }

  /**
   * Atomically commit all edits applied by this transaction, and release all
   * locks.
   */
  async commit(): Promise<void> {
    const txnStatus = this._status;
    // Skip any storage ops if we're a NOP
    if (txnStatus === TxnStatus.Init) {
      this._status = TxnStatus.Commit;
      return;
    }

    // Throw if already aborted
    if (txnStatus === TxnStatus.Abort) {
      throw ServerError.txnConflict(this.key, this.key);
    }

    // Fail this transaction if its running really late. This allows us to
    // create partial global order between different parties in our system.
    const startTime = this._startTime;
    if (startTime !== undefined) {
      const expectedDuration = this._expiration - startTime;
      if (Date.now() - startTime > TRAN_EXPECTED_MULTI * expectedDuration) {
        throw ServerError.timeout();
      }
    }

    // Build an updated list of columns for our transaction row. This includes
    // Status -> Commit,
    // k_Key1 -> TxnRowState,
    // ...
    // k_KeyN -> TxnRowState
    const wal: RowData = {
      [TXN_COL_STATUS]: TxnStatus.Commit,
    };
    for (const [key, state] of this._rows) {
      wal[TXN_COL_KEY_PREFIX + key] = (await state).encode();
    }

    // Atomically write the new data to the transaction row if the status is
    // still New.
    const storage = this.acidStore.storage;
    const result = await retry<Promise<UpdateResult>>(
      () =>
        storage.update(this.key, {
          setColumns: wal,
          checkColumns: { [TXN_COL_STATUS]: TxnStatus.New },
          createRow: false, // Sanity check
        }),
      TIMEOUT_COMMIT_MS
    );

    if (isUpdateSuccessful(result)) {
      this._status = TxnStatus.Commit;
      debugLog(`Txn ${this.key} committed`);
      // Propagate results to affected rows. This process is effectively an
      // idempotent GC step and can safely be run in background. The caller is
      // able to continue doing other things while results propagate.
      await this.propagateCommitResults();
      return;
    }

    // Failure means a concurrent process aborted this transaction
    await this.abort(ServerError.txnConflict(this.key, this.key));
  }

  /**
   * Initialize the transaction by creating its backing row.
   */
  private async init(): Promise<void> {
    if (this._status !== TxnStatus.Init) {
      assert(
        this._status === TxnStatus.New,
        "Attempting to touch a finalized transaction. Don't do that."
      );
      return;
    }
    const storage = this.acidStore.storage;
    const txnKey = this.key;
    const success = await retry(
      () =>
        storage.create(txnKey, {
          [TXN_COL_STATUS]: TxnStatus.New,
          [TXN_COL_EXPIRATION]: String(this._expiration),
        }),
      TIMEOUT_INIT_MS
    );
    // Sanity check
    assert(success, 'Attempting to double init a transaction');
    this._status = TxnStatus.New;
    debugLog(`Txn ${this.key} initialized`);
  }

  async cleanup(): Promise<void> {
    if (this._status === TxnStatus.Init) {
      //nothing to do;
      return;
    }

    if (this._status === TxnStatus.New) {
      return await this.abort();
    }

    if (this._status === TxnStatus.Abort) {
      return await this.unlockAllRows();
    }

    assert(this._status === TxnStatus.Commit); // Sanity check
    return await this.propagateCommitResults();
  }

  /**
   * Returns a @see TxnRowState instance that manages the given key within this
   * transaction.
   *
   * @param key The row key.
   */
  private async getRowState(key: string): Promise<TxnRowState> {
    // Lazily initialize this txn on first access to a row
    if (!this._initPromise) {
      this._initPromise = this.init();
    }
    await this._initPromise;
    const rows = this._rows;
    if (rows.has(key)) {
      return await rows.get(key)!;
    }
    try {
      // Try to acquire a lock on the desired data row
      const state = TxnRowState.lock(this.acidStore, this.key, key);
      rows.set(key, state);
      return await state;
    } catch (e) {
      rows.delete(key);
      debugLog(`Txn ${this.key} Failed locking row ${key}': ${e}`);
      // Failed to acquire the lock. Abort this txn and propagate the error up.
      // await this.abort()
      throw e;
    }
  }

  private async finalizeDataRows(
    func: (state: TxnRowState) => Promise<boolean>
  ): Promise<void> {
    assert(
      this._status === TxnStatus.Commit || this._status === TxnStatus.Abort
    ); // Sanity check
    const promises: Promise<any>[] = [];
    for (const state of this._rows.values()) {
      // Try commit all rows in parallel
      promises.push(func(await state));
    }
    for (const res of (await Utils.awaitPromises<boolean>(promises, true))!) {
      if (res.status !== 'success') {
        return;
      }
    }
    // If we got this far it means we've successfully committed all changes and
    // can safely delete this txn
    await this.acidStore.storage.delete(this.key);
  }

  /**
   * Propagates commit results to all affected keys
   */
  private async propagateCommitResults(): Promise<void> {
    assert(this._status === TxnStatus.Commit); // Sanity check
    await this.finalizeDataRows(row => row.finalizeDataRowAndUnlock());
  }

  private async unlockAllRows(): Promise<void> {
    await this.finalizeDataRows(row => row.unlockRow());
  }

  static fromRowData(acidStore: ACIDStore, tranKey: string, data: RowData) {
    const tran = new Transaction(acidStore, {
      key: tranKey,
      expiration: parseFloat(data[TXN_COL_EXPIRATION] || '0'),
    });

    tran._status = data[TXN_COL_STATUS] as TxnStatus;

    for (const key in data) {
      if (key.startsWith(TXN_COL_KEY_PREFIX)) {
        const dataRowKey = key.substring(TXN_COL_KEY_PREFIX.length);

        const state = TxnRowState.decode(
          acidStore,
          tranKey,
          dataRowKey,
          data[key]
        );

        tran._rows.set(state.dataRowKey, Promise.resolve(state));
      }
    }

    return tran;
  }
}

/**
 * ACID capabilities layered on top a primitive CRUD storage, that guarantee
 * serializability. See comment at the top of this file.
 *
 * This class is intended to be used with a @see {@link Transaction} instance.
 * Any single mutation ops (create/update/delete) are implicit transactions, so
 * they gain no performance advantage over manually creating a transaction.
 *
 * Note that get() does bypass the transaction mechanism and is a lighter weight
 * op than a readonly transaction. It also allows inconsistent reads if cases
 * that *really* need it (diff-sync).
 */
export class ACIDStore implements ScanningCRUD {
  constructor(readonly storage: ScanningCRUD) {}

  getSizeEstimate(): Promise<SizeEstimate> {
    return this.storage.getSizeEstimate();
  }

  async create(key: string, data: RowData): Promise<boolean> {
    return await runTransaction(this, txn => txn.create(key, data));
  }

  async get(key: string, options?: GetOptions): Promise<RowData | undefined> {
    const storage = this.storage;
    const consistent: boolean = !options || options.consistent !== false;
    let columns: string[] | undefined;
    // We must ensure that we read the TXN and VERSION columns of our row
    if (options && options.columns) {
      const cols = new Set(options.columns);
      cols.add(ROW_COL_TXN);
      cols.add(ROW_COL_VERSION);
      columns = Array.from(cols);
    }

    return await retry(async () => {
      const ops = columns ? { columns: columns } : undefined;
      const maybeData = await storage.get(key, ops);
      // Row doesn't exist. Nothing to see here folks.
      if (maybeData === undefined) {
        return undefined;
      }
      const data: RowData = maybeData!;
      const txnKey = data[ROW_COL_TXN];
      // Try to gracefully unlock our row if its being held by an expired txn
      if (txnKey) {
        if (consistent) {
          throw (await releaseRowOrThrow(this, txnKey, key))
            ? new TryAgain(ServerError.txnConflict(txnKey, key))
            : ServerError.conflict();
        } else {
          // Quiet release attempt. return what you have
          releaseRowOrThrow(this, txnKey, key).catch(err => {
            Logger.warn(
              'Inconsistent get quiet releaseRowOrThrow returned an error',
              undefined,
              err
            );
          });
        }
      }
      // Row is unlocked. Hide the txn column from external clients
      hideInternalColumns(data);

      if (Object.keys(data).length === 0) {
        // Nothing but transaction column
        return undefined;
      }

      return data;
    }, TIMEOUT_READ_MS);
  }

  async update(key: string, request: UpdateRequest): Promise<UpdateResult> {
    return await runTransaction(this, txn => txn.update(key, request));
  }

  async delete(key: string, checkColumns?: RowData): Promise<UpdateResult> {
    return await runTransaction(this, txn => txn.delete(key, checkColumns));
  }

  scanPrefix(
    keyPrefix: string,
    callback: ScanPrefixCallback,
    options?: GetOptions
  ): Promise<void> {
    const consistent = options === undefined || options.consistent !== false;
    return this.storage.scanPrefix(keyPrefix, async (key, data) => {
      const txnKey = data[ROW_COL_TXN];
      // Row is unlocked. Hide the txn column from external clients
      if (!txnKey || !consistent) {
        hideInternalColumns(data);
        return await callback(key, data);
      }
      // Try to gracefully unlock our row if its being held by an expired txn
      const rowData = await this.get(key, options);
      if (!rowData) {
        return;
      }
      return await callback(key, rowData);
    });
  }

  scan(
    callback: ScanCallback,
    options?: ScanOptions
  ): Promise<string | undefined> {
    const consistent = options === undefined || options.consistent !== false;
    return this.storage.scan(async rows => {
      const retRows: [string, RowData][] = [];

      for (const [key, row] of rows) {
        const txnKey = row[ROW_COL_TXN];
        // Row is unlocked. Hide the txn column from external clients
        if (!txnKey || !consistent) {
          hideInternalColumns(row);
          retRows.push([key, row]);
        }
        // Try to gracefully unlock our row if its being held by an expired txn
        const rowData = await this.get(key, options);
        if (rowData) {
          retRows.push([key, rowData]);
        }
      }

      return callback(retRows);
    }, options);
  }
}

/**
 * Run a function as a single atomic transaction.
 *
 * @param acidStore The storage instance to run the transaction on.
 *
 * @param f The function to execute. An implicit commit is assumed if the
 *          function hadn't explicitly aborted the transaction.
 *
 * @param timeoutMs A hard timeout for this transaction. Use the default value
 *                  unless you have a really good reason not to. Transactions
 *                  with too long timeouts will degrade the overall system
 *                  availability.
 *                  TODO(ofri,dor): Calibrate the default value.
 *
 * @throws Conflict / Timeout / Service Unavailable / Anything thrown by `f`.
 */
export async function runTransaction<T>(
  acidStore: ACIDStore,
  f: (txn: Transaction) => Promise<T>,
  txnTimeoutMs: number = TIMEOUT_TXN_MS,
  retryTimeoutMs: number = TIMEOUT_RETRY_TXN_MS
): Promise<T> {
  return await retry(async () => {
    const startTime = Date.now();

    const txn = new Transaction(acidStore, {
      key: Utils.uniqueId() + TXN_KEY_SUFFIX,
      startTime,
      expiration: startTime + txnTimeoutMs,
    });
    try {
      const result = await f(txn);
      if (txn.status === TxnStatus.New || txn.status === TxnStatus.Init) {
        await txn.commit();
      }
      return result;
    } catch (e) {
      if (txn.status === TxnStatus.Abort || txn.status === TxnStatus.Commit) {
        if (e instanceof NoRetry) {
          throw e;
        } else {
          throw new NoRetry(e);
        }
      }
      throw e;
    } finally {
      // Run any needed cleanups, NOP if already committed.
      await txn.abort();
    }
  }, retryTimeoutMs);
}

function checkRowColumns(
  rowData: RowData | undefined,
  checkColumns: RowData | undefined
): boolean {
  if (checkColumns !== undefined) {
    if (rowData === undefined) {
      return false;
    }
    for (const key of Utils.keysOf(checkColumns)) {
      if (rowData[key] !== checkColumns[key]) {
        return false;
      }
    }
  }
  return true;
}

// This function assumes dataRow was seen as locked under this txn by the caller
export async function releaseRowOrThrow(
  acidStore: ACIDStore,
  txnKey: string,
  dataRowKey: string,
  abortIfNeeded = true
): Promise<boolean> {
  const storage = acidStore.storage;
  // Read the txn row
  let txnData = await storage.get(txnKey, {
    columns: [
      TXN_COL_STATUS,
      TXN_COL_EXPIRATION,
      TXN_COL_KEY_PREFIX + dataRowKey,
    ],
  });

  // ==== !! WARNING !! DANGER !! ====
  // If the txn row doesn't exist then a concurrent writer had probably cleaned
  // up after itself. In case of a bug this is a potential infinite loop.
  if (txnData === undefined) {
    debugLog(
      `Txn ${txnKey} holding ${dataRowKey} appears to have been cleaned`
    );
    // continue as the tran is aborted
    txnData = {
      [TXN_COL_EXPIRATION]: '0',
      [TXN_COL_STATUS]: TxnStatus.Abort,
    };
  }
  // ==== !! WARNING !! DANGER !! ====

  // Call a conflict if the txn is still marked as active. The caller will have
  // to try again at a later time.
  const expirationTs = parseFloat(txnData[TXN_COL_EXPIRATION] || '0');
  const now = Date.now();
  if (expirationTs > now) {
    debugLog(
      `Conflict. Needs to wait ${(expirationTs - now) / 1000}sec for ${txnKey}`
    );
    throw ServerError.txnConflict(txnKey, dataRowKey);
  }
  // This txn has expired. Try to abort it if it looks like it crashed.
  if (txnData[TXN_COL_STATUS] === TxnStatus.New) {
    if (!abortIfNeeded) {
      debugLog(
        `Conflict. transaction: ${txnKey} is in "new" status and will not be aborted`
      );
      return false;
    }
    const updateResult = await storage.update(txnKey, {
      checkColumns: { [TXN_COL_STATUS]: TxnStatus.New },
      setColumns: { [TXN_COL_STATUS]: TxnStatus.Abort },
      createRow: false,
    });
    // Sanity check: explicitly requested createRow: false
    assert(updateResult !== UpdateResult.Created);
    assert(
      updateResult !== UpdateResult.NotFound,
      `Inconsistency detected: missing txn row "${txnKey}" holding "${dataRowKey}"`
    );

    // If our update failed, it means there's some concurrent activity on this
    // txn. Call a conflict and let the caller try again later.
    if (updateResult !== UpdateResult.Updated) {
      // const testData = await storage.get(txnKey);
      // If we got this far then updateResult === UpdateResult.ConditionFail,
      // meaning a concurrent actor is modifying this txn. In this case we
      // throw and let the caller retry everything from the start.
      throw ServerError.txnConflict(txnKey, dataRowKey);
    }
    // Successfully aborted this txn
    txnData[TXN_COL_STATUS] = TxnStatus.Abort;
  }

  // Double check that our txn is finalized. If it somehow isn't, then
  // something's really broken
  const txnStatus = txnData[TXN_COL_STATUS];
  assert(
    txnStatus === TxnStatus.Abort || txnStatus === TxnStatus.Commit,
    `Unexpected txn status. Expected Abort/Commit, got "${txnStatus}"`
  );

  // Release our row
  const state = TxnRowState.decode(
    acidStore,
    txnKey,
    dataRowKey,
    txnData[TXN_COL_KEY_PREFIX + dataRowKey]
  );

  if (txnStatus === TxnStatus.Abort) {
    return state.unlockRow();
  }

  //Commit
  return state.finalizeDataRowAndUnlock();
}

function hideInternalColumns(data: RowData) {
  delete data[ROW_COL_TXN];
  delete data[ROW_COL_VERSION];
}

function assertNoInternalColumns(data: RowData) {
  for (const prop of Utils.keysOf(data)) {
    assert(
      !prop.startsWith('__'),
      `Column name: ${prop} with double underscore prefix are read only`
    );
  }
}

export function rowHasTransactionKey(data: RowData): boolean {
  const tranKey = data[ROW_COL_TXN];
  return tranKey !== undefined && tranKey !== '';
}

export function getRowTransactionKey(data: RowData): string | undefined {
  const tranKey = data[ROW_COL_TXN];
  return tranKey;
}

// export function notReached(msg: string): never {
//   const error = new Error(
//     'Oops, this code was supposed to be unreachable' + (msg ? ': ' + msg : '')
//   );
//   //logger.error('notReached', error);
//   debugger;
//   throw error;
// }
