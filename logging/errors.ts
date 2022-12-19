import { JSONValue } from '../base/interfaces.ts';
import { BaseLogEntry } from './entry.ts';

export type DeveloperError =
  | 'NotImplemented'
  | 'NotReached'
  | 'FailedAssertion'
  | 'UncaughtServerError';

export interface BaseErrorLogEntry extends BaseLogEntry {
  trace?: string;
}

export interface LogEntryDeveloperError extends BaseErrorLogEntry {
  severity: 'ERROR';
  error: DeveloperError;
}

export type OperationalError =
  | 'FetchError'
  | 'SerializeError'
  | 'BadRequest'
  | 'UnknownCommand'
  | 'UnknownSyncError'
  | 'AttachmentRemovalFailed'
  | 'AttachmentDownloadFailed';

export interface OperationalErrorLogEntry extends BaseErrorLogEntry {
  severity: 'INFO';
  error: OperationalError;
  url?: string;
  key?: string;
  valueType?: string;
  value?: JSONValue;
  vertex?: string;
}

export type SystemError =
  | 'BackupWriteFailed'
  | 'IncompatibleVersion'
  | 'LoggerWriteFailed';

export interface SystemErrorLogEntry extends BaseErrorLogEntry {
  severity: 'ERROR';
  error: SystemError;
  commit?: string;
  repo?: string;
  url?: string;
  localVersion?: number;
  peerVersion?: number;
}
