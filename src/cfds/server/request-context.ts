import logger from '@ovvio/base/lib/logger';
import Severity from '@ovvio/base/lib/logger/severity';
import { RecordDB } from './record-db';
import { RecordRequest, ServerContext } from './types';

export class RequestContext {
  private _allowDebugLog: boolean;
  private _defaultLogExtra: any;

  constructor(
    readonly recordDB: RecordDB,
    readonly request: RecordRequest,
    readonly serverContext: ServerContext,
    allowDebugLog: boolean
  ) {
    this._allowDebugLog = allowDebugLog;

    this._defaultLogExtra = {
      requestId: this.request.id,
      key: this.key,
      userId: this.serverContext.userId,
      sessionId: this.serverContext.sessionId,
      cmd: this.request.cmd,
      editsLength: this.editsLength,
      shadowVersion: this.version,
    };
  }

  get id() {
    return this.request.id;
  }

  get key() {
    return this.request.key;
  }

  get cmd() {
    return this.request.cmd;
  }

  get version() {
    return this.request.version;
  }

  get edits() {
    return this.request.edits;
  }

  get editsLength() {
    return this.request.edits?.length || 0;
  }

  get checksum() {
    return this.request.checksum;
  }

  get list() {
    return this.request.list;
  }

  get cursor() {
    return this.request.cursor;
  }

  get sessionId() {
    return this.serverContext.sessionId;
  }

  get userId() {
    return this.serverContext.userId;
  }

  debugLog(message: string, extra?: any) {
    if (this._allowDebugLog && logger.isEnabled(Severity.DEBUG)) {
      logger.debug(message, {
        ...this._defaultLogExtra,
        ...extra,
      });
    }
  }

  infoLog(message: string, extra?: any) {
    logger.info(message, {
      ...this._defaultLogExtra,
      ...extra,
    });
  }

  warnLog(message: string, extra?: any, err?: Error) {
    logger.warn(
      message,
      {
        ...this._defaultLogExtra,
        ...extra,
      },
      err
    );
  }

  errorLog(message: string, err?: any, extra?: any) {
    logger.error(message, err, {
      ...this._defaultLogExtra,
      ...extra,
    });
  }
}
