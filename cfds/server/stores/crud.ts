import { serializeDate } from '@ovvio/base/lib/utils';

export interface RowData {
  [key: string]: string;
}

export const ROW_COL_TTL = 'ttl';

export function setTTL(data: RowData, ttl: Date) {
  data[ROW_COL_TTL] = serializeDate(ttl).toString();
}

export interface GetOptions {
  /**
   * The columns to read. If undefined or an empty array, all columns will be
   * returned.
   *
   * Note that this is merely a hint. Implementations may ignore this value and
   * always return all rows.
   */
  columns?: ReadonlyArray<string>;

  /**
   * For implementations with tunable consistency, allows to turn consistent
   * reads on/off.
   *
   * Note that the actual result is implementation dependent and will have a
   * different effect on different stores.
   */
  consistent?: boolean;
}

export interface ScanPrefixCallback {
  (key: string, data: RowData): Promise<boolean | void> | void | boolean;
}

export type ScanCallback = (
  rows: [string, RowData][]
) => Promise<boolean | void> | void | boolean;

export interface ScanOptions {
  columns?: ReadonlyArray<string>;
  consistent?: boolean;
  lastKey?: string;
}

export interface UpdateRequest {
  /**
   * Columns and their new values to be written.
   */
  setColumns: RowData;

  /**
   * Columns you want to be removed
   */
  removeColumns?: string[];

  /**
   * Optional. A group of columns and their expected values. If provided, the
   * update will be performed atomically only if all values match. This turns
   * the update from a plain update to a CAS operation.
   */
  checkColumns?: RowData;

  /**
   * If true, and the row doesn't exist, then it'll be created. If false, the
   * operation will be aborted and a UpdateResult.NotFound will be returned.
   *
   * @default true
   */
  createRow?: boolean;

  /**
   * If true, columns not present in setColumns will be deleted. If false,
   * missing columns will be left unmodified.
   *
   * @default false
   */
  replaceRow?: boolean;
}

export enum UpdateResult {
  /**
   * The row has been successfully created with the requested data.
   */
  Created = 1 << 0,

  /**
   * The row has been successfully updated with the requested data.
   */
  Updated = 1 << 1,

  /**
   * Update aborted due to condition mismatch.
   */
  ConditionFail = 1 << 2,

  /**
   * Update aborted since the row does not exist.
   */
  NotFound = 1 << 3,

  /**
   * Convenience mask for checking update success.
   * @example
   * const success = (result & MaskSuccess) !== 0;
   */
  MaskSuccess = Created | Updated,
}

export function isUpdateSuccessful(res: UpdateResult): boolean {
  return (res & UpdateResult.MaskSuccess) !== 0;
}

export interface CRUD {
  /**
   * Create a new row (atomically).
   *
   * @param key The key to create.
   * @param data Initial data for the row
   *
   * @returns True on success, false if the row already exists.
   *
   * @throws Timeout if the backend is currently unavailable.
   * @throws Conflict if the row can't be read due to a concurrent activity.
   */
  create(key: string, data: RowData): Promise<boolean>;

  /**
   * Return the data for a given row.
   *
   * @param key The row's key.
   *
   * @param options Options... duh. @see {@link GetOptions}
   *
   * @throws Timeout if the backend is currently unavailable.
   * @throws Conflict if the row can't be read due to a concurrent activity.
   *
   * @returns The row data or undefined if the row doesn't exist.
   */
  get(key: string, options?: GetOptions): Promise<RowData | undefined>;

  /**
   * Atomically update some or all columns of a row.
   *
   * @param key The key of the row to update.
   *
   * @param request Request details
   *
   * @throws Timeout if service is unavailable.
   * @throws Conflict if the row can't be read due to a concurrent activity.
   */
  update(key: string, request: UpdateRequest): Promise<UpdateResult>;

  /**
   * Delete a given row.
   *
   * @param key The key to delete.
   *
   * @param checkColumns If provided, check that the specified columns match
   *                     the given values before deleting.
   *
   * @returns Updated on a successful delete, ConditionFail on condition
   * mismatch, NotFound if the row doesn't exist.
   *
   * @throws Timeout if service is unavailable.
   * @throws Conflict if the row can't be read due to a concurrent activity.
   */
  delete(key: string, checkColumns?: RowData): Promise<UpdateResult>;
}

export interface ScanningCRUD extends CRUD {
  scanPrefix(
    keyPrefix: string,
    callback: ScanPrefixCallback,
    options?: GetOptions
  ): Promise<void>;

  scan(
    callback: ScanCallback,
    options?: ScanOptions
  ): Promise<string | undefined>;

  getSizeEstimate(): Promise<SizeEstimate>;
}

export interface SizeEstimate {
  totalRows: number;
  totalBytes: number;
}

export interface Row {
  key: string;
  data: RowData;
}

export interface BulkLoadCRUD extends CRUD {
  bulkLoad(data: Row[]): Promise<Row[]>;
}
