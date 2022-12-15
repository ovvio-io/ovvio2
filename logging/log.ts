import {
  LogEntryDeveloperError,
  OperationalErrorLogEntry,
  SystemErrorLogEntry,
} from './errors.ts';
import { GenericLogEntry, normalizeLogEntry, SeverityCodes } from './entry.ts';
import { ConsoleLogStream, LogStream } from './stream.ts';
import { MetricLogEntry } from './metrics.ts';
import { ClientEventEntry } from './client-events.ts';

export type LogEntry =
  | GenericLogEntry
  | LogEntryDeveloperError
  | OperationalErrorLogEntry
  | SystemErrorLogEntry
  | MetricLogEntry
  | ClientEventEntry;

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

export function log(entry: LogEntry, outputStreams = gLogStreams): void {
  if (SeverityCodes[entry.severity] >= gLogLevel) {
    const e = normalizeLogEntry(entry);
    for (const stream of outputStreams) {
      stream.appendEntry(e);
    }
  }
}

export interface Logger {
  log(entry: LogEntry): void;
}

export function newLogger(outputStreams: LogStream[]): Logger {
  return {
    log(entry: LogEntry): void {
      log(entry, outputStreams);
    },
  };
}

export const GlobalLogger = newLogger(gLogStreams);
