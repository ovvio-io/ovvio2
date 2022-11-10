import { LogEntryDeveloperError, OperationalErrorLogEntry } from './errors.ts';
import { GenericLogEntry, normalizeLogEntry, SeverityCodes } from './entry.ts';
import { ConsoleLogStream, FileLogStream } from './stream.ts';
import { MetricLogEntry } from './metrics.ts';

export type LogEntry =
  | GenericLogEntry
  | LogEntryDeveloperError
  | OperationalErrorLogEntry
  | MetricLogEntry;

const kDefaultConsoleLogStream = new ConsoleLogStream();

let gFileLogStream: FileLogStream | undefined;

let gLogLevel = SeverityCodes.DEFAULT;

export function setLogsDirPath(path: string): void {
  if (gFileLogStream !== undefined) {
    gFileLogStream.close();
  }
  gFileLogStream = new FileLogStream(path);
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
    kDefaultConsoleLogStream.appendEntry(e);
    if (gFileLogStream) {
      gFileLogStream.appendEntry(e);
    }
  }
}
