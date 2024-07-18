import { buf } from 'https://deno.land/x/sqlite3@0.10.0/src/util.ts';

export class BloomFilter {
  // deno-lint-ignore no-explicit-any
  private wasmModule: any;
  // deno-lint-ignore no-explicit-any
  private bloomFilter: any;

  constructor(size: number, fpr: number) {
    this.wasmModule = null;
    this.bloomFilter = null;
    this.initialize(size, fpr);
  }

  async initialize(size: number, fpr: number) {
    const wasmUrl = new URL(
      '../build/BloomFilter.wasm',
      import.meta.url
    ).toString();

    const importObject = {
      a: {
        a: () => console.log('Function a.a called'),
        b: () => console.log('Function a.b called'),
        c: () => console.log('Function a.c called'),
        d: () => console.log('Function a.d called'),
        e: () => console.log('Function a.e called'),
        f: () => console.log('Function a.f called'),
        g: () => console.log('Function a.g called'),
        h: () => console.log('Function a.h called'),
        i: () => console.log('Function a.i called'),
        j: () => console.log('Function a.j called'),
        k: () => console.log('Function a.k called'),
        l: () => console.log('Function a.l called'),
        m: () => console.log('Function a.m called'),
        n: () => console.log('Function a.n called'),
        o: () => console.log('Function a.o called'),
        p: () => console.log('Function a.p called'),
        q: () => console.log('Function a.q called'),
        r: () => console.log('Function a.r called'),
        s: () => console.log('Function a.s called'),
        t: () => console.log('Function a.t called'),
        u: () => console.log('Function a.u called'),
        v: () => console.log('Function a.v called'),
        w: () => console.log('Function a.w called'),
      },
      env: {
        memory: new WebAssembly.Memory({ initial: 256, maximum: 256 }),
      },
    };

    console.log(
      'importObject:',
      JSON.stringify(
        importObject,
        (key, value) =>
          typeof value === 'function' ? value.toString() : value,
        2
      )
    );

    try {
      const { instance } = await WebAssembly.instantiateStreaming(
        fetch(wasmUrl, { credentials: 'same-origin' }),
        importObject
      );
      console.log('WebAssembly module exports:', Object.keys(instance.exports));
      this.wasmModule = instance.exports;
      console.log('Available exports:', Object.keys(this.wasmModule));

      // Assuming your WASM module exports a function to create a BloomFilter
      if (typeof this.wasmModule._BloomFilter === 'function') {
        this.bloomFilter = this.wasmModule._BloomFilter(size, fpr, 0, 0, 0);
      } else {
        throw new Error('_BloomFilter function not found in WASM module');
      }
    } catch (error) {
      console.error('Failed to initialize WebAssembly module:', error);
      throw error;
    }
  }

  add(value: string) {
    const lengthBytes = new Uint8Array(new Uint32Array([value.length]).buffer);
    const stringBytes = new TextEncoder().encode(value);
    const bytes = new Uint8Array(
      lengthBytes.byteLength + stringBytes.byteLength
    );

    bytes.set(lengthBytes, 0);
    bytes.set(stringBytes, lengthBytes.byteLength);

    this.wasmModule._add(this.bloomFilter, bytes);
  }

  possiblyContains(value: string): boolean {
    const lengthBytes = new Uint8Array(new Uint32Array([value.length]).buffer);
    const stringBytes = new TextEncoder().encode(value);
    const bytes = new Uint8Array(
      lengthBytes.byteLength + stringBytes.byteLength
    );

    bytes.set(lengthBytes, 0);
    bytes.set(stringBytes, lengthBytes.byteLength);

    return this.wasmModule._possiblyContains(this.bloomFilter, bytes);
  }

  serialize(): string {
    return this.wasmModule.UTF8ToString(
      this.wasmModule._serialize(this.bloomFilter)
    );
  }

  deserialize(data: string) {
    const lengthBytes = new Uint8Array(new Uint32Array([data.length]).buffer);
    const stringBytes = new TextEncoder().encode(data);
    const bytes = new Uint8Array(
      lengthBytes.byteLength + stringBytes.byteLength
    );

    bytes.set(lengthBytes, 0);
    bytes.set(stringBytes, lengthBytes.byteLength);

    this.wasmModule._deserialize(this.bloomFilter, bytes);
  }

  printBuffer() {
    this.wasmModule._printBuffer(this.bloomFilter);
  }
}
