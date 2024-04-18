const K_BUFF_UNIT_SIZE = 16 * 1024;

const gPendingBuffers: Uint8Array[] = [];
const gLiveBuffers = new Map<Uint8Array, Uint8Array>();

for (let i = 0; i < 10; ++i) {
  gPendingBuffers.push(new Uint8Array(K_BUFF_UNIT_SIZE));
}

export function allocateBuffer(minBytes: number): Uint8Array {
  let cachedBuff: Uint8Array | undefined;
  for (let i = 0; i < gPendingBuffers.length; ++i) {
    const buf = gPendingBuffers[i];
    if (buf.byteLength >= minBytes) {
      cachedBuff = gPendingBuffers.splice(i, 1)[0];
      break;
    }
  }
  if (!cachedBuff) {
    cachedBuff = new Uint8Array(
      Math.max(1, Math.ceil(minBytes / K_BUFF_UNIT_SIZE)) * K_BUFF_UNIT_SIZE,
    );
  }
  if (cachedBuff) {
    cachedBuff.fill(0);
    const res = cachedBuff.subarray(0, minBytes);
    gLiveBuffers.set(res, cachedBuff);
    return res;
  }
  return new Uint8Array(minBytes);
}

export function cacheBufferForReuse(buff: Uint8Array): void {
  const origBuff = gLiveBuffers.get(buff);
  if (origBuff) {
    gPendingBuffers.push(origBuff);
    gLiveBuffers.delete(buff);
  }
}

export function decodeBase64(b64: string): Uint8Array {
  const binString = atob(b64);
  const size = binString.length;
  const bytes = allocateBuffer(size);
  for (let i = 0; i < size; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  cacheBufferForReuse(bytes);
  return bytes;
}
