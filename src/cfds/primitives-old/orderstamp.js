import * as ELEN from 'elen';
import Utils from '@ovvio/base/lib/utils';
import { commonPrefixLen } from './plaintext';

const CHAR_CODE_MIN = 1; // Skip the null character to avoid possible problems
// Note: Theoretically we can use the entire UTF-16 character space, however
// some parts of our pipeline can't handle higher value characters properly
// so we're sticking to single byte characters
const CHAR_CODE_MAX = 254; // Exclusive. Reserves char 254 for right edge
const RANDOM_SUFFIX_LEN = 16;

const MIN_REF_DATE = new Date(1420074000000); // 1/1/2015 @ 01:00:00 GMT

/**
 * Returns an order stamp representing now, which is the greatest possible
 * value based on the current time.
 *
 * The result should be used to insert at the edge of the list.
 */
export function present() {
  return fromTimestamp(new Date(), Utils.uniqueId());
}

/**
 * Returns a fixed order stamp in the past which can be used to insert at the
 * opposite edge from now().
 */
export function past() {
  return fromTimestamp(MIN_REF_DATE, Utils.uniqueId());
}

/**
 * Generates an initial order stamp based on a timestamp and a unique id.
 * You should pass the key of the item (card) you're dealing with rather than
 * generate a unique id on every call.
 */
export function fromTimestamp(timestamp, key) {
  return ELEN.encode(Utils.serializeDate(timestamp)) + key;
}

/**
 * Given two order stamps, this function generates and returns a value between
 * them. To generate values at the edge of the list (top/bottom), pass the
 * values of present() or past() as needed.
 *
 * Note: You can pass the values in any order you like.
 */
export function between(prev, next) {
  // Sanity check. If prev and next are equal, there's no way to generate a
  // value between them.
  Utils.assert(prev !== next);

  // Make sure values are in the correct order
  if (prev > next) {
    const tmp = next;
    next = prev;
    prev = tmp;
  }

  // prev has length <= next, and shares a common prefix with next
  const prefixLen = commonPrefixLen(prev, next);
  let result = prev.substring(0, prefixLen);

  // First char after shared prefix is guaranteed to be smaller in prev than
  // in next. Note that it may not actually exist (if prev is shorter than next)
  const minChar =
    prefixLen < prev.length ? prev.charCodeAt(prefixLen) : CHAR_CODE_MIN;
  const maxChar = next.charCodeAt(prefixLen);
  // Append a random char between prev[prefixLen] and next[prefixLen]. This
  // will place our result before next but also before prev.
  result += String.fromCharCode(Utils.randomInt(minChar, maxChar));

  // Search prev from prefixLen+1 to its end
  for (let i = prefixLen + 1; i < prev.length; ++i) {
    const charCode = prev.charCodeAt(i);
    // If we found a char less than MAX, generate a char greater than that
    // which will place our result *after* next.
    if (charCode < CHAR_CODE_MAX) {
      result += String.fromCharCode(
        Utils.randomInt(charCode + 1, CHAR_CODE_MAX)
      );
      break;
    } else {
      // If we found the MAX char, copy it and try again on the following char.
      result += String.fromCharCode(charCode);
    }
  }

  // At this point we can guarantee that:
  //
  // - Our result comes before next
  //
  // - If prev was long enough and not filled with MAX chars, then our result
  //   also comes after prev
  //
  // In any case, we append a random sequence for two reasons:
  //
  // 1. Guarantee that result comes after prev (due to greater length for a
  //    short prev).
  //
  // 2. Guarantee that no two clients pick the same value even if they try to
  //    generate a stamp between the same values. This creates a (random) total
  //    order on the results of all parties.
  for (let j = 0; j < RANDOM_SUFFIX_LEN; ++j) {
    result += String.fromCharCode(
      Utils.randomInt(CHAR_CODE_MIN, CHAR_CODE_MAX)
    );
  }
  return result;
}
