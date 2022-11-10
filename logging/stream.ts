import {
  join as joinPath,
  resolve as resolvePath,
} from 'https://deno.land/std@0.160.0/path/mod.ts';
import { NormalizedLogEntry, normalizeLogEntry, Severity } from './entry.ts';

const kLogFileExpirationMs = 60 * 60 * 1000; // 1 hr
const kLogFileMaxSizeBytes = 1024 * 1024 * 100; // 1MB

export interface LogStream {
  appendEntry(e: NormalizedLogEntry): void;
}

export class ConsoleLogStream implements LogStream {
  appendEntry(e: NormalizedLogEntry): void {
    const textLog = JSON.stringify(normalizeLogEntry(e));
    switch (e.severity as Severity) {
      case 'EMERGENCY':
      case 'ALERT':
      case 'CRITICAL':
      case 'ERROR':
        console.error(textLog);
        throw new Error(textLog);

      case 'WARNING':
      case 'NOTICE':
        console.warn(textLog);
        break;

      case 'INFO':
      case 'DEFAULT':
        console.log(textLog);
        break;

      case 'DEBUG':
        console.debug(textLog);
        break;
    }
  }
}

export class FileLogStream implements LogStream {
  private readonly _dirPath: string;
  private _file: Deno.FsFile;
  private _pendingWritePromise: Promise<void>;
  private _fileOpenTime: Date;

  constructor(outDirPath: string) {
    this._dirPath = outDirPath;
    this._file = openNewLogFile(this._dirPath);
    this._fileOpenTime = new Date();
    this._pendingWritePromise = Promise.resolve();
  }

  appendEntry(e: NormalizedLogEntry): void {
    this.scheduleWriteJob(() => this.writeLogEntry(e));
  }

  private scheduleWriteJob(job: () => Promise<void>): void {
    this._pendingWritePromise
      .finally(() => job())
      .finally(() => (this._pendingWritePromise = Promise.resolve()));
  }

  private async writeLogEntry(e: NormalizedLogEntry): Promise<void> {
    const bytesToWrite = new TextEncoder().encode(JSON.stringify(e));
    const file = this._file;
    let bytesWritten = 0;
    do {
      bytesWritten += await file.write(bytesToWrite.subarray(bytesWritten));
    } while (bytesWritten < bytesToWrite.length);

    if (randomInt(0, 100) === 0) {
      this.scheduleWriteJob(() => this.closeLogFileIfNeeded());
    }
  }

  private async closeLogFileIfNeeded(): Promise<void> {
    const file = this._file;
    const fileInfo = await file.stat();
    if (this._file !== file) {
      return;
    }
    if (
      Date.now() - (fileInfo.birthtime || this._fileOpenTime).getTime() >=
        kLogFileExpirationMs ||
      fileInfo.size >= kLogFileMaxSizeBytes
    ) {
      this._file.close();
      this._file = openNewLogFile(this._dirPath);
      this._fileOpenTime = new Date();
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
