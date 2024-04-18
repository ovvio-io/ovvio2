import * as path from 'std/path/mod.ts';
import { assert } from './error.ts';
import { JSONObject, ReadonlyJSONObject } from './interfaces.ts';
import { SerialScheduler } from './serial-scheduler.ts';
import { allocateBuffer } from './buffer.ts';
import { cacheBufferForReuse } from './buffer.ts';

const FILE_READ_BUF_SIZE_BYTES = 1024 * 8; // 8KB
const PAGE_SIZE = 4 * 1024; // 4KB
const LINE_DELIMITER_BYTE = 10; // "\n"

export type ProgressUpdateCallback = (value: number) => void;

export class JSONLogFile {
  private readonly _scheduler: SerialScheduler;
  private _file: Deno.FsFile | undefined;
  private _didScan = false;

  constructor(readonly path: string, readonly write = false) {
    this._scheduler = new SerialScheduler();
  }

  *open(progressCallback?: ProgressUpdateCallback): Generator<JSONObject> {
    if (this._file) {
      return;
    }
    if (this.write) {
      const dirPath = path.dirname(this.path);
      Deno.mkdirSync(dirPath, { recursive: true });
      this._file = Deno.openSync(this.path, {
        read: true,
        write: true,
        create: true,
      });
    } else {
      try {
        this._file = Deno.openSync(this.path, {
          read: true,
          write: false,
        });
      } catch (_: unknown) {
        // Open failed. No worries. We just count this as an empty log file.
        return;
      }
    }
    for (const c of this.scan(progressCallback)) {
      yield c;
    }
  }

  close(): Promise<void> {
    return this._scheduler.run(() => {
      if (this._file) {
        this._file.close();
        this._file = undefined;
      }
      return Promise.resolve();
    });
  }

  append(entries: readonly JSONObject[]): Promise<void> {
    assert(this.write, 'Attempting to write to a readonly log');
    return this._scheduler.run(async () => {
      const file = this._file;
      if (!file) {
        return;
      }
      assert(
        this._didScan,
        'Attempting to append to log before initial scan completed',
      );
      const encodedEntries =
        '\n' + entries.map((obj) => JSON.stringify(obj)).join('\n') + '\n';
      const encodedBuf = new TextEncoder().encode(encodedEntries);
      let bytesWritten = 0;
      await file.seek(0, Deno.SeekMode.End);
      while (bytesWritten < encodedBuf.byteLength) {
        const arr = encodedBuf.subarray(bytesWritten);
        bytesWritten += await file.write(arr);
      }
    });
  }

  appendSync(entries: readonly JSONObject[]): void {
    assert(this.write, 'Attempting to write to a readonly log');
    const file = this._file;
    if (!file) {
      return;
    }
    assert(
      this._didScan,
      'Attempting to append to log before initial scan completed',
    );
    const encodedEntries =
      '\n' + entries.map((obj) => JSON.stringify(obj)).join('\n') + '\n';
    const encodedBuf = new TextEncoder().encode(encodedEntries);
    let bytesWritten = 0;
    file.seekSync(0, Deno.SeekMode.End);
    while (bytesWritten < encodedBuf.byteLength) {
      const arr = encodedBuf.subarray(bytesWritten);
      bytesWritten += file.writeSync(arr);
    }
  }

  *scan(progressCallback?: ProgressUpdateCallback): Generator<JSONObject> {
    const file = this._file;
    if (!file) {
      return;
    }
    const totalFileBytes = file.seekSync(0, Deno.SeekMode.End);
    file.seekSync(0, Deno.SeekMode.Start);
    let fileOffset = 0;
    const readBuf = new Uint8Array(FILE_READ_BUF_SIZE_BYTES);
    const textDecoder = new TextDecoder();
    let objectBuf = allocateBuffer(PAGE_SIZE);
    let objectBufOffset = 0;
    let lastGoodFileOffset = 0;
    for (
      let bytesRead = file.readSync(readBuf);
      bytesRead !== null;
      bytesRead = file.readSync(readBuf)
    ) {
      if (bytesRead === 0) {
        continue;
      }
      let readBufStart = 0;
      let readBufEnd = 0;
      while (readBufStart < bytesRead) {
        readBufEnd = readBufStart;
        while (
          readBufEnd < bytesRead &&
          readBuf[readBufEnd] !== LINE_DELIMITER_BYTE
        ) {
          ++readBufEnd;
        }
        const readLen = readBufEnd - readBufStart;
        if (readLen > 0) {
          fileOffset += readLen;
          objectBuf = appendBytes(
            readBuf,
            readBufStart,
            readLen,
            objectBuf,
            objectBufOffset,
          );
          objectBufOffset += readLen;
          if (progressCallback) {
            progressCallback(fileOffset / totalFileBytes);
          }
        }
        readBufStart = readBufEnd + 1;
        if (
          readBuf[readBufEnd] === LINE_DELIMITER_BYTE &&
          objectBufOffset > 0
        ) {
          try {
            const text = textDecoder.decode(
              objectBuf.subarray(0, objectBufOffset),
            );
            yield JSON.parse(text);
            lastGoodFileOffset += objectBufOffset + 2;
            objectBufOffset = 0;
          } catch (_: unknown) {
            if (this.write) {
              file.seekSync(0, Deno.SeekMode.End);
              file.truncateSync(lastGoodFileOffset);
            }
            this._didScan = true;
            return;
          }
        }
      }
    }
    if (objectBufOffset > 0 && this.write) {
      file.seekSync(0, Deno.SeekMode.End);
      file.truncateSync(lastGoodFileOffset);
    }
    this._didScan = true;
    cacheBufferForReuse(objectBuf);
  }
  query(
    predicate: (obj: ReadonlyJSONObject) => boolean,
    limit = Number.MAX_SAFE_INTEGER,
  ): JSONObject[] {
    const result: JSONObject[] = [];
    for (const obj of this.scan()) {
      if (predicate(obj)) {
        result.push(obj);
        if (result.length === limit) {
          break;
        }
      }
    }
    return result;
  }
}

function appendBytes(
  src: Uint8Array,
  srcOffset: number,
  srcLen: number,
  dst: Uint8Array,
  dstOffset: number,
): Uint8Array {
  if (dstOffset + srcLen > dst.byteLength) {
    const newDst = allocateBuffer(
      Math.ceil(((dstOffset + srcLen) * 2) / PAGE_SIZE) * PAGE_SIZE,
    );
    newDst.set(dst);
    cacheBufferForReuse(dst);
    dst = newDst;
  }
  dst.set(src.subarray(srcOffset, srcOffset + srcLen), dstOffset);
  return dst;
}
