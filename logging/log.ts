import {
  LogEntryDeveloperError,
  OperationalErrorLogEntry,
  SystemErrorLogEntry,
} from './errors.ts';
import {
  GenericLogEntry,
  normalizeLogEntry,
  Severity,
  SeverityCodes,
} from './entry.ts';
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

// TODO: Capture anonymous logs on client and sync them with the server
const kDefaultLoggerStreams = [new ConsoleLogStream()];

let gLogStreams: LogStream[] = kDefaultLoggerStreams;

let gLogLevel = SeverityCodes.DEFAULT;

export function setGlobalLoggerStreams(streams: LogStream[]): void {
  gLogStreams = streams;
}

export function resetGlobalLoggerStreams(): void {
  gLogStreams = kDefaultLoggerStreams;
}

export function setGlobalLoggerSeverity(level: Severity): void {
  gLogLevel = SeverityCodes[level];
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

export const GlobalLogger = {
  log(entry: LogEntry): void {
    log(entry, gLogStreams);
  },
};
