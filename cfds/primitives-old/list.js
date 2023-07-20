// import { diff as arrayDiff } from "fast-array-diff";
import stableStringify from 'json-stable-stringify';

import Utils from '@ovvio/base/lib/utils';
import * as Base from './base';
import Change from './change';

// export function diff(
//   len1,
//   len2,
//   getter1 = idx => {
//     throw Error('Bad getter');
//   },
//   getter2 = idx => {
//     throw Error('Bad getter');
//   },
//   comparator = (idx1, idx2) => {
//     throw Error('Bad comparator');
//   },
//   rangeDelete = false
// ) {
//   const result = [];
//   if (!len1 && !len2) {
//     return result;
//   }

//   const stepSize = Base.stepSizeForLength(len1);

//   if (!len1 && len2) {
//     for (let i = 0; i < len2; ++i) {
//       result.push(
//         new ListChange(
//           Base.CHANGE_INSERT,
//           getter2(i),
//           (Base.SCALE_MAX - Base.SCALE_MIN) / 2.0
//         )
//       );
//     }
//     return result;
//   }

//   if (len1 && !len2) {
//     if (rangeDelete) {
//       const values = [];
//       for (let i = 0; i < len1; ++i) {
//         values.push(getter1(i));
//       }
//       result.push(
//         new ListChange(
//           Base.CHANGE_DELETE_RANGE,
//           values,
//           Base.SCALE_MIN,
//           Base.SCALE_MAX
//         )
//       );
//     } else {
//       for (let i = 0; i < len1; ++i) {
//         result.push(
//           new ListChange(
//             Base.CHANGE_DELETE,
//             getter1(i),
//             stepSize * (i + 1)
//           )
//         );
//       }
//     }
//     return result;
//   }
//   /*
//    * We really need a better Myers Diff implementation which
//    * doesn't do the actual array access on its own. This will save the redundent
//    * index arrays allocation.
//    *
//    * TODO(ofri): Custom implementation for Myers Diff that operates on indexes.
//    */
//   const arr1 = [];
//   const arr2 = [];
//   for (let i = 0; i < len1; ++i) arr1.push(i);
//   for (let i = 0; i < len2; ++i) arr2.push(i);

//   const d = arrayDiff(arr1, arr2, comparator);

//   // Deletions
//   for (let x = 0; x < d.removed.length; ++x) {
//     const start = d.removed[x];
//     // Forward lookup so we can detect range deletions
//     let end = start;
//     let y = x + 1;
//     if (rangeDelete) {
//       for (; y < d.removed.length; ++y) {
//         if (d.removed[y] !== end + 1) {
//           break;
//         }
//         ++end;
//       }
//     }
//     if (end > start) {
//       // Range deletion
//       const values = [];
//       for (let x = start; x <= end; ++x) {
//         values.push(getter1(x));
//       }
//       result.push(
//         new ListChange(
//           Base.CHANGE_DELETE_RANGE,
//           values,
//           stepSize * (start + 1),
//           stepSize * (end + 1)
//         )
//       );
//       x = y;
//     } else {
//       // Single deletion
//       result.push(
//         new ListChange(
//           Base.CHANGE_DELETE,
//           getter1(start),
//           stepSize * (start + 1)
//         )
//       );
//     }
//   }

//   // Insertions
//   const forwardOffset = new Base.IndexOffset(d.removed);
//   let offset = 0;
//   d.added.forEach(idx => {
//     result.push(
//       new ListChange(
//         Base.CHANGE_INSERT,
//         getter2(idx),
//         stepSize * forwardOffset.offsetIndex(idx - offset) +
//           stepSize / 2
//       )
//     );
//     ++offset;
//   });
//   return result;
// }

// export function simpleDiff(
//   arr1,
//   arr2,
//   comparator = (v1, v2) => v1 === v2,
//   deleteRange = false
// ) {
//   return diff(
//     arr1 ? arr1.length : 0,
//     arr2 ? arr2.length : 0,
//     idx1 => arr1[idx1],
//     idx2 => arr2[idx2],
//     (idx1, idx2) => comparator(arr1[idx1], arr2[idx2]),
//     deleteRange
//   );
// }

export class PositionedList {
  constructor(arr = []) {
    if (Utils.isString(arr)) {
      arr = arr.split('');
    }
    this.contents = arr || [];
    this.stepSize = Base.stepSizeForLength(this.contents.length);
    this.positions = Base.nativePositionsForLength(this.contents.length);
  }

  get length() {
    return this.contents.length;
  }

