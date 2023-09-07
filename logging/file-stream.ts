import {
  join as joinPath,
  resolve as resolvePath,
} from 'https://deno.land/std@0.183.0/path/mod.ts';
import { NormalizedLogEntry } from './entry.ts';
import { LogEntry, LogStream } from './log.ts';

const kLogFileExpirationMs = 60 * 60 * 1000; // 1 hr
const kLogFileMaxSizeBytes = 1024 * 1024 * 100; // 1MB

export class FileLogStream implements LogStream {
  private readonly _dirPath: string;
  private _file: Deno.FsFile;
  private _pendingWritePromise: Promise<void>;
  private _fileOpenTs: number;

  constructor(outDirPath: string) {
    this._dirPath = outDirPath;
    this._file = openNewLogFile(this._dirPath);
    this._fileOpenTs = Date.now();
    this._pendingWritePromise = Promise.resolve();
  }

  appendEntry(e: NormalizedLogEntry<LogEntry>): void {
    this.scheduleWriteJob(() => this.writeLogEntry(e));
  }

  private scheduleWriteJob(job: () => Promise<void>): void {
    this._pendingWritePromise
      .finally(() => job())
      .finally(() => (this._pendingWritePromise = Promise.resolve()));
  }

  private async writeLogEntry(e: NormalizedLogEntry): Promise<void> {
    // Once in a while check if we need to close the current log file and open
    // a new one.
    if (
      Date.now() - this._fileOpenTs >= kLogFileExpirationMs ||
      randomInt(0, 100) === 0
    ) {
      await this.closeLogFileIfNeeded();
    }

    // Actually write the file
    const bytesToWrite = new TextEncoder().encode(JSON.stringify(e));
    let file = this._file;
    let bytesWritten = 0;
    do {
      // Since we write our log in chunks (potentially), this loop may be
      // paused while the current file is being closed and a new one is opened.
      // If this happens we just write everything from the start again to the
      // new log file. Entries have unique ids so readers can ignore double
      // entries.
      if (this._file !== file) {
        bytesWritten = 0;
        file = this._file;
      }
      bytesWritten += await file.write(bytesToWrite.subarray(bytesWritten));
    } while (bytesWritten < bytesToWrite.length);
  }

  private async closeLogFileIfNeeded(): Promise<void> {
    const file = this._file;
    const fileInfo = await file.stat();
    if (this._file !== file) {
      return;
    }
    const creationTime = Math.min(
      fileInfo.birthtime?.getTime() || 0,
      this._fileOpenTs
    );
    if (
      Date.now() - creationTime >= kLogFileExpirationMs ||
      fileInfo.size >= kLogFileMaxSizeBytes
    ) {
      this._file.close();
      this._file = openNewLogFile(this._dirPath);
      this._fileOpenTs = Date.now();
    }
  }

  close(): void {
    this.scheduleWriteJob(() => {
      this._file.close();
      return Promise.resolve();
    });
  }
}

function openNewLogFile(dirPath: string): Deno.FsFile {
  const fileName = `${new Date().getTime()}-${Deno.pid}.jsonl`;
  return Deno.openSync(joinPath(resolvePath(dirPath), fileName), {
    append: true,
    createNew: true,
  });
}

// min - inclusive, max - exclusive
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#Getting_a_random_integer_between_two_values
export function randomInt(min: number, max: number): number {
  if (min === max) return min;

  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}
