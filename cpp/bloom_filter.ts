// @deno-types="https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/emscripten/index.d.ts"
import type { EmscriptenModule } from 'https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/emscripten/index.d.ts';
interface BloomFilterModule extends EmscriptenModule {
  ccall: (
    ident: string,
    returnType: string,
    argTypes: string[],
    args: any[]
  ) => any;
  cwrap: (
    ident: string,
    returnType: string,
    argTypes: string[]
  ) => (...args: any[]) => any;
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
  // private static deserialize_bloom_filter: (ptr: number, data: number) => void;
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
      // this.deserialize_bloom_filter = Module.cwrap(
      //   'deserializeBloomFilter',
      //   'void',
      //   ['number', 'number']
      // );
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
      const size = BloomFilter.HEAPU32[sizePtr / 4]; // We know this is uint32_t from the C++ side
      // Add a sanity check for size
      if (size === 0 || size > 1000000000) {
        // Adjust max size as needed
        throw new Error(`Invalid serialized size: ${size}`);
      }
      const dataPtr = sizePtr + 4; // Data starts after the size
      const result = new Uint8Array(BloomFilter.HEAPU8.buffer, dataPtr, size);
      const copy = new Uint8Array(result);
      return copy;
    } finally {
      BloomFilter.free_serialized_data(serializedPtr);
    }
  }

  static async deserialize(
    data: Uint8Array,
    existingFilter?: BloomFilter
  ): Promise<BloomFilter> {
    console.log('Deserialize method called');
    await initializeModule();
    this.initFunctions();

    console.log(`Input data length: ${data.length}`);

    const filter = existingFilter || (await this.create(1, 0.01));
    console.log('Filter created or existing filter used');

    const dataPtr = this._malloc(data.length);
    console.log(`Allocated memory at address: ${dataPtr}`);

    if (dataPtr === 0) {
      throw new Error('Memory allocation failed');
    }

    this.HEAPU8.set(data, dataPtr);
    console.log('Data written to memory');

    try {
      console.log(
        `Calling C++ deserialize function with filter ptr: ${filter.ptr} and data ptr: ${dataPtr}`
      );
      const errorPtr = this.deserialize_bloom_filter(filter.ptr, dataPtr);
      if (errorPtr !== 0) {
        const errorMessage = Module.UTF8ToString(errorPtr);
        throw new Error(`Deserialization failed: ${errorMessage}`);
      }
      console.log('C++ deserialize function completed successfully');
    } catch (error) {
      console.error('Error during C++ deserialization:', error);
      throw error;
    } finally {
      console.log(`Freeing allocated memory at address: ${dataPtr}`);
      this._free(dataPtr);
    }

    return filter;
  }
}

