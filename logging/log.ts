import {
  LogEntryDeveloperError,
  OperationalErrorLogEntry,
  SystemErrorLogEntry,
} from './errors.ts';
import { GenericLogEntry, normalizeLogEntry, SeverityCodes } from './entry.ts';
import { ConsoleLogStream, LogStream } from './stream.ts';
import { MetricLogEntry } from './metrics.ts';

export type LogEntry =
  | GenericLogEntry
  | LogEntryDeveloperError
  | OperationalErrorLogEntry
  | SystemErrorLogEntry
  | MetricLogEntry;

let gLogStreams: LogStream[] = [new ConsoleLogStream()];

let gLogLevel = SeverityCodes.DEFAULT;

export function setLogStreams(streams: LogStream[]): void {
  gLogStreams = streams;
}

export function getLogLevel(): number {
  return gLogLevel;
}

export function setLogLevel(level: number): void {
  gLogLevel = level;
}

export function log(entry: LogEntry): void | never {
  if (SeverityCodes[entry.severity] >= gLogLevel) {
    const e = normalizeLogEntry(entry);
    for (const stream of gLogStreams) {
      stream.appendEntry(e);
    }
  }
}
