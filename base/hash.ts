import { randomInt } from './math.ts';

/**
 * JS Implementation of MurmurHash2
 *
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 *
 * @param {string} str ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash
 *
 * Modified by Ofri Wolfus: Added TS types.
 *
 * License:
Copyright (c) 2011 Gary Court

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
export function murmurhash2_32_gc(str: string, seed: number): number {
  let l = str.length,
    h = seed ^ l,
    i = 0,
    k;

  while (l >= 4) {
    k =
      (str.charCodeAt(i) & 0xff) |
      ((str.charCodeAt(++i) & 0xff) << 8) |
      ((str.charCodeAt(++i) & 0xff) << 16) |
      ((str.charCodeAt(++i) & 0xff) << 24);

    k =
      (k & 0xffff) * 0x5bd1e995 + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16);
    k ^= k >>> 24;
    k =
      (k & 0xffff) * 0x5bd1e995 + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16);

    h =
      ((h & 0xffff) * 0x5bd1e995 +
        ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^
      k;

    l -= 4;
    ++i;
  }

  switch (l) {
    case 3:
      h ^= (str.charCodeAt(i + 2) & 0xff) << 16;
    /* falls through */
    case 2:
      h ^= (str.charCodeAt(i + 1) & 0xff) << 8;
    /* falls through */
    case 1:
      h ^= str.charCodeAt(i) & 0xff;
      h =
        (h & 0xffff) * 0x5bd1e995 +
        ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16);
  }

  h ^= h >>> 13;
  h = (h & 0xffff) * 0x5bd1e995 + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16);
  h ^= h >>> 15;

  return h >>> 0;
}

