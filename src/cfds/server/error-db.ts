import { Logger } from '@ovvio/base';
import { serializeDate, uniqueId } from '@ovvio/base/lib/utils';
import { JSONValue } from '@ovvio/base/lib/utils/interfaces';
import { MAX_TS } from '@ovvio/base/lib/utils/time';
import { CRUD, RowData } from './stores/crud';

interface ErrorReportInfo {
  error: Error | string;
  message?: string;
  /**
   * Specific error info is converted to string via JSON.stringify()
   */
  info?: JSONValue;
  recordKey?: string;
  userId?: string;
  sessionId?: string;
  recordVersion?: number;
}

export default class ErrorDB {
  static get tablePrefix() {
    return 'error';
  }
  private _crud: CRUD;

  constructor(crud: CRUD) {
    this._crud = crud;
  }

  report(errInfo: ErrorReportInfo) {
    const row: RowData = {};

    const logExtra: any = {
      type: 'error-db-insert',
    };

    if (typeof errInfo.error === 'string') {
      row['error_message'] = errInfo.error;
    } else {
      row['error_message'] = errInfo.error.message;
      if (errInfo.error.stack) row['error_stack'] = errInfo.error.stack;
      row['error_name'] = errInfo.error.name;
    }

    if (errInfo.message) {
      row['message'] = errInfo.message;
    }

    if (errInfo.info) {
      row['info'] = JSON.stringify(errInfo.info);
    }

    if (errInfo.recordKey) {
      row['record_key'] = errInfo.recordKey;
      logExtra.key = errInfo.recordKey;
    }

    if (errInfo.userId) {
      row['user_id'] = errInfo.userId;
      logExtra.userId = errInfo.userId;
    }

    if (errInfo.sessionId) {
      row['session_id'] = errInfo.sessionId;
      logExtra.sessionId = errInfo.sessionId;
    }

    if (errInfo.recordVersion) {
      row['record_version'] = errInfo.recordVersion.toString();
      logExtra.recordVersion = errInfo.recordVersion;
    }

    const now = new Date();
    row['time'] = serializeDate(now).toString();

    //Key
    const key = `${MAX_TS - now.getTime()}-${uniqueId()}`;

    this._crud.create(key, row).then(
      () => {
        Logger.error(
          `Error key: ${key} reported to Error-DB: ${errInfo.message}`,
          errInfo.error,
          logExtra
        );
      },
      err => {
        Logger.error(
          `failed to save error to Error-DB: ${errInfo.message}. error-message: ${row['error_message']}`,
          err
        );
      }
    );
  }
}
