import Utils from '@ovvio/base/lib/utils';
import * as Base from './base';

/**
 * An abstract representation of a [start, end) pair, start being inclusive,
 * end being exclusive. This class is used when dealing with MarkedText below.
 */
export class Range {
  // Start is inclusive, end is exclusive
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  get length() {
    return Math.max(0, this.end - this.start);
  }

  clone() {
    return new this.constructor(this.start, this.end);
  }

  contains(idx) {
    return this.start <= idx && this.end > idx;
  }

  intersectsWith(range) {
    return (
      this.contains(range.start) ||
      this.contains(range.end) ||
      range.contains(this.start) ||
      range.contains(this.end)
    );
  }

  toJS() {
    return [this.start, this.end];
  }

  isEqual(other) {
    if (!other) {
      return false;
    }
    return this.start === other.start && this.end === other.end;
  }

  offsetBy(offsetter, type) {
    this.start = offsetter(this.start, type);
    this.end = offsetter(this.end, type);
    return this;
  }

  isValid() {
    return this.start < this.end;
  }

  static rangesEqual(arr1, arr2) {
    return Utils.Array.equal(arr1, arr2, (r1, r2) => {
      return r1.isEqual(r2);
    });
  }

  static fromJS(obj) {
    Utils.assert(obj instanceof Array);
    Utils.assert(obj.length == 2);
    return new Range(obj[0], obj[1]);
  }

  /**
   * Given an array of ranges that may overlap, this function will
   * create and return a minimal list of non-overlapping ranges.
   *
   * Basically it removes duplications and groups together all
   * overlapping ranges. Dealing with optimized arrays of ranges
   * greatly simplifies the code.
   */
  static optimizeRanges(ranges) {
    if (!ranges || !ranges.length) {
      return [];
    }
    // Filter out any invalid ranges
    const l = ranges.filter(r => r.start < r.end);
    if (!l.length) {
      return [];
    }
    // Sort the ranges so it's easy to find overlapping ranges
    l.sort((r1, r2) => {
      const sDiff = r1.start - r2.start;
      if (sDiff) {
        return sDiff;
      }
      return r1.end - r2.end;
    });

    // Join all overlapping ranges
    const result = [];
    let start = l[0].start;
    let end = l[0].end;
    for (let idx = 1; idx < l.length; ++idx) {
      const r = l[idx];
      if (r.start <= end) {
        end = r.end;
      } else {
        result.push(new Range(start, end));
        start = r.start;
        end = r.end;
      }
    }
    result.push(new Range(start, end));
    return result;
  }

  /**
   * Given an array of ranges, this method removes the specified range
   * from the array, splitting ranges if needed. This method assumes
   * the ranges array has already been optimized.
   */
  static removeRange(ranges, deleted) {
    return this.optimizeRanges(this._removeRangeImpl(ranges, deleted));
  }

  static _removeRangeImpl(ranges, deleted) {
    if (!deleted.isValid()) {
      return Array.from(ranges);
    }
    const result = [];
    const { start, end } = deleted;
    ranges.forEach(r => {
      if (start > r.start && r.contains(start)) {
        result.push(new Range(r.start, start));
      }
      if (end < r.end && r.contains(end)) {
        result.push(new Range(end, r.end));
      }
      if (!r.intersectsWith(deleted)) {
        result.push(r);
      }
    });
    return result;
  }

  static removeRanges(rangesArr, rangesToRemove) {
    let result = rangesArr;
    rangesToRemove.forEach(r => {
      result = this._removeRangeImpl(result, r);
    });
    return this.optimizeRanges(result);
  }

  /**
   * Finds and returns a range containing the index in the given
   * ranges array. The ranges is assumed to be optimized.
   * Returns null if no range is found.
   */
  static rangeForIndex(ranges, searchIndex) {
    const idx = Utils.Algorithms.bsearch(ranges, searchIndex, (r, i) => {
      if (!r) {
        debugger;
      }
      if (r.contains(i)) {
        return 0;
      }
      return i - r.start;
    });
    return idx >= 0 && ranges[idx].contains(searchIndex) ? ranges[idx] : null;
  }

