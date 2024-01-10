const gBufferCache = new Map<number, Uint8Array[]>();
const gLiveBuffersMap = new WeakMap<Uint8Array, Uint8Array>();

const K_BUFF_UNIT_SIZE = 8 * 1024;

export function allocateBuffer(minBytes: number): Uint8Array {
  const allocationSize =
    Math.ceil(minBytes / K_BUFF_UNIT_SIZE) * K_BUFF_UNIT_SIZE;
  for (const size of Array.from(gBufferCache.keys()).sort((x, y) => y - x)) {
    if (size >= minBytes) {
      const cachedBuffers = gBufferCache.get(size)!;
      const buffer = cachedBuffers.pop();
      if (cachedBuffers.length <= 0) {
        gBufferCache.delete(size);
      }
      if (buffer) {
        buffer.fill(0);
        const res = buffer.slice(0, minBytes);
        gLiveBuffersMap.set(res, buffer);
        return res;
      }
    }
  }
  const buffer = new Uint8Array(allocationSize);
  const res = buffer.slice(0, minBytes);
  gLiveBuffersMap.set(res, buffer);
  return res;
}

export function cacheBufferForReuse(buff: Uint8Array): void {
  const size = buff.byteLength;
  let arr = gBufferCache.get(size);
  if (!arr) {
    arr = [];
    gBufferCache.set(size, arr);
  }

  const origBuff = buff;
  if (gLiveBuffersMap.has(origBuff)) {
    buff = gLiveBuffersMap.get(origBuff) || buff;
    gLiveBuffersMap.delete(origBuff);
  }
  arr.push(buff);
}

export function decodeBase64(b64: string): Uint8Array {
  const binString = atob(b64);
  const size = binString.length;
  const bytes = allocateBuffer(size);
  for (let i = 0; i < size; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
}
