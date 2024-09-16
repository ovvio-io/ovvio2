// @deno-types="https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/emscripten/index.d.ts"
import { encodeBase64 } from 'std/encoding/base64.ts';
import type { EmscriptenModule } from 'https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/emscripten/index.d.ts';

interface BloomFilterModule extends EmscriptenModule {
  ccall: <R = number | string | boolean | void>(
    ident: string,
    returnType: string,
    argTypes: string[],
    args: (number | string | boolean)[]
  ) => R;
  cwrap: <R = number, A extends any[] = (number | string | boolean)[]>(
    ident: string,
    returnType: string,
    argTypes: string[]
  ) => (...args: A) => R;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  UTF8ToString: (ptr: number) => string;
}

declare global {
  let Module: BloomFilterModule;
}
let moduleLoadPromise: Promise<void>;

function initializeModule(): Promise<void> {
  if (!moduleLoadPromise) {
    moduleLoadPromise = (async () => {
      const wasmUrl = new URL('./bloom_filter.wasm', import.meta.url);
      const jsUrl = new URL('./bloom_filter.js', import.meta.url);

      const wasmResponse = await fetch(wasmUrl);
      const wasmBinary = await wasmResponse.arrayBuffer();

      const jsResponse = await fetch(jsUrl);
      const moduleScript = await jsResponse.text();

      return new Promise<void>((resolve) => {
        const Module = {
          wasmBinary,
          onRuntimeInitialized: () => {
            (globalThis as any).Module = Module;
            resolve();
          },
        };

        const runScript = new Function('Module', moduleScript);
        runScript(Module);
      });
    })();
  }
  return moduleLoadPromise;
}

export class BloomFilter {
  private ptr: number;
  private static create_bloom_filter: (
    size: number,
    fpr: number,
    _ptr: number
  ) => number;
  private static add_to_filter: (ptr: number, str: string) => void;
  private static check_in_filter: (ptr: number, str: string) => number;
  private static delete_bloom_filter: (ptr: number) => void;
  private static serialize_bloom_filter: (ptr: number) => number;
  private static deserialize_bloom_filter: (
    ptr: number,
    data: number,
    length: number
  ) => number;
  private static free_serialized_data: (ptr: number) => void;
  private static _malloc: (size: number) => number;
  private static _free: (ptr: number) => void;
  private static HEAPU8: Uint8Array;
  private static HEAPU32: Uint32Array;

  static async initNativeFunctions(): Promise<void> {
    if (!this.create_bloom_filter) {
      await initializeModule();
      this.create_bloom_filter = Module.cwrap('createBloomFilter', 'number', [
        'number',
        'number',
        'number',
      ]);
      this.add_to_filter = Module.cwrap('addToFilter', 'void', [
        'number',
        'string',
      ]);
      this.check_in_filter = Module.cwrap('checkInFilter', 'number', [
        'number',
        'string',
      ]);
      this.delete_bloom_filter = Module.cwrap('deleteBloomFilter', 'void', [
        'number',
      ]);
      this.serialize_bloom_filter = Module.cwrap(
        'serializeBloomFilter',
        'number',
        ['number']
      );
      this.deserialize_bloom_filter = Module.cwrap(
        'deserializeBloomFilter',
        'number',
        ['number', 'number']
      );

      this.free_serialized_data = Module.cwrap('freeSerializedData', 'void', [
        'number',
      ]);
      this._malloc = Module._malloc;
      this._free = Module._free;
      this.HEAPU8 = Module.HEAPU8;
      this.HEAPU32 = Module.HEAPU32;
    }
  }

  constructor({
    size,
    fpr,
    _ptr,
  }: {
    size: number;
    fpr?: number;
    _ptr?: number;
  }) {
    if (fpr !== undefined && (fpr <= 0 || fpr >= 1)) {
      throw new Error('FPR must be between 0 and 1');
    }
    if (_ptr) {
      this.ptr = BloomFilter.create_bloom_filter(size, 0, _ptr);
    } else {
      this.ptr = BloomFilter.create_bloom_filter(size, fpr || 0.01, 0);
    }
  }

  add(value: string): void {
    BloomFilter.add_to_filter(this.ptr, value);
  }

  has(value: string): boolean {
    return BloomFilter.check_in_filter(this.ptr, value) !== 0;
  }

  delete(): void {
    BloomFilter.delete_bloom_filter(this.ptr);
  }

  // serialize(): Uint8Array {
  serialize(): string {
    const serializedPtr = BloomFilter.serialize_bloom_filter(this.ptr);
    if (serializedPtr === 0) {
      throw new Error('Serialization failed');
    }
    try {
      const sizePtr = serializedPtr;
      const view = new DataView(BloomFilter.HEAPU8.buffer);
      const size = view.getUint32(sizePtr, true);

      if (size === 0 || size > 1000000000) {
        throw new Error(`Invalid serialized size: ${size}`);
      }
      const dataPtr = sizePtr + 4;
      const result = new Uint8Array(
        BloomFilter.HEAPU8.buffer.slice(dataPtr, dataPtr + size)
      );
      return encodeBase64(result);
      // return result;
    } finally {
      BloomFilter.free_serialized_data(serializedPtr);
    }
  }

  static deserialize(b64: string): BloomFilter {
    const binString = atob(b64);
    const size = binString.length;
    const dataPtr = this._malloc(size);
    const bytes = new DataView(this.HEAPU8.buffer, dataPtr, size);
    for (let i = 0; i < size; i++) {
      bytes.setUint8(i, binString.charCodeAt(i));
    }
    const filter = existingFilter || new this({ size, _ptr: dataPtr });
    try {
      const errorPtr = this.deserialize_bloom_filter(filter.ptr, dataPtr, size);
      if (errorPtr !== 0) {
        const errorMessage = Module.UTF8ToString(errorPtr);
        throw new Error(`Deserialization failed: ${errorMessage}`);
      }
    } finally {
      // this._free(dataPtr);
    }

    return filter;
  }
}