  /**
   * Given an index and an array of ranges this method returns whether
   * or not the index is included in any of the ranges.
   */
  static rangesInclude(ranges, idx) {
    return this.rangeForIndex(ranges, idx) !== null;
  }

  /**
   * Computes the changes applied to an array of ranges.
   * This method assumes both arrays have been optimized.
   *
   * @param rangesOld {Array.<Range>} An optimized array of ranges.
   * @param rangesNew {Array.<Range>} An optimized array of ranges.
   *
   * @returns {added: Array.<Range>, removed: Array.<Range>} An object
   *    describing the changes.
   */
  static diffRanges(rangesOld, rangesNew) {
    if (!rangesOld.length && !rangesNew.length) {
      return {
        added: [],
        removed: [],
      };
    }
    if (!rangesOld.length) {
      return {
        added: rangesNew,
        removed: [],
      };
    }
    if (!rangesNew.length) {
      return {
        added: [],
        removed: rangesOld,
      };
    }
    // This is probably the most naive and wasteful way of doing a diff
    // but it's good enough for now. This basically runs in O(n) where n
    // is the number of indexes covered by the ranges (max of both),
    //
    // TODO(ofri): Rewrite this in a less crappy way that depends only on
    // the number of range objects rather then the indexes covered.
    const minStart = Math.min(rangesOld[0].start, rangesNew[0].start);
    const maxEnd = Math.max(
      rangesOld[rangesOld.length - 1].end,
      rangesNew[rangesNew.length - 1].end
    );
    const added = [];
    const removed = [];
    for (let i = minStart; i < maxEnd; ++i) {
      const inOld = this.rangesInclude(rangesOld, i);
      const inNew = this.rangesInclude(rangesNew, i);
      if (inOld && !inNew) {
        removed.push(new Range(i, i + 1));
      } else if (!inOld && inNew) {
        added.push(new Range(i, i + 1));
      }
    }

    return {
      added: this.optimizeRanges(added),
      removed: this.optimizeRanges(removed),
    };
  }

  static isEmptyDiff(diff) {
    return diff.added.length === 0 && diff.removed.length === 0;
  }

  /**
   * Given a ranges diff returned from diffRanges(), and an array of
   * ranges, this method applies the diff and returns a new array of
   * patched ranges.
   */
  static patchRanges(diff, ranges, offsetter = idx => idx) {
    let result = ranges.slice();
    diff.added.forEach(r => {
      result.push(r.offsetBy(offsetter, Base.CHANGE_INSERT));
    });
    result = this.optimizeRanges(result);
    diff.removed.forEach(r => {
      result = this.removeRange(
        result,
        r.offsetBy(offsetter, Base.CHANGE_DELETE)
      );
    });
    return result;
  }

  /**
   * Given an optimized array of ranges and a range, this method
   * returns a new ranges array with ranges that are contained with
   * the provided range.
   */
  static intersection(ranges, start, end) {
    if (end <= start) {
      return [];
    }

    // TODO: Use bsearch to find the start and end ranges, reducing this to O(logn)
    const result = [];
    for (let i = 0; i < ranges.length; ++i) {
      const r = ranges[i];
      if (r.contains(start)) {
        if (r.contains(end - 1)) {
          result.push(new Range(start, end));
          break;
        } else {
          result.push(new Range(start, r.end));
        }
      } else if (r.contains(end - 1)) {
        if (r.start >= start) {
          result.push(new Range(r.start, end));
          break;
        }
      } else if (start <= r.start && r.end <= end) {
        result.push(r);
      }
    }
    return this.optimizeRanges(result);
  }

