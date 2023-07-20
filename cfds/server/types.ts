import { Utils } from '@ovvio/base';
import { Edit } from '../base/ds-state';
import { Record } from '../base/record';
import { ServerError } from './errors';

export const INCOMPATIBLE_CFDS_VERSION_CODE = 4500;

export enum RequestCommand {
  GET = 'get',
  SYNC = 'sync',
}

export class RecordRequest {
  constructor(
    public readonly key: string,
    public readonly id: number,
    public readonly cmd: RequestCommand,
    public readonly edits?: Edit[],
    public readonly cursor?: number,
    public list: boolean = false,
    public readonly version?: number,
    public readonly checksum?: string
  ) {}

  static get(key: string, id: number, version?: number, checksum?: string) {
    return new RecordRequest(
      key,
      id,
      RequestCommand.GET,
      undefined,
      undefined,
      false,
      version,
      checksum
    );
  }

  static sync(
    key: string,
    id: number,
    edits: Edit[],
    version: number,
    cursor?: number,
    checksum?: string
  ) {
    return new RecordRequest(
      key,
      id,
      RequestCommand.SYNC,
      edits,
      cursor || 0,
      false,
      version,
      checksum
    );
  }

  toJS(): any {
    switch (this.cmd) {
      case RequestCommand.GET:
        const ret: any = {
          key: this.key,
          id: this.id,
          list: this.list,
          request: {
            cmd: 'get',
          },
          checksum: this.checksum,
          version: this.version,
        };

        if (this.checksum) ret.checksum = this.checksum;
        if (this.version) ret.version = this.version;
        return ret;

      case RequestCommand.SYNC: {
        const ret: any = {
          key: this.key,
          id: this.id,
          list: this.list,
          request: {
            cmd: 'sync',
            edits: this.edits?.map(edit => edit.toJS()),
            cursor: String(this.cursor),
          },
        };
        if (this.checksum) ret.checksum = this.checksum;
        if (this.version) ret.version = this.version;

        return ret;
      }
    }
  }

  static fromJS(obj: any): RecordRequest {
    if (obj.key === undefined) {
      throw new Error('Request object must have a "key" field');
    }
    if (obj.id === undefined) {
      throw new Error('Request object must have a "id" field');
    }
    if (obj.request === undefined) {
      throw new Error('Request object must have a "request" field');
    }
    const key: string = obj.key;
    const id: number = obj.id;
    const list: boolean = Boolean(obj.list);

    const cmdKey = obj.request.cmd.toUpperCase() as keyof typeof RequestCommand;
    const cmd: RequestCommand = RequestCommand[cmdKey];

    let edits: Edit[] | undefined;
    let cursor: number | undefined;

    if (obj.request.edits) {
      edits = (<any[]>obj.request.edits).map(o => Edit.fromJS(o));
    }
    if (obj.request.cursor) {
      cursor = parseInt(obj.request.cursor);
    }

    return new RecordRequest(
      key,
      id,
      cmd,
      edits,
      cursor,
      list,
      obj.version,
      obj.checksum
    );
  }

  static cleanUnsafeToLog(obj: any) {
    if (obj) {
      delete obj.edits;
    }
    return obj;
  }
}

export interface ListResult {
  key: string;
  hotFlag: boolean;
  namespace?: string;
  version?: number;
}

export interface ListResponse {
  cursor: number;
  result: ListResult[];
}

export class RecordResponse {
  constructor(
    public readonly key: string,
    public readonly id: number,

    public readonly error?: ServerError,
    public readonly state?: {
      wc: Record;
      // shadow: Record;
    },
    public readonly edits?: Edit[],
    public readonly list?: ListResponse,
    public readonly serverVersion?: number
  ) {}

  get success(): boolean {
    return this.error === undefined;
  }

  private listToJS() {
    if (!this.list) return;
    const list: {
      cursor: string;
      result: any;
    } = {
      cursor: String(this.list.cursor),
      result: this.list.result,
    };

    return list;
  }

  toJS(): any {
    let ret: any = {
      key: this.key,
      id: this.id,
      success: this.success,
      list: this.listToJS(),
    };
    if (this.error) {
      ret.error = this.error.toJS();
    }
    if (this.state) {
      ret.state = {
        wc: this.state.wc.toJS() /*shadow: this.state.shadow.toJS()*/,
      };
    }
    if (this.edits) {
      ret.edits = this.edits.map(e => e.toJS());
    }
    if (this.serverVersion) {
      ret.sv = this.serverVersion;
    }
    return ret;
  }

  static error(key: string, id: number, error: ServerError): RecordResponse {
    return new RecordResponse(key, id, error);
  }

  static get(
    key: string,
    id: number,
    wc?: Record,
    // shadow: Record,
    list?: ListResponse
  ): RecordResponse {
    return new RecordResponse(
      key,
      id,
      undefined,
      wc
        ? {
            wc,
            //{shadow
          }
        : undefined,
      undefined,
      list
    );
  }

  static sync(
    key: string,
    id: number,
    edits: Edit[],
    serverVersion?: number,
    list?: ListResponse
  ): RecordResponse {
    return new RecordResponse(
      key,
      id,
      undefined,
      undefined,
      edits,
      list,
      serverVersion
    );
  }

  static fromJS(obj: any): RecordResponse {
    if (obj.key === undefined) {
      throw new Error('Response object must have a "key" field');
    }
    if (obj.id === undefined) {
      throw new Error('Response object must have a "id" field');
    }
    const key: string = obj.key;
    const id: number = obj.id;

    let error: ServerError | undefined;
    let state: { wc: Record /*shadow: Record*/ } | undefined;
    let edits: Edit[] | undefined;
    let list: ListResponse | undefined;

    if (obj.success) {
      if (obj.state) {
        state = {
          wc: Record.fromJS(obj.state.wc),
          // shadow: Record.fromJS(obj.state.shadow),
        };
      }

      if (obj.edits) {
        edits = obj.edits.map((e: any) => Edit.fromJS(e));
      }

      if (obj.list) {
        list = {
          cursor: parseInt(obj.list.cursor),
          result: obj.list.result || [],
        };
      }
    } else {
      error = obj.error ? ServerError.fromJS(obj.error) : undefined;
    }

    return new RecordResponse(key, id, error, state, edits, list, obj.sv);
  }
}

export class ServerRequest {
  constructor(
    readonly sessionId: string,
    readonly userId: string,
    readonly requests: RecordRequest[]
  ) {}

  toJS() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      requests: this.requests.map(r => r.toJS()),
    };
  }

  static fromJS(obj: any) {
    return new ServerRequest(
      obj.sessionId,
      obj.userId,
      obj.requests.map((r: any) => RecordRequest.fromJS(r))
    );
  }
}

export interface ServerContext {
  sessionId: string;
  userId: string;
}
