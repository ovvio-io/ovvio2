import { PromiseResult } from '@ovvio/base/lib/utils';
import {
  CRUD,
  GetOptions,
  RowData,
  ScanCallback,
  UpdateRequest,
  UpdateResult,
} from './crud';

export enum Command {
  Get,
  Create,
  Update,
  Delete,
}

export class LogEntry<T> {
  response?: PromiseResult<T>;

  constructor(
    readonly cmd: Command,
    readonly key: string,
    readonly reqData: any,
    readonly result: PromiseResult<T>
  ) {}
}

export class RecordingStore implements CRUD {
  private _log: Array<LogEntry<any>> = [];
  constructor(readonly storage: CRUD) {}

  async create(key: string, data: RowData): Promise<boolean> {
    const entry = new LogEntry<boolean>(
      Command.Create,
      key,
      data,
      await createPromiseResult(this.storage.create(key, data))
    );
    this._log.push(entry);
    return getResult(entry.result);
  }

  async get(key: string, options?: GetOptions): Promise<RowData | undefined> {
    const entry = new LogEntry<RowData | undefined>(
      Command.Create,
      key,
      options,
      await createPromiseResult(this.storage.get(key, options))
    );
    this._log.push(entry);
    return getResult(entry.result);
  }

  async update(key: string, request: UpdateRequest): Promise<UpdateResult> {
    const entry = new LogEntry<UpdateResult>(
      Command.Update,
      key,
      request,
      await createPromiseResult(this.storage.update(key, request))
    );
    this._log.push(entry);
    return getResult(entry.result);
  }

  async delete(key: string, checkColumns?: RowData): Promise<UpdateResult> {
    const entry = new LogEntry<UpdateResult>(
      Command.Update,
      key,
      checkColumns,
      await createPromiseResult(this.storage.delete(key, checkColumns))
    );
    this._log.push(entry);
    return getResult(entry.result);
  }

  scanPrefix(keyPrefix: string, callback: ScanCallback): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

async function createPromiseResult<T>(
  p: Promise<T>
): Promise<PromiseResult<T>> {
  try {
    return {
      status: 'success',
      result: await p,
    };
  } catch (e) {
    return {
      status: 'error',
      error: e,
    };
  }
}

function getResult<T>(p: PromiseResult<T>): T {
  if (p.status === 'error') {
    throw p.error;
  }
  return p.result;
}
