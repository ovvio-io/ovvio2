import { DiffOperation } from 'diff-match-patch-typescript';

import Utils from '@ovvio/base/lib/utils';
import * as List from './list';
import * as Base from './base';
import Change from './change';
import { AnnotationMap } from './annotations-map';

const DIFF_DELETE = DiffOperation.DIFF_DELETE;
const DIFF_INSERT = DiffOperation.DIFF_INSERT;
const DIFF_EQUAL = DiffOperation.DIFF_EQUAL;

export function changesFromDiffs(textLen, diffs, handler) {
  const stepSize = Base.stepSizeForLength(textLen);
  const length = diffs.length;
  let text1Idx = 0;
  let text2Idx = 0;
  for (let changeIdx = 0; changeIdx < length; ++changeIdx) {
    const change = diffs[changeIdx];
    const op = change[0];
    const text = change[1];
    switch (op) {
      case DIFF_EQUAL:
        text1Idx += text.length;
        text2Idx += text.length;
        break;

      case DIFF_DELETE: {
        const ret = handler(
          text.length === 1 ? Base.CHANGE_DELETE : Base.CHANGE_DELETE_RANGE,
          text,
          text1Idx,
          stepSize * (text1Idx + 1),
          // End is inclusive so no need to add 1
          stepSize * (text1Idx + text.length),
          text2Idx
        );
        if (ret) {
          return;
        }
        // Deletion can mean either deletion (if followed by DIFF_EQUAL) or
        // replace (if followed by DIFF_INSERT). In the first case (deletion),
        // we need to increment our character index since the deletion reflects
        // a string that was present in the original text, and must be adjusted
        // for. In the case of a replace op, we need to increment the index
        // only after processing the insert (following the delete).
        if (changeIdx >= length - 1 || diffs[changeIdx + 1][0] != DIFF_INSERT) {
          text1Idx += text.length;
        }
        break;
      }

      case DIFF_INSERT: {
        const pos = stepSize * text1Idx + stepSize / 2;
        const ret = handler(
          Base.CHANGE_INSERT,
          text,
          text1Idx,
          pos,
          pos, // end === start on insert
          text2Idx
        );
        if (ret) {
          return;
        }
        // If we skipped incrementing the index (see above), we still need to do
        // it only after computing the insert's position
        if (changeIdx > 0 && diffs[changeIdx - 1][0] == DIFF_DELETE) {
          text1Idx += diffs[changeIdx - 1][1].length;
        }
        text2Idx += text.length;
        break;
      }
    }
  }
}

function _addRangeToSet(set, start, length) {
  const end = start + length;
  for (let x = start; x < end; ++x) {
    set.add(x);
  }
}

/**
 * This function generate change objects from a text diff. It also computes
 * the annotation changes that happened based on the previously calculated
 * text diff.
 *
 * @param text1 The original text.
 *
 * @param dmpDiff The diff that transforms text1 to text2.
 *
 * @param annMap1 Annotations map for text1.
 *
 * @param annMap2 Annotations map for text2.
 *
 * @param annKeysFilter A filter function that determines on what annotation
 *                      keys to compute the diff.
 *
 * @returns {changes: [ListChange], annChanges: [AnnotationChange],
 *           diff: dmpDiff}.
 */
function _generateDiffChanges(text1, dmpDiff, annMap1, annMap2, annKeysFilter) {
  const handledIndexes1 = new Set();
  const handledIndexes2 = new Set();
  const result = [];
  changesFromDiffs(
    text1.length,
    dmpDiff,
    (type, value, idx1, start, end, idx2) => {
      let annotations;
      if (type === Base.CHANGE_INSERT) {
        annotations = annMap2.annotationsMapForRange(
          idx2,
          idx2 + value.length,
          true,
          annKeysFilter
        );
        _addRangeToSet(handledIndexes2, idx2, value.length);
      } else {
        annotations = annMap1.annotationsMapForRange(
          idx1,
          idx1 + value.length,
          true,
          annKeysFilter
        );
        _addRangeToSet(handledIndexes1, idx1, value.length);
      }
      result.push(
        new List.ListChange(type, new PlainText(value, annotations), start, end)
      );
    }
  );
  const annChanges = new AnnDiff(
    text1,
    annMap1,
    annMap2,
    dmpDiff,
    handledIndexes1,
    handledIndexes2,
    annKeysFilter
  ).run();

  return {
    changes: result,
    diff: dmpDiff,
    annChanges: annChanges,
  };
}

