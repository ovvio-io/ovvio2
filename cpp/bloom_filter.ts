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
  static async create(size: number, fpr: number): Promise<BloomFilter> {
    await initializeModule();
    await this.initFunctions();

    const ptr = this.create_bloom_filter(size, fpr);
    if (ptr === 0) {
      throw new Error('Failed to create BloomFilter');
    }
    return new BloomFilter(ptr);
  }

  private static async initFunctions() {
    if (!this.create_bloom_filter) {
      this.create_bloom_filter = Module.cwrap('create_bloom_filter', 'number', [
        'number',
        'number',
      ]);
      this.add_to_filter = Module.cwrap('add_to_filter', 'void', [
        'number',
        'string',
      ]);
      this.check_in_filter = Module.cwrap('check_in_filter', 'number', [
        'number',
        'string',
      ]);
      this.delete_bloom_filter = Module.cwrap('delete_bloom_filter', 'void', [
        'number',
      ]);
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
}

async function runTests() {
  console.log('Running Bloom Filter tests...');

  const filter = await BloomFilter.create(1000, 0.2);

  async function runTest(
    testName: string,
    testFn: () => boolean | Promise<boolean>
  ) {
    try {
      const result = await testFn();
      console.log(`${testName}: ${result ? 'PASSED' : 'FAILED'}`);
      return result;
    } catch (error) {
      console.error(`${testName}: ERROR - ${error.message}`);
      return false;
    }
  }

  const testResults = await Promise.all([
    runTest('Basic functionality', () => {
      filter.add('test');
      return filter.has('test') && !filter.has('not_test');
    }),

    runTest('Case sensitivity', () => {
      filter.add('Case');
      return filter.has('Case') && !filter.has('case');
    }),

    runTest('Empty string', () => {
      filter.add('');
      return filter.has('');
    }),

    runTest('Long string', () => {
      const longString = 'a'.repeat(10000);
      filter.add(longString);
      return filter.has(longString);
    }),

    runTest('Unicode characters', () => {
      filter.add('日本語');
      return filter.has('日本語');
    }),

    runTest('Multiple filters', async () => {
      const filter2 = await BloomFilter.create(500, 0.05);
      filter2.add('only_in_filter2');
      const result =
        filter2.has('only_in_filter2') && !filter.has('only_in_filter2');
      filter2.delete();
      return result;
    }),

    runTest('Edge case - Near capacity', async () => {
      const edgeFilter = await BloomFilter.create(100, 0.01);
      for (let i = 0; i < 95; i++) {
        edgeFilter.add(`item_${i}`);
      }
      let allFound = true;
      for (let i = 0; i < 95; i++) {
        if (!edgeFilter.has(`item_${i}`)) {
          allFound = false;
          break;
        }
      }
      edgeFilter.delete();
      return allFound;
    }),

    runTest('Detailed false positive test', async () => {
      const filterSize = 1000;
      const targetFPR = 0.1;
      const detailedFilter = await BloomFilter.create(filterSize, targetFPR);

      console.log(`Filter size: ${filterSize}`);
      console.log(`Target FPR: ${targetFPR}`);

      const addedItems = new Set<string>();

      for (let i = 0; i < 500; i++) {
        const item = `item_${i}`;
        detailedFilter.add(item);
        addedItems.add(item);
      }

      let falsePositives = 0;
      const testCount = 10000;
      for (let i = 0; i < testCount; i++) {
        const testItem = `not_in_filter_${i}`;
        if (addedItems.has(testItem)) continue;
        if (detailedFilter.has(testItem)) {
          falsePositives++;
          if (falsePositives <= 5) {
            console.log(`False positive found: ${testItem}`);
          }
        }
      }

      const falsePositiveRate = falsePositives / testCount;
      console.log(`\nDetailed Test Results:`);
      console.log(`Items added: ${addedItems.size}`);
      console.log(`Tests performed: ${testCount}`);
      console.log(`False positives found: ${falsePositives}`);
      console.log(
        `Actual false positive rate: ${falsePositiveRate.toFixed(6)}`
      );

      const expectedFPR = 0.1;
      const lowerBound = expectedFPR * 0.1;
      const upperBound = expectedFPR * 1.5;
      console.log(
        `Expected FPR range: ${lowerBound.toFixed(6)} to ${upperBound.toFixed(
          6
        )}`
      );

      detailedFilter.delete();
      return falsePositiveRate > 0 && falsePositiveRate < upperBound;
    }),
  ]);

  const allTestsPassed = testResults.every((result) => result);
  console.log(`All tests ${allTestsPassed ? 'PASSED' : 'FAILED'}`);

  filter.delete();
}

async function main() {
  try {
    await runTests();
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
