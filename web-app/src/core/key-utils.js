export function cleanupKey(key) {
  if (!key) return key;

  if (key.startsWith('notes/')) {
    return key.substring('notes/'.length);
  }

  if (key.startsWith('tags/')) {
    return key.substring('tags/'.length);
  }

  return key;
}