  positionForIndex(idx) {
    if (idx < 0) {
      return Base.SCALE_MIN;
    }
    if (idx >= this.positions.length) {
      return Base.SCALE_MAX;
    }
    return this.positions[idx];
  }

  /**
   * Given a position value, this function returns the index closest
   * to the position. The returned result is an array with two values:
   * [index, direction] where direction is one of DIR_AFTER, DIR_BEFORE or DIR_EXACT.
   */
  indexForPosition(pos) {
    // First do a binary search for the desired position. This is
    // possible since positions are, by definition, sorted.
    const result = Utils.Algorithms.bsearch_idx(this.positions.length, idx => {
      return pos - this.positionForIndex(idx);
    });
    // BSearch returns an exact index or one that's next to the
    // desired position if the position isn't found (which happens a
    // lot due to floating point precision). We now calculate the
    // position of result, result-1 and result+1, and return the one
    // that's closest to the desired position. BSearch will never
    // miss by more than one index.
    const resultPos = this.positionForIndex(result);
    const prevIdx = result > 0 ? result - 1 : result;
    const nextIdx = result < this.positions.length - 1 ? result + 1 : result;
    const prevPos = this.positionForIndex(prevIdx);
    const nextPos = this.positionForIndex(nextIdx);
    const deltaPos = Math.abs(resultPos - pos);
    const deltaPrev = Math.abs(pos - prevPos);
    const deltaNext = Math.abs(nextPos - pos);
    if (deltaPrev < deltaPos && deltaPrev < deltaNext) {
      // We're coming from "the right" of prev, so insert direction should
      // be after prevIdx
      return [prevIdx, Base.DIR_AFTER];
    }
    if (deltaNext < deltaPos && deltaNext < deltaPrev) {
      // We're to the "left" of next so insertion should happen before
      // nextIdx
      return [nextIdx, Base.DIR_BEFORE];
    }
    if (resultPos - pos > 0) {
      return [result, Base.DIR_BEFORE];
    }
    if (resultPos - pos < 0) {
      return [result, Base.DIR_AFTER];
    }
    return [result, Base.DIR_EXACT];
  }

  /**
   * indexForPositions() returns the closest index for the given
   * position however operations such as insert/delete are always done
   * before the specified index. This method adjusts the index based
   * on the direction returned so regular array operations get the
   * correct index.
   */
  opIndexForPosition(pos) {
    const desc = this.indexForPosition(pos);
    let idx = desc[0];
    if (desc[1] === Base.DIR_AFTER) {
      ++idx;
    }
    return idx;
  }

  /**
   * Inserts the given value at the provided position. Multiple insertions at
   * the same point will order the values from left to right. For example,
   * given the array ['a', 'b'] insertion of 'c' followed by 'd' between
   * 'a' and 'b' will maintain the order and result in ['a', 'c', 'd', 'b'].
   */
  insert(value, pos) {
    const idx = this.opIndexForPosition(pos);
    const prevPos = this.positionForIndex(idx - 1);
    this.contents.splice(idx, 0, value);
    // By adjusting the position left we guarantee that future
    // insertions are done after this one. For example, given
    // the values [1, 2, 3], an insertion at 1.5 would end up
    // at (1.5 + 1) / 2 == 1.25. A second insertion at 1.5 would
    // end up at (1.25 + 1.5) / 2 === 1.375.
    // This can go on indefinitely since our scale is continuous,
    // and causes multiple insertions to order correctly.
    this.positions.splice(idx, 0, prevPos / 2.0 + pos / 2.0);
    this.invalidateCaches();
  }

  /**
   * Attempts to delete a value at the given position. If the exact position
   * can't be found and the strict flag is true, the deletion is a NOP. This
   * is what you usually want and makes the operation idempotent. When strict
   * is false, deletion will be carried anyway on the value nearest the given
   * position. For example:
   *
   * Values: ['a', 'b', 'c'], Positions: [0, 1, 2].
   *
   * With strict mode:
   * 1. Delete(2, strict = true) => ['a', 'c']
   * 2. Delete(2, strict = true) => ['a', 'c']
   *
   * Without strict mode:
   * 1. Delete(2, strict = false) => ['a', 'c']
   * 2. Delete(2, strict = false) => ['a']
   */
  delete(pos, strict = true) {
    const idx = this.opIndexForPosition(pos);
    // We require an exact match at the index so deletions don't remove
    // unexpected values
    if (
      idx >= 0 &&
      idx < this.contents.length &&
      (!strict || Utils.numbersEqual(this.positionForIndex(idx), pos))
    ) {
      this.contents.splice(idx, 1);
      this.positions.splice(idx, 1);
      this.invalidateCaches();
    }
  }

