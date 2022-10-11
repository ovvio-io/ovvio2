export function splice(
  str: string,
  start: number,
  delCount: number,
  newSubStr: string
): string {
  return (
    str.slice(0, start) + newSubStr + str.slice(start + Math.abs(delCount))
  );
}

export function commonPrefixLen(str1: string, str2: string): number {
  const len = Math.min(str1.length, str2.length);
  let end = 0;
  for (; end < len; ++end) {
    if (str1[end] !== str2[end]) {
      break;
    }
  }
  return end;
}

export function commonSuffixLen(str1: string, str2: string): number {
  let idx1 = str1.length - 1;
  let idx2 = str2.length - 1;
  let count = 0;
  while (idx1 >= 0 && idx2 >= 0) {
    if (str1[idx1] !== str2[idx2]) {
      break;
    }
    ++count;
    --idx1;
    --idx2;
  }
  return count;
}

/**
 * Given an expected text and a user input, this functions calculates a boost
 * value between [0, 2.0] based on character similarity.
 */
function letterBoost(expected: string, input: string): number {
  const origChars = new Set(expected);
  let correctCount = 0;
  let wrongCount = 0;
  for (const c of input) {
    if (origChars.has(c)) {
      ++correctCount;
    } else {
      ++wrongCount;
    }
  }
  return 1.0 + (correctCount - wrongCount) / origChars.size;
}