async function runTests() {
  console.log('Running Bloom Filter tests...');

  const filter = await BloomFilter.create(1000, 0.2);

  async function runTest(
    testName: string,
    testFn: () => boolean | Promise<boolean>
  ) {
    try {
      const result = await Promise.resolve(testFn());
      console.log(`${testName}: ${result ? 'PASSED' : 'FAILED'}`);
      return result;
    } catch (error) {
      console.error(
        `${testName}: ERROR - ${error?.message || 'Unknown error'}`
      );
      console.error(error?.stack || 'No stack trace available');
      return false;
    }
  }
  try {
    // const testResults = await Promise.all([
    //   runTest('Basic functionality', () => {
    //     filter.add('test');
    //     return filter.has('test') && !filter.has('not_test');
    //   }),

    //   runTest('Case sensitivity', () => {
    //     filter.add('Case');
    //     return filter.has('Case') && !filter.has('case');
    //   }),

    //   runTest('Empty string', () => {
    //     filter.add('');
    //     return filter.has('');
    //   }),

    //   runTest('Long string', () => {
    //     const longString = 'a'.repeat(10000);
    //     filter.add(longString);
    //     return filter.has(longString);
    //   }),

    //   runTest('Unicode characters', () => {
    //     filter.add('日本語');
    //     return filter.has('日本語');
    //   }),

    //   runTest('Multiple filters', async () => {
    //     const filter2 = await BloomFilter.create(500, 0.05);
    //     filter2.add('only_in_filter2');
    //     const result =
    //       filter2.has('only_in_filter2') && !filter.has('only_in_filter2');
    //     filter2.delete();
    //     return result;
    //   }),

    //   runTest('Edge case - Near capacity', async () => {
    //     const edgeFilter = await BloomFilter.create(100, 0.01);
    //     for (let i = 0; i < 95; i++) {
    //       edgeFilter.add(`item_${i}`);
    //     }
    //     let allFound = true;
    //     for (let i = 0; i < 95; i++) {
    //       if (!edgeFilter.has(`item_${i}`)) {
    //         allFound = false;
    //         break;
    //       }
    //     }
    //     edgeFilter.delete();
    //     return allFound;
    //   }),

    //   runTest('Detailed false positive test', async () => {
    //     const filterSize = 1000;
    //     const targetFPR = 0.1;
    //     const detailedFilter = await BloomFilter.create(filterSize, targetFPR);

    //     const addedItems = new Set<string>();

    //     for (let i = 0; i < 500; i++) {
    //       const item = `item_${i}`;
    //       detailedFilter.add(item);
    //       addedItems.add(item);
    //     }

    //     let falsePositives = 0;
    //     const testCount = 10000;
    //     for (let i = 0; i < testCount; i++) {
    //       const testItem = `not_in_filter_${i}`;
    //       if (addedItems.has(testItem)) continue;
    //       if (detailedFilter.has(testItem)) {
    //         falsePositives++;
    //       }
    //     }

    //     const falsePositiveRate = falsePositives / testCount;
    //     console.log(`False positives found: ${falsePositives}`);
    //     console.log(
    //       `Actual false positive rate: ${falsePositiveRate.toFixed(6)}`
    //     );

    //     detailedFilter.delete();
    //     return falsePositiveRate > 0;
    //   }),
    // ]);

    const serializationTestResults = await Promise.all([
      // runTest('Serialization and Deserialization', async () => {
      //   try {
      //     console.log('Creating original filter...');
      //     const originalFilter = await BloomFilter.create(1000, 0.1);
      //     console.log('Adding test items...');
      //     originalFilter.add('test1');
      //     originalFilter.add('test2');

      //     console.log('Serializing filter...');
      //     const serialized = originalFilter.serialize();
      //     console.log(`Serialized data length: ${serialized.length}`);

      //     console.log('Deserializing filter...');
      //     const deserializedFilter = await BloomFilter.deserialize(serialized);

      //     console.log('Checking deserialized filter...');
      //     console.log('Test results:');
      //     console.log('Has test1:', deserializedFilter.has('test1'));
      //     console.log('Has test2:', deserializedFilter.has('test2'));
      //     console.log('Has test3:', deserializedFilter.has('test3'));
      //     const result =
      //       deserializedFilter.has('test1') &&
      //       deserializedFilter.has('test2') &&
      //       !deserializedFilter.has('test3');

      //     console.log('Cleaning up...');
      //     originalFilter.delete();
      //     deserializedFilter.delete();

      //     return result;
      //   } catch (error) {
      //     console.error(
      //       'Error in Serialization and Deserialization test:',
      //       error
      //     );
      //     throw error; // Re-throw the error so it's caught by runTest
      //   }
      // }),

      runTest('Serialization of empty filter', async () => {
        const emptyFilter = await BloomFilter.create(500, 0.05);
        const serialized = emptyFilter.serialize();
        const deserializedFilter = await BloomFilter.deserialize(serialized);

        const result = !deserializedFilter.has('anything');

        emptyFilter.delete();
        deserializedFilter.delete();
        return result;
      }),

      // runTest('Serialization with many items', async () => {
      //   const largeFilter = await BloomFilter.create(10000, 0.01);
      //   for (let i = 0; i < 1000; i++) {
      //     largeFilter.add(`item_${i}`);
      //   }

      //   const serialized = largeFilter.serialize();
      //   const deserializedFilter = await BloomFilter.deserialize(serialized);

      //   let allFound = true;
      //   for (let i = 0; i < 1000; i++) {
      //     if (!deserializedFilter.has(`item_${i}`)) {
      //       allFound = false;
      //       break;
      //     }
      //   }

      //   largeFilter.delete();
      //   deserializedFilter.delete();
      //   return allFound;
      // }),

      // runTest('Serialization consistency', async () => {
      //   const filter1 = await BloomFilter.create(1000, 0.1);
      //   filter1.add('test');

      //   const serialized1 = filter1.serialize();
      //   const serialized2 = filter1.serialize();

      //   const result =
      //     serialized1.length === serialized2.length &&
      //     serialized1.every((value, index) => value === serialized2[index]);

      //   filter1.delete();
      //   return result;
      // }),

      // New test for in-place deserialization
      // runTest('In-place Deserialization', async () => {
      //   const originalFilter = await BloomFilter.create(1000, 0.1);
      //   originalFilter.add('test1');
      //   originalFilter.add('test2');

      //   const serialized = originalFilter.serialize();

      //   // Create a new filter with different parameters
      //   const newFilter = await BloomFilter.create(500, 0.05);
      //   newFilter.add('different');

      //   // Deserialize into the existing filter
      //   await BloomFilter.deserialize(serialized, newFilter);

      //   const result =
      //     newFilter.has('test1') &&
      //     newFilter.has('test2') &&
      //     !newFilter.has('different') &&
      //     !newFilter.has('test3');

      //   originalFilter.delete();
      //   newFilter.delete();
      //   return result;
      // }),
    ]);

    const allTestsPassed =
      // testResults.every((result) => result) &&
      serializationTestResults.every((result) => result);
    console.log(`All tests ${allTestsPassed ? 'PASSED' : 'FAILED'}`);

    filter.delete();
  } catch (error) {
    console.error('An error occurred during test execution:', error);
  }
}

async function main() {
  try {
    await runTests();
  } catch (error) {
    console.error('An error occurred in main:', error);
  }
}

if (import.meta.main) {
  main().catch((error) => console.error('Unhandled error in main:', error));
}