  deleteRange(startPos, endPos, strict = true) {
    let startIdx = this.opIndexForPosition(startPos);
    let endIdx = this.opIndexForPosition(endPos);

    if (strict) {
      if (
        !Utils.numbersEqual(this.positionForIndex(startIdx), startPos) ||
        !Utils.numbersEqual(this.positionForIndex(endIdx), endPos)
      ) {
        return;
      }
    }

    startIdx = Math.max(0, startIdx);
    endIdx = Math.min(endIdx, this.contents.length - 1);
    if (endIdx >= startIdx) {
      this.contents.splice(startIdx, endIdx - startIdx + 1);
      this.positions.splice(startIdx, endIdx - startIdx + 1);
      this.invalidateCaches();
    }
  }

  setValue(idx, value) {
    Utils.assert(idx >= 0 && idx < this.contents.length, 'Index out of range');
    this.contents[idx] = value;
  }

  getValue(idx) {
    Utils.assert(idx >= 0 && idx < this.contents.length, 'Index out of range');
    return this.contents[idx];
  }

  get array() {
    return this.contents;
  }

  patch(change, valueModifier = x => x) {
    // switch (change.kind) {
    //   case Base.CHANGE_INSERT:
    //     this.insert(valueModifier(change.value), change.start);
    //     break;

    //   case Base.CHANGE_DELETE:
    //     this.delete(change.start);
    //     break;

    //   case Base.CHANGE_DELETE_RANGE:
    //     this.deleteRange(change.start, change.end);
    //     break;

    //   default:
    //     console.error("Unknown change of kind: " + change.kind);
    //     break;
    // }
    this.applyPatch(
      change.kind,
      change.value,
      change.start,
      change.end,
      valueModifier
    );
  }

  applyPatch(kind, value, start, end, valueModifier = x => x) {
    switch (kind) {
      case Base.CHANGE_INSERT:
        this.insert(valueModifier(value), start);
        break;

      case Base.CHANGE_DELETE:
        this.delete(start);
        break;

      case Base.CHANGE_DELETE_RANGE:
        this.deleteRange(start, end);
        break;

      default:
        console.error('Unknown change of kind: ' + kind);
        break;
    }
  }

  applyChanges(changes, valueModifier = x => x) {
    for (const c of changes) {
      this.patch(c, valueModifier);
    }
  }

  invalidateCaches() {
    // Override in subclasses as needed
  }
}

// Warning: Mutates baseArr in place.
export function patch(baseArr, changes1, changes2, valueModifier = x => x) {
  // const positionedList = new PositionedList(baseArr);
  // const appliedChanges = new Set();
  // changes1.forEach(c => {
  //   const key = c.uniqueId();
  //   if (!appliedChanges.has(key)) {
  //     appliedChanges.add(key);
  //     positionedList.patch(c, valueModifier);
  //   }
  // });
  // changes2.forEach(c => {
  //   const key = c.uniqueId();
  //   if (!appliedChanges.has(key)) {
  //     appliedChanges.add(key);
  //     positionedList.patch(c, valueModifier);
  //   }
  // });
  // return positionedList.array;
  return patch2(baseArr, changes1.concat(changes2), {
    valueModifier: valueModifier,
  }).array;
}

export function patch2(
  arr,
  changes,
  { valueModifier = x => x, indexes = [] } = {}
) {
  const positionedList = new PositionedList(baseArr);
  const appliedChanges = new Set();
  const indexMap = new Map();
  for (let idx of indexes) {
    indexMap.set(idx, positionedList.positionForIndex(idx));
  }
  for (let c of changes) {
    const key = c.uniqueId();
    if (!appliedChanges.has(key)) {
      appliedChanges.add(key);
      positionedList.patch(c, valueModifier);
    }
  }
  for (let idx of indexes) {
    indexMap.set(idx, positionedList.opIndexForPosition(indexMap.get(idx)));
  }
  return {
    array: positionedList.array,
    indexes: indexMap,
  };
}

export class ListChange extends Change.BaseChange {
  constructor(kind, value, start, end) {
    super();
    this.kind = kind;
    this.value = value;
    this.start = start;
    this.end = end || start;
  }

  uniqueId() {
    return `${this.kind}-${this.start}-${this.end}-${stableStringify(
      this.value
    )}`;
  }

  get type() {
    return 'LIST';
  }

  toJSImpl() {
    return {
      k: this.kind,
      v: this.value,
      s: this.start,
      e: this.end,
    };
  }

  static fromJS(obj) {
    return new this(obj.k, obj.v, obj.s, obj.e);
  }
}

Change.registerType('LIST', ListChange);
