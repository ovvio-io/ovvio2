import {
  DiffMatchPatch as diff_match_patch,
  DiffOperation,
} from 'diff-match-patch-typescript';

const DIFF_DELETE = DiffOperation.DIFF_DELETE;
const DIFF_INSERT = DiffOperation.DIFF_INSERT;
const DIFF_EQUAL = DiffOperation.DIFF_EQUAL;

export const CHANGE_INSERT = 1;
export const CHANGE_OTHER = 2;
export const CHANGE_EQUAL = 0;
export const CHANGE_DELETE = -1;
export const CHANGE_DELETE_RANGE = -2;

export const SCALE_MIN = 0; // Zero for all practical purposes
export const SCALE_MAX = Number.MAX_VALUE;

export const DIR_AFTER = 1;
export const DIR_BEFORE = -1;
export const DIR_EXACT = 0;

const OP_INS = 1;
const OP_EQ = 0;
const OP_DEL = -1;

export const DMP = new diff_match_patch();
// WARNING: Timeout value must be aligned with
// @ovvio/cfds/server/server.js/UPDATE_TIMEOUT_MS or clients may be locked
// out after a disconnect, unable to send pending edits.
//
// TODO(dor): Configure with env
DMP.Diff_Timeout = 0.5;

export function scaleSizeForLength(len) {
  return len + 2;
}

export function stepSizeForLength(len) {
  return (SCALE_MAX - SCALE_MIN) / scaleSizeForLength(len);
  // return 1;
}

export function nativePositionsForLength(len) {
  if (!len) {
    return [];
  }
  const result = [];
  const stepSize = stepSizeForLength(len);
  for (let i = 0; i < len; ++i) {
    result.push(nativePositionForIndex(i, stepSize));
  }
  return result;
}

export function nativePositionForIndex(idx, stepSize) {
  return stepSize * (idx + 1);
}

export function copyDMPDiffs(diffs) {
  const result = [];
  for (let i = 0; i < diffs.length; ++i) {
    result.push(new diff_match_patch.Diff(diffs[i][0], diffs[i][1]));
  }
  return result;
}

/**
 * Given an index, a list of diffs and a direction, this function
 * projects idx either from the original text to the modified text
 * (forwards) or from the modified to the original text (backwards).
 *
 * The projected index is where the index would have been placed on
 * the other text.
 *
 * This is a slightly modified version of diff_match_patch.diff_xIndex()
 * that supports both directions of transformation.
 */
export function projectIndex(idx, diffs, forwards = true) {
  idx |= 0;
  let chars1 = 0;
  let chars2 = 0;
  let lastChars1 = 0;
  let lastChars2 = 0;
  let x;
  for (x = 0; x < diffs.length; ++x) {
    if (diffs[x][0] !== DIFF_INSERT) {
      // Equality or deletion.
      chars1 += diffs[x][1].length;
    }
    if (diffs[x][0] !== DIFF_DELETE) {
      // Equality or insertion.
      chars2 += diffs[x][1].length;
    }
    if ((forwards && chars1 > idx) || (!forwards && chars2 > idx)) {
      // Overshot the location.
      break;
    }
    lastChars1 = chars1;
    lastChars2 = chars2;
  }
  // Was the location was deleted?
  const diffType = forwards ? DIFF_DELETE : DIFF_INSERT;
  if (diffs.length !== x && diffs[x][0] === diffType) {
    return forwards ? lastChars2 : lastChars1;
  }
  // Add the remaining character length.
  return forwards
    ? lastChars2 + (idx - lastChars1)
    : lastChars1 + (idx - lastChars2);
}

export class IndexOffset {
  constructor(indexes = []) {
    this._indexes = new Set(indexes);
  }

  offsetIndex(idx, inclusive = true, forwards = true) {
    const indexes = this.sortedIndexes;
    let offset = 0;
    // Optimization: Instead of dooing a full lookup every
    // time we can cache the result from the previous call,
    // and add/subtract the offset for the current idx.
    //
    // Optimization 2: Use a binary search for finding idx's position,
    // then subtract the # of indexes.
    for (let i = 0; i < indexes.length; ++i) {
      if (
        (inclusive && indexes[i] <= idx) ||
        (!inclusive && indexes[i] < idx)
      ) {
        if (forwards) {
          ++idx;
        } else {
          ++offset;
        }
      } else {
        break;
      }
    }
    return forwards ? idx : idx - offset;
  }

