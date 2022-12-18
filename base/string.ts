import { assert } from './error.ts';

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

/**
 * Given a string and an index, this function returns the char code at the
 * given index, plus one index before/after it in the case of a unicode
 * surrogate pairs.
 *
 * Shamelessly taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt
 *
 * @param str The string to extract from.
 * @param idx The index of the requested code.
 * @returns A fixed char code.
 */
export function fixedCharCodeAt(str: string, idx: number): number {
  if (idx < 0 || idx >= str.length) {
    return 0;
  }
  const code = str.charCodeAt(idx);
  // High surrogate (could change last hex to 0xDB7F to treat high private
  // surrogates as single characters)
  if (0xd800 <= code && code <= 0xdbff) {
    const hi = code;
    const low = str.charCodeAt(idx + 1);
    assert(
      !isNaN(low),
      'High surrogate not followed by low surrogate in fixedCharCodeAt()'
    );
    return (hi - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000;
  }
  if (0xdc00 <= code && code <= 0xdfff) {
    // Low surrogate
    // We return false to allow loops to skip this iteration since should have
    // already handled high surrogate above in the previous iteration
    const hi = str.charCodeAt(idx - 1);
    const low = code;
    return (hi - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000;
  }
  return code;
}

/**
 * Given a string, this function returns a new string, that's lexicographically
 * greater by 1. That means, it'll compare greater than the given string, and
 * no other string can be inserted between the input and the result.
 *
 * @param str The input string.
 * @returns A string that compares greater by 1.
 */
export function increment(str: string): string {
  const code = fixedCharCodeAt(str, str.length - 1);
  // 0x10FFFF is the highest code point encodable to UTF-16. If the last char
  // is lesser than it, we can simply increment it
  if (code < 0x10ffff) {
    return str.substring(0, str.length - 1) + String.fromCodePoint(code + 1);
  }
  // Can't increment last character, so must add a character
  return str + String.fromCharCode(1);
}

/**
 * Given a string, this function returns a new string, that's lexicographically
 * lesser by 1. That means, it'll compare less than the given string, and
 * no other string can be inserted between the input and the result.
 *
 * @param str The input string.
 * @returns A string that compares smaller by 1.
 */
export function decrement(str: string): string {
  const code = fixedCharCodeAt(str, str.length - 1);
  // If our last character is already the lowest value, we must shorten the
  // string.
  if (code < 1) {
    return str.length > 1 ? str.substring(0, str.length - 1) : '';
  }
  // Decrement the last character if we can
  return str + String.fromCharCode(code - 1);
}

export function appendPathComponent(path: string, ...comps: string[]): string {
  for (const c of comps) {
    if (path.endsWith('/') || c.startsWith('/')) {
      path += c;
    } else {
      path = `${path}/${c}`;
    }
  }
  return path;
}

const ltrChars =
  'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF' +
  '\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF';
const rtlChars = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC';
const dirRegex = new RegExp('^[^' + ltrChars + ']*[' + rtlChars + ']');

export function isRTL(s: string): boolean {
  return dirRegex.test(s);
}
