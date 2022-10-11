import { assert } from './index.ts';
import { MurmurHash3 } from './hash.ts';

/**
 * A buffer that provides access to single bits by index.
 * Designed as storage for BloomFilter.
 */
class BitField {
  private _buffer: Uint8Array;

  constructor(size: number) {
    const byteLength = Math.ceil(size / 8);
    this._buffer = new Uint8Array(byteLength);
  }

  get bitSize() {
    return this.byteSize * 8;
  }

  get byteSize() {
    return this._buffer.byteLength;
  }

  get(idx: number): boolean {
    const byteOffset = idx >> 3; // floor(idx / 8)
    const bitMask = 1 << idx % 8;
    return (this._buffer[byteOffset] & bitMask) !== 0;
  }

  set(idx: number, value: boolean): void {
    const byteOffset = idx >> 3; // floor(idx / 8)
    const bitMask = 1 << idx % 8;
    const buf = this._buffer;
    if (value) {
      buf[byteOffset] = buf[byteOffset] | bitMask;
    } else {
      buf[byteOffset] = buf[byteOffset] & ~bitMask;
    }
  }

  clear(): void {
    this._buffer.fill(0);
  }
}

export interface BloomFilterOptions {
  // Expected number of items
  size: number;
  // 0-1, false-positive rate (e.g. 0.01 = 1%)
  fpr?: number;
  // Number of total bits in filter. Leave undefined for optimal value
  m?: number;
  // Number of hash functions. Leave undefined for optimal value
  k?: number;
  // If k is left undefined, you may provide a max number of hashes
  maxHashes?: number;
}

/**
 * A simple Bloom Filter implementation using MurmurHash3.
 */
export class BloomFilter {
  private _filter: BitField;
  private _hashes: MurmurHash3[];

  constructor(options: BloomFilterOptions) {
    const { size, fpr, maxHashes } = options;
    let { m, k } = options;
    if (m === undefined) {
      assert(fpr !== undefined);
      m = Math.abs(size * Math.log(fpr!)) / Math.log(2) ** 2;
    }
    if (k === undefined) {
      k = (m / size) * Math.log(2);
    }

    if (maxHashes !== undefined) {
      k = Math.max(k, maxHashes);
    }

    this._filter = new BitField(m);
    this._hashes = [];
    for (let i = 0; i < k; ++i) {
      this._hashes.push(new MurmurHash3());
    }
  }

  /**
   * Returns the number of bytes the filter occupies.
   */
  get byteSize() {
    return this._filter.byteSize;
  }

  fillRate(): number {
    const filter = this._filter;
    let count = 0;
    for (let i = 0; i < filter.bitSize; ++i) {
      if (filter.get(i)) {
        ++count;
      }
    }
    return count / filter.bitSize;
  }

  /**
   * Adds a value to the filter
   */
  add(value: string): void {
    const buf = this._filter;
    const size = buf.bitSize;
    for (const h of this._hashes) {
      h.hash(value);
      const v = h.result();
      buf.set(v % size, true);
      h.reset();
    }
  }

  /**
   * Returns whether the key exists or not in the filter.
   */
  has(value: string): boolean {
    const buf = this._filter;
    const size = buf.bitSize;
    for (const h of this._hashes) {
      h.hash(value);
      const v = h.result();
      h.reset();
      if (!buf.get(v % size)) {
        return false;
      }
    }
    return true;
  }

  clear(): BloomFilter {
    this._filter.clear();
    for (const hash of this._hashes) {
      hash.resetSeed();
    }
    return this;
  }
}
