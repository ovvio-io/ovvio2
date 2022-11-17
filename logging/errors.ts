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
  | 'UnknownSyncError';

export interface OperationalErrorLogEntry extends BaseErrorLogEntry {
  severity: 'INFO';
  error: OperationalError;
  url?: string;
  key?: string;
  valueType?: string;
  value?: JSONValue;
}
