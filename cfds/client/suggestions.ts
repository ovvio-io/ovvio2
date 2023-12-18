import { commonPrefixLen, commonSuffixLen } from '../../base/string.ts';
import { kDMP } from '../base/defs.ts';

const MIN_SUGGESTIONS = 10;

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

export function wordDist(
  expected: string,
  input: string,
  clamp = false
): number {
  // Ignore case for all comparisons
  expected = expected.toLowerCase();
  input = input.toLowerCase();

  // Calculate distance based on levenshtein distance
  const diff = kDMP.diff_main(input, expected, false);
  const levenshteinDist = kDMP.diff_levenshtein(diff);
  // Boost by character similarity
  const weightedLevenDist =
    Math.max(0, 1.0 - levenshteinDist / expected.length) *
    letterBoost(expected, input);

  // Also explicitly check for prefix/suffix match
  const preDist = Math.min(
    1,
    // Boost by 10x prefix match so exact prefix always wins
    (3 * commonPrefixLen(expected, input)) / expected.length
  );
  const sufDist = commonSuffixLen(expected, input) / expected.length;

  let dist = Math.max(weightedLevenDist, preDist, sufDist);
  if (clamp) {
    dist = Math.min(1.0, Math.max(0.0, dist));
  }
  return dist;
}

function splitWords(str: string) {
  return str.split(/\s+/u);
}

function phraseDist(expected: string, input: string): number {
  const expectedWords = splitWords(expected);
  const inputWords = splitWords(input);
  let matchCount = 0;
  let matchSum = 0;
  for (const iw of inputWords) {
    for (const ew of expectedWords) {
      const dist = wordDist(ew, iw);
      matchSum += dist;
      ++matchCount;
    }
  }
  return matchCount === 0 ? 0 : matchSum / matchCount;
}

type SuggestionEntry<T> = [dist: number, value: T];

export function suggestResults<T>(
  userInput: string,
  values: T[],
  getValue: (v: T) => string = (v) => v as unknown as string,
  maxOutput?: number
): T[] {
  // const matchThreshold = 0.3;
  const entries: SuggestionEntry<T>[] = [];
  for (const v of values) {
    const dist = phraseDist(getValue(v), userInput);
    if (dist > 0 || userInput.length === 0) {
      entries.push([dist, v]);
    }
  }
  {
    maxOutput = maxOutput ? maxOutput : MIN_SUGGESTIONS;
  }
  return entries
    .sort((e1, e2) => e2[0] - e1[0])
    .slice(0, maxOutput)
    .map((e) => e[1]);
}