/*
The MIT License (MIT)

Copyright (c) 2013 Gary Court, Jens Taylor

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
// https://github.com/jensyt/imurmurhash-js
// Modified to a TypeScript class by Ofri Wolfus
export class MurmurHash3 {
  private h1: number;
  private rem: number;
  private k1: number;
  private len: number;

  public seed: number;

  constructor(seed?: number) {
    if (seed === undefined) {
      seed = randomInt(0, Number.MAX_SAFE_INTEGER);
    }
    this.seed = seed!;
    this.h1 = seed!;
    this.rem = this.k1 = this.len = 0;
  }

  /**
   * Reset the hash object for reuse
   * @param {number} seed An optional positive integer
   */
  reset(seed?: number): MurmurHash3 {
    if (seed !== undefined) {
      this.seed = seed;
    }
    this.h1 = this.seed;
    this.rem = this.k1 = this.len = 0;
    return this;
  }

  resetSeed(): MurmurHash3 {
    return this.reset(randomInt(0, Number.MAX_SAFE_INTEGER));
  }

  /**
   * Incrementally add a string to this hash
   *
   * @param {string} key A UTF-16 or ASCII string
   * @return {object} this
   */
  hash(key: string): MurmurHash3 {
    let h1, k1, i, top, len;

    len = key.length;
    this.len += len;

    k1 = this.k1;
    i = 0;
    switch (this.rem) {
      case 0:
        k1 ^= len > i ? key.charCodeAt(i++) & 0xffff : 0;
      /* falls through */
      case 1:
        k1 ^= len > i ? (key.charCodeAt(i++) & 0xffff) << 8 : 0;
      /* falls through */
      case 2:
        k1 ^= len > i ? (key.charCodeAt(i++) & 0xffff) << 16 : 0;
      /* falls through */
      case 3:
        k1 ^= len > i ? (key.charCodeAt(i) & 0xff) << 24 : 0;
        k1 ^= len > i ? (key.charCodeAt(i++) & 0xff00) >> 8 : 0;
    }

    this.rem = (len + this.rem) & 3; // & 3 is same as % 4
    len -= this.rem;
    if (len > 0) {
      h1 = this.h1;
      while (1) {
        k1 = (k1 * 0x2d51 + (k1 & 0xffff) * 0xcc9e0000) & 0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = (k1 * 0x3593 + (k1 & 0xffff) * 0x1b870000) & 0xffffffff;

        h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
        h1 = (h1 * 5 + 0xe6546b64) & 0xffffffff;

        if (i >= len) {
          break;
        }

        k1 =
          (key.charCodeAt(i++) & 0xffff) ^
          ((key.charCodeAt(i++) & 0xffff) << 8) ^
          ((key.charCodeAt(i++) & 0xffff) << 16);
        top = key.charCodeAt(i++);
        k1 ^= ((top & 0xff) << 24) ^ ((top & 0xff00) >> 8);
      }

      k1 = 0;
      switch (this.rem) {
        case 3:
          k1 ^= (key.charCodeAt(i + 2) & 0xffff) << 16;
        /* falls through */
        case 2:
          k1 ^= (key.charCodeAt(i + 1) & 0xffff) << 8;
        /* falls through */
        case 1:
          k1 ^= key.charCodeAt(i) & 0xffff;
      }

      this.h1 = h1;
    }

    this.k1 = k1;
    return this;
  }

  private _tmpK1 = 0;
  private _tmpH1 = 0;

  /**
   * Get the result of this hash.
   * @return {number} The 32-bit hash.
   */
  result(): number {
    this._tmpK1 = this.k1;
    this._tmpK1 = this.h1;

    if (this._tmpK1 > 0) {
      this._tmpK1 =
        (this._tmpK1 * 0x2d51 + (this._tmpK1 & 0xffff) * 0xcc9e0000) &
        0xffffffff;
      this._tmpK1 = (this._tmpK1 << 15) | (this._tmpK1 >>> 17);
      this._tmpK1 =
        (this._tmpK1 * 0x3593 + (this._tmpK1 & 0xffff) * 0x1b870000) &
        0xffffffff;
      this._tmpK1 ^= this._tmpK1;
    }

    this._tmpK1 ^= this.len;

    this._tmpK1 ^= this._tmpK1 >>> 16;
    this._tmpK1 =
      (this._tmpK1 * 0xca6b + (this._tmpK1 & 0xffff) * 0x85eb0000) & 0xffffffff;
    this._tmpK1 ^= this._tmpK1 >>> 13;
    this._tmpK1 =
      (this._tmpK1 * 0xae35 + (this._tmpK1 & 0xffff) * 0xc2b20000) & 0xffffffff;
    this._tmpK1 ^= this._tmpK1 >>> 16;

    return this._tmpK1 >>> 0;
  }
  // result(): number {
  //   let k1, h1;

  //   k1 = this.k1;
  //   h1 = this.h1;

  //   if (k1 > 0) {
  //     k1 = (k1 * 0x2d51 + (k1 & 0xffff) * 0xcc9e0000) & 0xffffffff;
  //     k1 = (k1 << 15) | (k1 >>> 17);
  //     k1 = (k1 * 0x3593 + (k1 & 0xffff) * 0x1b870000) & 0xffffffff;
  //     h1 ^= k1;
  //   }

  //   h1 ^= this.len;

  //   h1 ^= h1 >>> 16;
  //   h1 = (h1 * 0xca6b + (h1 & 0xffff) * 0x85eb0000) & 0xffffffff;
  //   h1 ^= h1 >>> 13;
  //   h1 = (h1 * 0xae35 + (h1 & 0xffff) * 0xc2b20000) & 0xffffffff;
  //   h1 ^= h1 >>> 16;

  //   return h1 >>> 0;
  // }
}

const sharedMurmur3 = new MurmurHash3();

export function murmur3(value: string, seed?: number): number {
  sharedMurmur3.reset(seed);
  sharedMurmur3.hash(value);
  return sharedMurmur3.result();
}

// cyrb53 (c) 2018 bryc (github.com/bryc). License: Public domain. Attribution appreciated.
// A fast and simple 64-bit (or 53-bit) string hash function with decent collision resistance.
// Largely inspired by MurmurHash2/3, but with a focus on speed/simplicity.
// See https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript/52171480#52171480
// https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
const defaultCyrb64Seed = randomInt(0, Number.MAX_SAFE_INTEGER);
export function cyrb64(str: string, seed = defaultCyrb64Seed): number {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
