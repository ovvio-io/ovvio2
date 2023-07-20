import Utils from '@ovvio/base/lib/utils';
import * as Base from './base';
import { Range } from './range';
import { COWMap } from '../collections/cow-map';

const EMPTY_GENERATOR = (function* () {})();

/**
 * AnnotationMap is a data structure that holds "annotations" per indexes.
 * Indexes are opaque to this map. It does not enforce min/max indexes and has
 * no meaning for an index beside its numeric value.
 *
 * Annotations are represented as key-value pairs that are attached to specific
 * indexes.
 *
 * This structure is used for a bunch of things in in RT tree including:
 * - Holding text markers such as bold, italic, etc
 * - Properties of element nodes
 * - Pointers (used for selection, comments, etc)
 */
export class AnnotationMap {
  constructor(_map) {
    this.map = _map || new COWMap();
    this._sortedIndexesMap = null;
    this._sortedKeys = null;
    this._sortedIndexes = null;
  }

  countKeys(keyFilter = null) {
    if (!keyFilter) {
      return this.map.size;
    }
    let count = 0;
    for (const k of this.keys(keyFilter)) {
      ++count;
    }
    return count;
  }

  setMap(key, map) {
    this.map.set(key, map);
    this._clearCachesForKey(key);
  }

  getMap(key) {
    return this.map.get(key);
  }

  deleteMap(key) {
    this.map.delete(key);
    this._clearCachesForKey(key);
  }

  _clearCachesForKey(key) {
    if (this._sortedIndexesMap) {
      this._sortedIndexesMap.delete(key);
    }
    this._sortedKeys = null;
    this._sortedIndexes = null;
  }

  getValue(key, idx) {
    Utils.assert(Utils.isNumber(idx));
    const map = this.map.get(key);
    return map ? map.get(idx) : undefined;
  }

  setValue(key, idx, value) {
    if (Utils.isNoValue(value)) {
      debugger;
    }
    Utils.assert(Utils.isNumber(idx));
    let map = this.map.get(key);
    if (!map) {
      map = new Map();
      this.map.set(key, map);
    }
    map.set(idx, value);
    this._clearCachesForKey(key);
  }

  hasValue(key, idx) {
    Utils.assert(Utils.isNumber(idx));
    const map = this.map.get(key);
    return map && map.has(idx);
  }

  deleteValue(key, idx) {
    Utils.assert(Utils.isNumber(idx));
    const map = this.map.get(key);
    if (map) {
      map.delete(idx);
      if (!map.size) {
        this.map.delete(key);
      }
      this._clearCachesForKey(key);
    }
  }

  getDataAtIndex(idx, keysFilter = k => true, keyTransformer = k => k) {
    const result = {};
    for (const k of this.keys(keysFilter)) {
      if (this.hasValue(k, idx)) {
        result[keyTransformer(k)] = this.getValue(k, idx);
      }
    }
    return result;
  }

  setRange(key, startIdx, endIdx, value) {
    for (let idx = startIdx; idx < endIdx; ++idx) {
      this.setValue(key, idx, value);
    }
  }

  update(otherMap, offset = 0) {
    for (const k of otherMap.keys()) {
      const map = otherMap.getMap(k);
      for (const [idx, value] of map) {
        this.setValue(k, idx + offset, value);
      }
      this._clearCachesForKey(k);
    }
  }

  clear() {
    for (const k of this.map.keys()) {
      this._clearCachesForKey(k);
    }
    this.map.clear();
  }

  apply(indexes, obj) {
    const keys = Object.keys(obj);
    for (const idx of indexes) {
      const v = obj[k];
      for (const k of keys) {
        this.setValue(idx, k, v);
      }
    }
  }

  keys() {
    if (!this.map.size) {
      return EMPTY_GENERATOR;
    }
    return this._keysImpl.apply(this, arguments);
  }

  *_keysImpl(filter = (k, annMap) => true) {
    if (!this._sortedKeys) {
      this._sortedKeys = Array.from(this.map.keys()).sort();
    }
    for (const k of this._sortedKeys) {
      if (filter(k, this)) {
        yield k;
      }
    }
  }

  *sortedIndexes() {
    if (!this._sortedIndexes) {
      const set = new Set();
      for (const k of this.keys()) {
        Utils.Set.update(s, this.getMap(k).keys());
      }
      this._sortedIndexes = Array.from(set).sort((x, y) => x - y);
    }
    for (const idx of this._sortedIndexes) {
      yield idx;
    }
  }

  isEmpty() {
    return !this.map.size;
  }

  hasKeys(keyFilter = k => true) {
    for (const k of this.keys(keyFilter)) {
      return true;
    }
    return false;
  }