  splitText(text, offset) {
    const start = this.offsetIndex(offset);
  }

  get length() {
    return this._indexes.size;
  }

  get indexes() {
    return this._indexes;
  }

  addIndex(idx) {
    idx = idx | 0;
    if (this._indexes.has(idx)) {
      return;
    }
    this._indexes.add(idx);
    delete this._sortedIndexes;
  }

  get sortedIndexes() {
    if (!this._sortedIndexes) {
      this._sortedIndexes = Array.from(this._indexes.values()).sort(
        (x, y) => x - y
      );
    }
    return this._sortedIndexes;
  }

  // _idxForOffset(offset) {
  //   const indexes = this.sortedIndexes;
  //   const idx = Utils.Array.bsearch_idx(
  //     indexes.length,
  //     idx => indexes[idx] - offset
  //   );
  //   if (indexes[idx] === offset) {
  //     return idx;
  //   }
  //   if (indexes[idx] > offset) {
  //     return idx - 1;
  //   }
  //   return idx + 1;
  // }
}

/**
 * Given a generator, this function yields an array in the form of
 * [prev, cur, next]. Prev being the previous value or undefined, cur being
 * the current value of the provided generator and next being the next value
 * or undefined.
 */
// function* prevCurNextGen(gen) {
//   let v0 = {};
//   let v1 = gen.next();
//   let v2 = undefined;
//   while (!v1.done) {
//     v2 = gen.next();
//     yield [v0.value, v1.value, v2.value];
//     v0 = v1;
//     v1 = v2;
//     v2 = {};
//   }
// }

// export function changesFromDiffs(length, diffsIter, handler) {
//   const stepSize = stepSizeForLength(length);
//   let list1Idx = 0;
//   let list2Idx = 0;
//   for (const [prev, cur, next] of prevCurNextGen(diffsIter)) {
//     const { op, len, data } = cur;
//     switch (op) {
//       case OP_EQ:
//         list1Idx += len;
//         list2Idx += len;
//         break;

//       case OP_DEL: {
//         const ret = handler(
//           len === 1 ? CHANGE_DELETE : CHANGE_DELETE_RANGE,
//           data,
//           list1Idx,
//           stepSize * (list1Idx + 1),
//           // End is inclusive so no need to add 1
//           stepSize * (list1Idx + len),
//           list2Idx
//         );
//         if (ret) {
//           return;
//         }
//         // Deletion can mean either deletion (if followed by OP_EQ) or
//         // replace (if followed by OP_INS). In the first case (deletion),
//         // we need to increment our character index since the deletion reflects
//         // a string that was present in the original text, and must be adjusted
//         // for. In the case of a replace op, we need to increment the index
//         // only after processing the insert (following the delete).
//         if (next && next.op !== OP_INS) {
//           list1Idx += len;
//         }
//         break;
//       }

//       case OP_INS: {
//         const pos = stepSize * list1Idx + stepSize / 2;
//         const ret = handler(CHANGE_INSERT, data, list1Idx, pos, pos, list2Idx);
//         if (ret) {
//           return;
//         }
//         // If we skipped incrementing the index (see above), we still need to do
//         // it only after computing the insert's position
//         if (prev && prev.op === OP_DEL) {
//           list1Idx += prev.len;
//         }
//         list2Idx += len;
//         break;
//       }
//     }
//   }
// }

// export function* dmpDiffIter(diff) {
//   for (const { 0: dmpOp, 1: text } of diff) {
//     let op;
//     if (dmpOp === DIFF_INSERT) {
//       op = OP_INS;
//     } else if (dmpOp === DIFF_DELETE) {
//       op = OP_DEL;
//     } else {
//       op = OP_EQ;
//     }
//     yield {
//       op: op,
//       len: text.length,
//       data: text
//     };
//   }
// }

export function mapToObj(map) {
  const result = {};
  if (!map) {
    return result;
  }
  for (const k of map.keys()) {
    result[k] = map.get(k);
  }
  return result;
}

export function objToMap(obj, keyTransform = x => x) {
  const result = new Map();
  for (const k of Object.keys(obj)) {
    result.set(keyTransform(k), obj[k]);
  }
  return result;
}
