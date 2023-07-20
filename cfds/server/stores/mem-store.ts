import { Utils } from '@ovvio/base';
import {
  ScanningCRUD,
  GetOptions,
  RowData,
  ScanCallback,
  UpdateRequest,
  UpdateResult,
  ScanOptions,
  ScanPrefixCallback,
  SizeEstimate,
} from './crud';

export class MemStore implements ScanningCRUD {
  private _rows = new Map<string, RowData>();

  constructor(readonly simulateBigTable = false) {}

  async getSizeEstimate(): Promise<SizeEstimate> {
    return {
      totalRows: this._rows.size,
      totalBytes: this._rows.size,
    };
  }

  async create(key: string, data: RowData): Promise<boolean> {
    const rows = this._rows;
    if (rows.has(key)) {
      return false;
    }
    rows.set(key, data);
    return true;
  }

  async get(key: string, options?: GetOptions): Promise<RowData | undefined> {
    const rows = this._rows;
    if (!rows.has(key)) {
      return undefined;
    }

    const rowData = rows.get(key)!;
    if (options && options.columns) {
      const result: RowData = {};
      for (const k of options.columns) {
        if (rowData.hasOwnProperty(k)) {
          result[k] = rowData[k];
        }
      }
      return result;
    }

    return Utils.deepCopy(rowData);
  }

  async update(key: string, request: UpdateRequest): Promise<UpdateResult> {
    const rows = this._rows;
    const rowExists = rows.has(key);
    if (!rowExists && !request.createRow) {
      return UpdateResult.NotFound;
    }
    let rowData = rows.get(key) || {};
    if (request.checkColumns) {
      if (rowExists) {
        for (const k of Utils.keysOf(request.checkColumns)) {
          const kValue = rowData[k] || '';
          if (kValue !== request.checkColumns[k]) {
            return UpdateResult.ConditionFail;
          }
        }
      }
    }

    if (request.replaceRow) {
      rowData = {};
    }

    rowData = Object.assign(rowData, request.setColumns);
    rows.set(key, rowData);

    return rowExists || this.simulateBigTable
      ? UpdateResult.Updated
      : UpdateResult.Created;
  }

  async delete(key: string, checkColumns?: RowData): Promise<UpdateResult> {
    const rows = this._rows;
    if (rows.has(key)) {
      if (!checkRowColumns(rows.get(key), checkColumns)) {
        return UpdateResult.ConditionFail;
      }
      rows.delete(key);
      return UpdateResult.Updated;
    }
    return this.simulateBigTable
      ? UpdateResult.ConditionFail
      : UpdateResult.NotFound;
  }

  async scanPrefix(
    keyPrefix: string,
    callback: ScanPrefixCallback
  ): Promise<void> {
    const rows = this._rows;
    const keys = Array.from(rows.keys());

    const scanEntries = [];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!key.startsWith(keyPrefix)) continue;

      const data = rows.get(key);
      if (!data) continue;

      scanEntries.push({
        key,
        data,
      });
    }

    scanEntries.sort((a, b) => a.key.localeCompare(b.key));
    for (let i = 0; i < scanEntries.length; i++) {
      const element = scanEntries[i];
      const res = await callback(element.key, element.data);
      if (typeof res === 'boolean') {
        if (res) break;
      }
    }
  }

  async scan(
    callback: ScanCallback,
    options?: ScanOptions
  ): Promise<string | undefined> {
    const rows = this._rows;

    const retRows = Array.from(rows.entries());

    callback(retRows);

    return;
  }
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
