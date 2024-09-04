// @deno-types="https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/emscripten/index.d.ts"
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
  private static create_bloom_filter: (size: number, fpr: number) => number;
  private static add_to_filter: (ptr: number, str: string) => void;
  private static check_in_filter: (ptr: number, str: string) => number;
  private static delete_bloom_filter: (ptr: number) => void;
  private static serialize_bloom_filter: (ptr: number) => number;
  private static deserialize_bloom_filter: (
    ptr: number,
    data: number
  ) => number;
  private static free_serialized_data: (ptr: number) => void;
  private static _malloc: (size: number) => number;
  private static _free: (ptr: number) => void;
  private static HEAPU8: Uint8Array;
  private static HEAPU32: Uint32Array;

  static async create(size: number, fpr: number): Promise<BloomFilter> {
    await initializeModule();
    this.initFunctions();

    const ptr = this.create_bloom_filter(size, fpr);
    if (ptr === 0) {
      throw new Error('Failed to create BloomFilter');
    }
    return new BloomFilter(ptr);
  }

  private static initFunctions() {
    if (!this.create_bloom_filter) {
      this.create_bloom_filter = Module.cwrap('createBloomFilter', 'number', [
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

  constructor(ptr: number) {
    this.ptr = ptr;
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

  serialize(): Uint8Array {
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

      return result;
    } finally {
      BloomFilter.free_serialized_data(serializedPtr);
    }
  }

  static async deserialize(
    data: Uint8Array,
    existingFilter?: BloomFilter
  ): Promise<BloomFilter> {
    await initializeModule();
    this.initFunctions();
    const filter = existingFilter || (await this.create(1, 0.01));
    const dataPtr = this._malloc(data.length + 4); // Allocate memory including space for size
    if (dataPtr === 0) {
      throw new Error('Memory allocation failed');
    }

    try {
      this.HEAPU32[dataPtr / 4] = data.length;
      this.HEAPU8.set(data, dataPtr + 4);
      const errorPtr = this.deserialize_bloom_filter(filter.ptr, dataPtr);
      if (errorPtr !== 0) {
        const errorMessage = Module.UTF8ToString(errorPtr);
        throw new Error(`Deserialization failed: ${errorMessage}`);
      }
    } finally {
      this._free(dataPtr);
    }

    return filter;
  }
}
