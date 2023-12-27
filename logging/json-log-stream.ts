import { LogEntry, LogStream } from './log.ts';
import { JSONLogFile } from '../base/json-log.ts';
import { NormalizedLogEntry } from './entry.ts';

export class JSONLogStream implements LogStream {
  private readonly _log: JSONLogFile;

  constructor(path: string) {
    const file = new JSONLogFile(path, true);
    this._log = file;
    for (const _x of file.open()) {
      // Wind the log file to its end, trimming any corrupted tail.
      // TODO: Run the fixup process from the end of the file rather than the
      // start.
    }
  }

  appendEntry(e: NormalizedLogEntry<LogEntry>): void {
    this._log.append([e]);
  }
}