/**
 * Computes and returns an array of List.ListChange instances
 * that transform text1 to text2.
 */
export function diffTexts(
  text1,
  text2,
  annMap1,
  annMap2,
  checklines = true,
  annKeysFilter = k => true
) {
  text1 = text1 || '';
  text2 = text2 || '';
  const textDiffs = Base.DMP.diff_main(text1, text2, checklines);
  if (textDiffs.length > 2) {
    Base.DMP.diff_cleanupSemantic(textDiffs);
  }

  return _generateDiffChanges(
    text1,
    textDiffs,
    annMap1,
    annMap2,
    annKeysFilter
  );
}

export function commonPrefixLen(str1, str2) {
  const len = Math.min(str1.length, str2.length);
  let end = 0;
  for (; end < len; ++end) {
    if (str1[end] !== str2[end]) {
      break;
    }
  }
  return end;
}

export function commonSuffixLen(str1, str2) {
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
function letterBoost(expected, input) {
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

export function wordDist(expected, input, clamp = false) {
  // Ignore case for all comparisons
  expected = expected.toLowerCase();
  input = input.toLowerCase();

  // Calculate distance based on levenshtein distance
  const diff = Base.DMP.diff_main(input, expected, false);
  const levenshteinDist = Base.DMP.diff_levenshtein(diff);
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

export function optimizeChanges(positionedList, changes, annChanges = []) {
  const insertionsByPos = new Map();
  const deletions = [];
  for (const c of changes) {
    if (c.kind !== Base.CHANGE_INSERT) {
      deletions.push(c);
      continue;
    }

    // Check for insertion collisions at a given index
    const value = c.value;
    const idx = positionedList.opIndexForPosition(c.start);
    const entry = insertionsByPos.get(idx);
    if (!entry) {
      // This is the first insert at this index. Nothing to do yet.
      insertionsByPos.set(idx, {
        value: value,
        pos: c.start,
      });
      continue;
    }

    // We have multiple insertions at the same point. We diff the values,
    // and join them by picking only insertions from the resulting diff. This
    // Ensures that the resulting insert op represents the values added by
    // both previous insertions.
    const text1 = entry.value.text;
    const text2 = value.text;
    const annMap1 = entry.value.annotationMap;
    const annMap2 = value.annotationMap;
    const diff = Base.DMP.diff_main(entry.value.text, value.text, false);

    // For large diffs we perform semantic cleanup so things make more sense
    // to the observing user. The result is, that if two insertions differ above
    // a certain threshold (levenshtein distance > 3), the two will split into
    // different words that represent the different logical "branches" the users
    // have created. For example, if user A inserted "Cat" and user B inserted
    // "Hats", without cleanup the result would be either "CHats" or "HCats".
    // However with cleanup, the result would be either "CatHats" or "HatsCat"
    // which better represents both users' intentions.
    //
    // TODO(ofri): Properly tune the threshold
    if (Base.DMP.diff_levenshtein(diff) > 3) {
      Base.DMP.diff_cleanupSemantic(diff);
    }

    // Generate changes from our diff
    const {
      changes: innerChanges,
      annChanges: innerAnnChanges,
    } = _generateDiffChanges(text1, diff, annMap1, annMap2, k => true);
    // Merge both text insertions by patching one on top of the other
    const patchResult = patchText(
      text1,
      innerChanges,
      annMap1,
      innerAnnChanges,
      true
    );
    // Update the change at this index with the result, which now combines both
    // previous changes.
    entry.value.text = patchResult.text;
    entry.value.annotationMap = patchResult.annMap;
  }
  // Since Map has its keys ordered by insertion, our indexes maintain their
  // original order in the changes list provided. We then re-pack them in a
  // changes array for output.
  const insertions = [];
  for (const idx of insertionsByPos.keys()) {
    const entry = insertionsByPos.get(idx);
    insertions.push(
      new List.ListChange(Base.CHANGE_INSERT, entry.value, entry.pos)
    );
  }
  // Always perform deletions before insertions. Deletions always refer to the
  // merge's base and will potentially wreak havoc if performed after
  // insertions.
  return deletions.concat(insertions);
}

function positionedListForPatch(text, annMap) {
  const patchArr = [];
  const len = text.length;
  for (let idx = 0; idx < len; ++idx) {
    patchArr.push(
      new PlainText(
        text[idx],
        annMap.annotationsMapForRange(idx, idx + 1, true)
      )
    );
  }
  return new List.PositionedList(patchArr);
}

function optimizeAnnChanges(annChanges) {
  const deletions = [];
  const insertions = [];
  for (const c of annChanges) {
    if (c.kind === Base.CHANGE_INSERT) {
      insertions.push(c);
    } else {
      deletions.push(c);
    }
  }
  return deletions.concat(insertions);
}

export function patchText(
  text,
  changes,
  annMap,
  annChanges,
  skipDeletion = false
) {
  const positionedList = positionedListForPatch(text, annMap);

  // First, apply any text level changes. Insertions also carry their
  // annotations in their value. Our optimization also knows how to handle
  // the internal annotation maps.
  changes = optimizeChanges(positionedList, changes);
  for (const c of changes) {
    if (!skipDeletion || c.kind === Base.CHANGE_INSERT) {
      positionedList.applyPatch(c.kind, c.value, c.start, c.end);
    }
  }

  // Apply annotation level changes. They can only touch parts of the text that
  // haven't been previously modified (as modifications are handled at the text
  // level changes). We require both a position match and a text match when or
  // we reject the change.
  annChanges = optimizeAnnChanges(annChanges);
  const stepSize = positionedList.stepSize;
  const threshold = stepSize * 0.25;
  for (const c of annChanges) {
    const count = c.text.length;
    // Applying ann changes is done per character. At this point all valid
    // changes are mutations to characters that "stayed in place" and weren't
    // affected by changes applied above. To do that, we first find the closest
    // index to our start index.
    const startIdx = positionedList.opIndexForPosition(c.position);
    // Skip if our starting index falls out of range
    if (startIdx >= positionedList.length) {
      continue;
    }

    // Next, go over each index from the start, match it against the expected
    // position, and apply only mutations that match.
    for (let i = 0; i < count; ++i) {
      const absIdx = startIdx + i;
      const pos = positionedList.positionForIndex(absIdx);
      // Skip inexact matches
      if (Math.abs(c.position + stepSize * i - pos) >= threshold) {
        continue;
      }
      const expectedText = c.text ? c.text[i] : null;
      const curValue = positionedList.getValue(absIdx);
      const value = c.value[0];
      const curAnnMap = curValue.annotationMap;

      // Technically this should never happen, but we also check that the actual
      // character matches.
      if (!expectedText || curValue.text === expectedText) {
        if (c.kind === Base.CHANGE_INSERT) {
          if (value) {
            curAnnMap.setValue(c.key, 0, value);
          }
        } else if (
          !skipDeletion &&
          Utils.deepEqual(curAnnMap.getValue(c.key, 0), value)
        ) {
          curAnnMap.deleteValue(c.key, 0);
        }
      }
    }
  }

  // Glue everything back to one big string and a matching single AnnotationMap
  let resultText = '';
  const resultAnn = new AnnotationMap();
  for (const v of positionedList.array) {
    const idx = resultText.length;
    resultText += v.text;
    resultAnn.update(v.annotationMap, idx);
  }

  return { text: resultText, annMap: resultAnn };
}

/**
 * A utility class for diffing two AnnotationMap, after the initial text-based
 * diff has been constructed. It outputs changes that happen only at the
 * annotation level and not at the text level.
 */
class AnnDiff {
  constructor(
    text1,
    annMap1,
    annMap2,
    dmpDiff,
    handledIndexes1,
    handledIndexes2,
    keysFilter
  ) {
    this.text1 = text1;
    this.stepSize = Base.stepSizeForLength(text1.length);
    this.annMap1 = annMap1;
    this.annMap2 = annMap2;
    this.changes = [];
    this.handledIndexes1 = handledIndexes1;
    this.handledIndexes2 = handledIndexes2;
    this.dmpDiff = dmpDiff;
    this.lastChange = null;
    this.lastIdx = null;
    this.modifiedIndexes = [];
    this.keysFilter = keysFilter;
  }

  run() {
    for (const key of this.annMap1.keys(this.keysFilter)) {
      this._calcDeletedIndexesForKey(key);
    }
    for (const key of this.annMap2.keys(this.keysFilter)) {
      this._calcModifiedIndexesForKey(key);
    }
    return this.changes;
  }

  _pushChange(key, kind, idx, value) {
    const lastChange = this.lastChange;
    const lastIdx = this.lastIdx;
    const text = this.text1[idx];

    if (value instanceof Map) {
      value = Base.mapToObj(value);
    }
    if (
      lastChange &&
      lastChange.kind === kind &&
      lastIdx + lastChange.text.length === idx &&
      Utils.deepEqual(lastChange.value, value)
    ) {
      lastChange.text += text;
    } else {
      this.lastChange = new AnnotationChange(
        key,
        kind,
        (idx + 1) * this.stepSize,
        value,
        text
      );
      this.lastIdx = idx;
      this.changes.push(this.lastChange);
    }
  }

  _pushModifiedIndexes() {
    if (!this.modifiedIndexes.length) {
      return;
    }

    for (const [key, idx, oldValue, text] of this.modifiedIndexes) {
      this._pushChange(key, Base.CHANGE_DELETE, idx, oldValue);
    }

    for (const [key, idx, _, newValue, text] of this.modifiedIndexes) {
      this._pushChange(key, Base.CHANGE_INSERT, idx, newValue);
    }

    this.modifiedIndexes = [];
  }

  _calcModifiedIndexesForKey(key) {
    const handledIndexes1 = this.handledIndexes1;
    const handledIndexes2 = this.handledIndexes2;
    const map1 = this.annMap1.getMap(key) || new Map();
    const map2 = this.annMap2.getMap(key) || new Map();
    const dmpDiff = this.dmpDiff;

    for (const idx2 of this.annMap2.sortedIndexesForKey(key)) {
      if (handledIndexes2.has(idx2)) {
        continue;
      }
      const idx1 = Base.projectIndex(idx2, dmpDiff, false);
      if (handledIndexes1.has(idx1)) {
        continue;
      }
      if (map1.has(idx1)) {
        const v1 = map1.get(idx1);
        const v2 = map2.get(idx2);
        if (!Utils.deepEqual(v1, v2)) {
          const oldSlice = new Map();
          oldSlice.set(0, v1);
          const newSlice = new Map();
          newSlice.set(0, v2);
          this.modifiedIndexes.push([key, idx1, oldSlice, newSlice]);
        }
      } else {
        this._pushModifiedIndexes();
        const slice = new Map();
        slice.set(0, map2.get(idx2));
        this._pushChange(key, Base.CHANGE_INSERT, idx1, slice);
      }
    }

    this._pushModifiedIndexes();
  }

  _calcDeletedIndexesForKey(key) {
    const handledIndexes1 = this.handledIndexes1;
    const handledIndexes2 = this.handledIndexes2;
    const map1 = this.annMap1.getMap(key);
    const map2 = this.annMap2.getMap(key) || new Map();
    const dmpDiff = this.dmpDiff;

    for (const idx1 of map1.keys()) {
      if (handledIndexes1.has(idx1)) {
        continue;
      }
      const idx2 = Base.projectIndex(idx1, dmpDiff);
      if (!handledIndexes2.has(idx2) && !map2.has(idx2)) {
        const slice = new Map();
        slice.set(0, map1.get(idx1));
        this._pushChange(key, Base.CHANGE_DELETE, idx1, slice);
      }
    }
  }
}

export class PlainText {
  constructor(text, annotationMap) {
    this.text = text;
    this.annotationMap = annotationMap || new AnnotationMap();
  }

  toJS() {
    return {
      t: this.text,
      a: this.annotationMap.toJS(),
    };
  }

  static fromJS(obj) {
    return new this(obj.t, AnnotationMap.fromJS(obj.a));
  }
}

export class AnnotationChange extends Change.BaseChange {
  constructor(key, kind, position, value, text) {
    super();
    this.key = key;
    this.kind = kind;
    this.position = position;
    // Annotation changes apply single index mutations
    const indexes = Object.keys(value);
    Utils.assert(indexes.length === 1 && (indexes[0] | 0) === 0);
    this.value = value;
    this.text = text;
  }

  get type() {
    return 'ANN';
  }

  toJSImpl() {
    return {
      key: this.key,
      k: this.kind,
      p: this.position,
      v: this.value,
      t: this.text,
    };
  }

  static fromJS(obj) {
    return new this(obj.key, obj.k, obj.p, obj.v, obj.t);
  }
}

Change.registerType('ANN', AnnotationChange);