  isEqual(other, keyFilter = k => true) {
    if (!other) {
      return false;
    }
    if (this.countKeys(keyFilter) !== other.countKeys(keyFilter)) {
      return false;
    }
    for (const k of this.keys(keyFilter)) {
      if (!Utils.deepEqual(this.getMap(k), other.getMap(k))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns an array of sorted indexes for the given key.
   *
   * WARNING: The array is cached internally. You must copy it before
   * performing any mutations.
   */
  sortedIndexesForKey(key) {
    if (!this._sortedIndexesMap) {
      this._sortedIndexesMap = new Map();
    }
    let arr = this._sortedIndexesMap.get(key);
    if (!arr) {
      const map = this.getMap(key);
      arr = map ? Array.from(map.keys()).sort((x, y) => x - y) : [];
      this._sortedIndexesMap.set(key, arr);
    }
    return arr;
  }

  *indexesForKeys(keyFilter = k => true) {
    for (const k of this.keys(keyFilter)) {
      for (const idx of this.sortedIndexesForKey(k)) {
        yield [idx, k];
      }
    }
  }

  valuesAtIndexIter() {
    if (!this.map.size) {
      return EMPTY_GENERATOR;
    }
    return this._valuesAtIndexIterImpl.apply(this, arguments);
  }

  *_valuesAtIndexIterImpl(idx, keyFilter = k => true) {
    for (const k of this.keys(keyFilter)) {
      const map = this.map.get(k);
      if (map.has(idx)) {
        yield [k, map.get(idx)];
      }
    }
  }

  countAtIndex(idx, keyFilter = k => true) {
    let count = 0;
    for (const [k] of this.valuesAtIndexIter(idx)) {
      if (keyFilter(k)) {
        ++count;
      }
    }
    return count;
  }

  deleteKeys(keyFilter) {
    const keys = Array.from(this.keys(keyFilter));
    for (const k of keys) {
      this.deleteMap(k);
    }
  }

  /**
   * Yields a stream of [key, index, value] arrays for all entries in the
   * given range.
   *
   * @param start    Start index (inclusive).
   *
   * @param end      End index (exclusive).
   *
   * @param relative If true, yields indexes relative to start index.
   *                 Otherwise yields indexes unmodified.
   *
   * @param keysFilter A filter for selecting returned keys.
   */
  *rangeIterator(start, end, relative, keysFilter = k => true) {
    const offset = relative ? start : 0;
    for (const k of this.keys(keysFilter)) {
      const data = this.getMap(k);
      const arr = this.sortedIndexesForKey(k);
      let idx = Utils.Algorithms.bsearch(arr, start);
      // bsearch will always return something. If no exact match is found,
      // it'll return the closest index it finds. Fast forward to our desired
      // range if needed.
      while (arr[idx] < start && arr[idx] < end && idx < arr.length) {
        ++idx;
      }
      // Grab all relevant annotations
      while (arr[idx] < end) {
        if (data.has(arr[idx])) {
          yield [k, arr[idx] - offset, data.get(arr[idx])];
        }
        ++idx;
      }
    }
  }

  applyRanges(rangeIter) {
    for (const [key, idx, data] of rangeIter) {
      this.setValue(key, idx, data);
    }
  }

  /**
   * Returns a map of all annotations by key at the given range.
   *
   * @param start (int) Start index.
   *
   * @param end (int) End index.
   *
   * @param relative (bool) If true, returns indexes relative to start.
   *                        Otherwise returns the indexes unmodified.
   *
   * @returns Map A map of key => Map, where the internal maps are idx => Array
   *              of annotation values.
   */
  annotationsMapForRange(start, end, relative, keysFilter = k => true) {
    const result = new this.constructor();
    for (const [key, idx, value] of this.rangeIterator(
      start,
      end,
      relative,
      keysFilter
    )) {
      result.setValue(key, idx, value);
    }
    return result;
  }

  clearRange(start, end, keysFilter = k => true) {
    for (const key of this.keys(keysFilter)) {
      const indexes = this.sortedIndexesForKey(key);
      for (
        let x = Utils.Algorithms.bsearch(indexes, start);
        x < indexes.length && indexes[x] < end;
        ++x
      ) {
        if (indexes[x] >= start && indexes[x] < end) {
          this.deleteValue(key, indexes[x]);
        }
      }
      this._clearCachesForKey(key);
    }
  }

  copyRange(otherMap, start, end) {
    if (!otherMap) {
      return;
    }
    for (const [key, idx, value] of otherMap.rangeIterator(start, end, false)) {
      this.setValue(key, idx, value);
    }
  }

  toJS(keyFilter = k => true) {
    const result = [];
    const hasKeys = this.hasKeys(keyFilter);
    for (const [range, data] of this.fragmentsIter(0, -1, true, keyFilter)) {
      result.push({
        r: range.toJS(),
        d: data,
      });
    }
    Utils.assert(hasKeys === result.length > 0);
    return result;
  }

  static fromJS(arr) {
    const result = new this();
    for (const { r, d: data } of arr) {
      const range = Range.fromJS(r);
      for (const key of Object.keys(data)) {
        result.setRange(key, range.start, range.end, data[key]);
      }
    }
    return result;
  }

  clone() {
    const result = new this.constructor(this.map.clone());
    result._sortedKeys = this._sortedKeys;
    result._sortedIndexes = this._sortedIndexes;
    return result;
  }

  valuesAtIndex(idx, keys) {
    const result = {};
    for (const k of keys) {
      const map = this.map.get(k);
      if (map.has(idx)) {
        result[k] = map.get(idx);
      }
    }
    return result;
  }

  *filterKeys(filter) {
    for (let k of this.keys()) {
      if (filter(k)) {
        yield k;
      }
    }
  }

  /**
   * Returns a generator that yields ranges with blocks of annotations.
   *
   * @param fragmentsStart A start index from which to generate fragments.
   *                       Defaults to 0.
   *
   * @param fragmentsEnd   End index (exclusive) from which to generate
   *                       fragments. Negative values mean the greatest index
   *                       available.
   *
   * @param relative       If true, the resulting ranges will be relative to
   *                       the given start index. Otherwise indexes are
   *                       returned unmodified.
   *
   * @param keys           An array of keys to output fragments for. If not
   *                       provided, all keys will be returned.
   *
   * @returns A stream of [Range, { key: value }]. The first index holds the
   *          range to which the values refer to. The second argument is an
   *          object where keys are keys from this map and the value per key
   *          is the value of this key for the entire fragment.
   */
  *fragmentsIter(
    fragmentsStart = 0,
    fragmentsEnd = -1,
    relative = true,
    keyFilter = k => true
  ) {
    const keys = Array.from(this.keys(keyFilter)).sort();
    // Exit early if we're empty
    if (!keys.length) {
      return;
    }

    // Collect all indexes across all keys
    const indexes = new Set();
    for (const k of keys) {
      const map = this.map.get(k);
      for (const idx of map.keys()) {
        indexes.add(idx);
      }
    }
    if (!indexes.size) {
      return;
    }

    // Indexes are useful only when sorted.
    const sortedIndexes = Array.from(indexes).sort((x, y) => x - y);

    // Find the end index if the user requested it
    if (fragmentsEnd < 0) {
      fragmentsEnd = sortedIndexes[sortedIndexes.length - 1] + 1;
    }

    // Find our start and end indexes
    let startIdx = Utils.Algorithms.bsearch(sortedIndexes, fragmentsStart);
    let endIdx = Utils.Algorithms.bsearch(sortedIndexes, fragmentsEnd);
    // Since bsearch always returns something, it may find a smaller than
    // desired start idx. Push it up until we're in range.
    while (
      sortedIndexes[startIdx] < fragmentsStart &&
      startIdx < sortedIndexes.length
    ) {
      ++startIdx;
    }
    // Same deal but the other way around.
    while (sortedIndexes[endIdx] > fragmentsEnd && endIdx > 0) {
      --endIdx;
    }

    // Sanity check
    if (startIdx > endIdx) {
      return;
    }

    // Go over each index, joining adjacent indexes where active values are
    // identical.
    let start = sortedIndexes[startIdx];
    let end = start + 1;
    let activeValues = this.valuesAtIndex(start, keys);

    if (start > fragmentsStart) {
      yield [new Range(fragmentsStart, start), {}];
    }

    for (let x = startIdx + 1; x <= endIdx; ++x) {
      const idx = sortedIndexes[x];
      const values = this.valuesAtIndex(idx, keys);
      if (idx === end && Utils.deepEqual(activeValues, values)) {
        ++end;
      } else {
        const r = new Range(start, end);
        if (relative) {
          r.offsetBy(x => x - fragmentsStart);
        }
        yield [r, activeValues];
        start = idx;
        end = start + 1;
        activeValues = values;
      }
    }
    // Remainder
    const r = new Range(start, end);
    if (relative) {
      r.offsetBy(x => x - fragmentsStart);
    }
    yield [r, activeValues];
  }

  // WARNING: Offset is done from low to high indexes. Any overlapping indexes
  // after shiting will override existing indexes.
  shiftIndexes(delta, start = 0, end = Number.MAX_SAFE_INTEGER) {
    for (const key of this.keys()) {
      const map = this.map.get(key);
      const modifiedIndexes = [];
      for (const idx of map.keys()) {
        if (idx >= start && idx < end) {
          modifiedIndexes.push(idx);
        }
      }

      modifiedIndexes.sort(delta > 0 ? (x, y) => y - x : (x, y) => x - y);
      for (const idx of modifiedIndexes) {
        map.set(idx + delta, map.get(idx));
        map.delete(idx);
      }
      this._clearCachesForKey(key);
    }
  }

  toChecksum(checksum, keyFilter = k => true) {
    checksum.startObject();
    for (const k of this.keys(keyFilter)) {
      checksum.appendKey(k);
      checksum.startObject();
      const indexes = this.sortedIndexesForKey(k);
      for (const idx of indexes) {
        checksum.appendKey(String(idx));
        checksum.appendValue(this.getValue(k, idx));
      }
      checksum.endObject();
    }
    checksum.endObject();
  }
}
