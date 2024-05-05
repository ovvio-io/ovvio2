import { assert } from './error.ts';

// const K_BUFF_UNIT_SIZE = 64 * 1024;

// const gPendingBuffers: Uint8Array[] = [];
// const gLiveBuffers = new Map<Uint8Array, Uint8Array>();

// for (let i = 0; i < 10; ++i) {
//   gPendingBuffers.push(new Uint8Array(K_BUFF_UNIT_SIZE));
// }

export function allocateBuffer(minBytes: number): Uint8Array {
  // let cachedBuff: Uint8Array | undefined;
  // for (let i = 0; i < gPendingBuffers.length; ++i) {
  //   const buf = gPendingBuffers[i];
  //   if (buf.byteLength >= minBytes) {
  //     cachedBuff = gPendingBuffers.splice(i, 1)[0];
  //     assert(!gPendingBuffers.includes(buf));
  //     assert(!gLiveBuffers.has(buf));
  //     break;
  //   }
  // }
  // if (!cachedBuff) {
  //   cachedBuff = new Uint8Array(
  //     Math.max(1, Math.ceil(minBytes / K_BUFF_UNIT_SIZE)) * K_BUFF_UNIT_SIZE,
  //   );
  // }
  // if (cachedBuff) {
  //   assert(cachedBuff.byteLength >= minBytes); // Sanity check
  //   cachedBuff.fill(0);
  //   const res = cachedBuff.subarray(0, minBytes);
  //   gLiveBuffers.set(res, cachedBuff);
  //   assert(cachedBuff.byteLength >= minBytes); // Sanity check
  //   return res;
  // }
  return new Uint8Array(minBytes);
}

export function cacheBufferForReuse(buff: Uint8Array): void {
  // const origBuff = gLiveBuffers.get(buff);
  // if (origBuff) {
  //   origBuff.fill(0);
  //   gPendingBuffers.push(origBuff);
  //   gLiveBuffers.delete(buff);
  // }
}

export function decodeBase64(b64: string): Uint8Array {
  const binString = atob(b64);
  const size = binString.length;
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
}