  /**
   * This method returns a generator that yields arrays of size 3.
   * The first element is the index in the range. The second element is
   * a boolean indicating whether the index is a start index. The third element
   * is the tag corresponding to the range in the tags array.
   *
   * For example given [[0, 1], [3, 5]] and ['A', 'B'] the generator would yield
   * [[0, true, 'A'], [1, false, 'A'], [3, true, 'B'], [5, false, 'B']].
   *
   * As a convenience, if the tags array is shorter than the ranges array, the
   * generator will hold to the last tag for the remaining ranges. If no tags
   * array is provided, null will be returned for the third element.
   */
  static *indexGenerator(ranges, tags) {
    const len = ranges.length;
    if (tags && !Array.isArray(tags)) {
      tags = [tags];
    }
    for (let i = 0; i < len; ++i) {
      const r = ranges[i];
      const t = tags && tags.length ? tags[Math.min(i, tags.length - 1)] : null;
      yield [r.start, true, t];
      yield [r.end, false, t];
    }
  }

  /**
   * Given an array of ranges arrays plus an array of tags arrays, this method
   * generates [Range, [Tag1, Tag2, ...]] pairs where the provided tags apply
   * to the given range. This method was designed to construct a representation
   * suitable for Slate.
   */
  static *fragmentsGenerator(rangesArr, tagsArr) {
    const generators = [];
    const values = [];
    // First, build an index interator for each range array
    for (let i = 0; i < rangesArr.length; ++i) {
      const g = this.indexGenerator(
        rangesArr[i],
        tagsArr ? tagsArr[i] : undefined
      );
      generators[i] = g;
      values[i] = g.next();
    }
    const activeTags = new Set();
    let v1 = null;
    let v2 = null;
    do {
      let idx = 0;
      let lastRangeIdx = Number.MAX_VALUE;
      let valueIdx = 0;
      // Find the minimum index from all of our generators
      while (idx < values.length) {
        const v = values[idx];
        // Delete any exhausted generators
        if (v.done) {
          generators.splice(idx, 1);
          values.splice(idx, 1);
          continue;
        }
        if (v.value[0] < lastRangeIdx) {
          valueIdx = idx;
          lastRangeIdx = v.value[0];
        }
        ++idx;
      }

      // We may have exhausted all of our generators so our values array
      // is empty.
      if (!values.length) {
        break;
      }

      // If we're at a start index, add its matching tag to the set of active
      // tags. If its an end index, remove it.
      const v = values[valueIdx].value;
      if (v[1]) {
        activeTags.add(v[2]);
      } else {
        activeTags.delete(v[2]);
      }

      const entry = [v[0], v[1], Array.from(activeTags).sort()];
      // Initialize our two values
      if (!v1) {
        v1 = entry;
        values[valueIdx] = generators[valueIdx].next();
        continue;
      }
      if (!v2) {
        v2 = entry;
        values[valueIdx] = generators[valueIdx].next();
        continue;
      }
      // Now both values are initialized and in order where v1 <= v2.
      // If v1 != v2, v1 is the start, v2 is the end, and v1 holds the tags
      // for this range.
      if (v1[0] !== v2[0] && v1[2].length) {
        yield [new Range(v1[0], v2[0]), v1[2]];
      }
      // Push v2 to v1 and set v2 to the newest entry.
      v1 = v2;
      v2 = entry;

      values[valueIdx] = generators[valueIdx].next();
    } while (true);

    // We may have a remainder that needs to be reported.
    if (v1 && v2 && v1[0] !== v2[0] && v1[2].length) {
      yield [new Range(v1[0], v2[0]), v1[2]];
    }
  }

  static *rangesFromIndexes(sortedIndexes) {
    let start = null;
    let end = null;
    for (const idx of indexes) {
      if (start === null) {
        start = idx;
        end = idx + 1;
        continue;
      }
      if (idx === start + 1) {
        ++end;
      } else {
        yield new this(start, end);
        start = idx;
        end = idx + 1;
      }
    }
    if (start !== null) {
      yield new this(start, end);
    }
  }
}

function rangeIdxComperator(r, idx) {
  if (r.contains(idx)) {
    return 0;
  }
  return r.start - idx;
}
