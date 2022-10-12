import stableStringify from 'json-stable-stringify';
import Utils from '@ovvio/base/lib/utils';
import { Range } from './range';
import Change from './change';

class DataEntry {
  constructor(metadata = {}) {
    this.ranges = [];
    this.metadata = metadata || {};
  }

  toJS() {
    return {
      ranges: this.ranges.map(r => r.toJS()),
      metadata: this.metadata,
    };
  }

  static fromJS(obj) {
    const r = new this(obj.metadata || {});
    r.ranges = (obj.ranges || []).map(r => Range.fromJS(r));
    return r;
  }

  offsetBy(offsetter) {
    this.ranges.forEach(r => {
      r.start = offsetter(r.start);
      r.end = offsetter(r.end);
    });
    this.ranges = Range.optimizeRanges(this.ranges);
  }
}

/**
 * A set of markers that refer to abstract ranges. In our case these ranges
 * represent indexes of characters in a document.
 *
 * A marker is composed of three values:
 *
 * 1. A unique name. Bold/Italic/Link are good marker names.
 *
 * 2. An optional props object. Props must be serializable to JSON. Other than
 *    that props are considered opaque by the implementation. Props are a good
 *    place to store additional data about a marker such as the link's URL,
 *    a comment's unique id, etc.
 *
 * 3. A set of ranges for which the marker applies. Each combination of
 *    (name, props) gets is own set of ranges. Ranges may be exclusive, meaning
 *    that a range may appear in at most one (name, props) combination. Ranges
 *    may also be single, in that no more than one range is allowed per
 *    (name, props) pair.
 *
 * Examples
 * --------
 *
 * - Comments:
 *   Comments may be implemented as a marker of name 'comment'. Whenever the
 *   user selects a region of text and creates a comment on it, the 'comment'
 *   marker is added on that range of text with a props holding the comment's
 *   id.
 *   This way multiple comments may be applied to different sections of text
 *   and comments are allowed to overlap with each other.
 *
 *   Note that for comments specifically, if a single comment isn't allowed to
 *   span multiple ranges (it'd look weird won't it?), you may call
 *   setSingleRange('comment', true) which would ensure that a single range
 *   exists per comment.
 *
 * - Links:
 *   Unlike comments, links must never overlap. A single character may, at most,
 *   point to one link so that when the user clicks on it the app knows which
 *   link to open (otherwise a choice must be presented to the user).
 *   The implementation of links will therefore use a marker named 'link', the
 *   props will hold the link's URL, and the marker would be set to exclusive
 *   using setExclusive('link', true).
 *
 *   Now consider the text 'abc'. Let's say the user selects 'ab' and applies
 *   a link { url: 'http://foo.com' }. Later the user selects 'bc' and applies
 *   a different link { url: 'http://bar.com' }. Since links are exclusive, the
 *   result would be 'a' links to foo.com while 'bc' links to bar.com.
 *
 */
export class MarkerSet {
  constructor() {
    // Name -> { Props : Entry }
    this.data = {};
    this.exclusiveMarkers = new Set();
    this.singleRangeMarkers = new Set();
  }

  isEmpty() {
    return !Object.keys(this.data).length;
  }

  setExclusive(name, exclusive) {
    if (exclusive) {
      this.exclusiveMarkers.add(name);
    } else {
      this.exclusiveMarkers.delete(name);
    }
  }

  setSingleRange(name, flag) {
    if (flag) {
      this.singleRangeMarkers.add(name);
    } else {
      this.singleRangeMarkers.delete(name);
    }
  }

  applyMarker(markerName, start, end, props = {}, metadata = {}) {
    if (end <= start) {
      return;
    }
    const propsKey = stableStringify(props);
    this._applyMarker(markerName, propsKey, metadata, [new Range(start, end)]);
  }

  _applyMarker(markerName, propsKey, metadata, addedRanges) {
    if (!addedRanges.length) {
      return;
    }
    const exclusive = this.exclusiveMarkers.has(markerName);
    const singleRange = this.singleRangeMarkers.has(markerName);

    let entriesMap = this.data[markerName];
    if (!entriesMap) {
      entriesMap = {};
      this.data[markerName] = entriesMap;
    }
    let entry = entriesMap[propsKey];
    if (!entry) {
      entry = new DataEntry(metadata);
      entriesMap[propsKey] = entry;
    }
    entry.metadata = metadata;
    let ranges = entry.ranges;
    if (singleRange) {
      ranges = [addedRanges[0]];
    } else {
      Utils.Array.append(ranges, addedRanges);
    }
    ranges = Range.optimizeRanges(ranges);
    if (ranges.length) {
      entry.ranges = ranges;
    } else {
      delete entriesMap[propsKey];
    }

    if (exclusive) {
      Object.keys(entriesMap).forEach(k => {
        if (k === propsKey) {
          return;
        }
        const arr = Range.removeRanges(entriesMap[k].ranges, addedRanges);
        entriesMap[k].ranges = arr;
      });
    }

    this.gc();
  }

  removeMarker(markerName, start, end, props = {}) {
    if (end <= start) {
      return;
    }

    const propsKey = stableStringify(props);
    const exclusive = this.exclusiveMarkers.has(markerName);

    let propsMap = this.data[markerName];
    if (!propsMap) {
      propsMap = {};
      this.data[markerName] = propsMap;
    }
    let entry = propsMap[propsKey];
    if (!entry) {
      entry = new DataEntry();
      propsMap[propsKey] = entry;
    }
    let ranges = entry.ranges;
    ranges = Range.removeRange(ranges, new Range(start, end));

    entry.ranges = ranges;
    this.gc();
  }

  offsetBy(offsetter) {
    const data = this.data;
    Object.keys(data).forEach(markerName => {
      const entries = data[markerName];
      Object.keys(entries).forEach(propsJson => {
        entries[propsJson].offsetBy(offsetter);
      });
    });
  }

  /**
   * Applies all markers from markerSet on this (set addition essentially).
   */
  update(markerSet) {
    const data = markerSet.data;
    Object.keys(data).forEach(markerName => {
      const entries = data[markerName];
      Object.keys(entries).forEach(propsJson => {
        const e = entries[propsJson];
        this._applyMarker(markerName, propsJson, e.metadata, e.ranges);
      });
    });
  }

  diff(markerSet) {
    const oldNamesSet = new Set(Object.keys(this.data));
    const newNamesSet = new Set(Object.keys(markerSet.data));
    const result = [];
    // Removed markers
    Utils.Set.subtract(oldNamesSet, newNamesSet).forEach(name => {
      const entries = this.data[name];
      Object.keys(entries).forEach(propsJson => {
        const entry = entries[propsJson];
        const diff = Range.diffRanges(entry.ranges, []);
        if (!Range.isEmptyDiff(diff)) {
          result.push(
            new MarkerSetChange(name, propsJson, diff, entry.metadata)
          );
        }
      });
    });
    // Added markers
    Utils.Set.subtract(newNamesSet, oldNamesSet).forEach(name => {
      const entries = markerSet.data[name];
      Object.keys(entries).forEach(propsJson => {
        const entry = entries[propsJson];
        const diff = Range.diffRanges([], entry.ranges);
        if (!Range.isEmptyDiff(diff)) {
          result.push(
            new MarkerSetChange(name, propsJson, diff, entry.metadata)
          );
        }
      });
    });
    // Modified / differring props
    Utils.Set.intersection(oldNamesSet, newNamesSet).forEach(name => {
      const entries = markerSet.data[name];
      Object.keys(entries).forEach(propsJson => {
        const oldEntry = this.data[name][propsJson];
        const newEntry = markerSet.data[name][propsJson];
        const oldRanges = oldEntry ? oldEntry.ranges : [];
        const newRanges = newEntry ? newEntry.ranges : [];
        const diff = Range.diffRanges(oldRanges, newRanges);
        if (!Range.isEmptyDiff(diff)) {
          result.push(
            new MarkerSetChange(name, propsJson, diff, newEntry.metadata)
          );
        }
      });
    });
    return result;
  }

  patch(changes, offsetter = idx => idx) {
    (changes || []).forEach(c => {
      const name = c.name;
      let entries = this.data[name];
      if (!entries) {
        entries = {};
        this.data[name] = entries;
      }
      const propsJson = c.propsJson;
      let e = entries[propsJson];
      if (!e) {
        e = new DataEntry();
        entries[propsJson] = e;
      }
      const origRanges = e.ranges;
      e.ranges = Range.patchRanges(c.diff, e.ranges, offsetter);
      if (e.ranges.length > 1 && this.singleRangeMarkers.has(name)) {
        e.ranges = [e.ranges[0]];
      }
      e.metadata = c.metadata;
      if (this.exclusiveMarkers.has(name)) {
        const effectiveDiff = Range.diffRanges(origRanges, e.ranges);
        Object.keys(entries).forEach(k => {
          if (k === propsJson) {
            return;
          }
          const arr = Range.removeRanges(
            entries[k].ranges,
            effectiveDiff.addedRanges
          );
          propsJson[k].ranges = arr;
        });
      }
    });
    this.gc();
  }

  gc() {
    Object.keys(this.data).forEach(name => {
      const entries = this.data[name];
      Object.keys(entries).forEach(propsJson => {
        if (!entries[propsJson].ranges.length) {
          delete entries[propsJson];
        }
      });
      if (!Object.keys(entries).length) {
        delete this.data[name];
      }
    });
  }

  toJS() {
    const data = {};
    this.gc();
    Object.keys(this.data).forEach(name => {
      const d = {};
      const entries = this.data[name];
      Object.keys(entries).forEach(propsJson => {
        d[propsJson] = entries[propsJson].toJS();
      });
      data[name] = d;
    });
    const result = {
      data: data,
    };
    if (this.exclusiveMarkers.size) {
      result.exclusiveMarkers = Array.from(this.exclusiveMarkers);
    }
    if (this.singleRangeMarkers.size) {
      result.singleRangeMarkers = Array.from(this.singleRangeMarkers);
    }
    return result;
  }

  static fromJS(obj) {
    const result = new this();
    (obj.exclusiveMarkers || []).forEach(m => {
      result.setExclusive(m, true);
    });
    (obj.singleRangeMarkers || []).forEach(m => {
      result.setSingleRange(m, true);
    });
    Object.keys(obj.data || {}).forEach(name => {
      const encodedEntries = obj.data[name];
      let entries = result.data[name];
      if (!entries) {
        entries = {};
        result.data[name] = entries;
      }
      Object.keys(encodedEntries).forEach(propsJson => {
        entries[propsJson] = DataEntry.fromJS(encodedEntries[propsJson]);
      });
    });
    result.gc();
    return result;
  }

  clone() {
    return MarkerSet.fromJS(this.toJS());
  }

  _setEntry(name, propsJson, entry) {
    let entries = this.data[name];
    if (!entries) {
      entries = {};
      this.data[name] = entries;
    }
    entries[propsJson] = entry;
  }

  subset(start, end) {
    const result = new MarkerSet();
    Object.keys(this.data).forEach(name => {
      const entries = this.data[name];
      Object.keys(entries).forEach(propsJson => {
        const e = entries[propsJson];
        const ranges = Range.intersection(e.ranges, start, end);
        if (ranges.length) {
          const newEntry = new DataEntry(e.metadata);
          newEntry.ranges = ranges;
          result._setEntry(name, propsJson, newEntry);
        }
      });
    });
    return result;
  }

  /**
   * This function breaks the set to fragments of markers were each fragment
   * is a single range plus a list of
   * {name: '...', props: {...}, metadata: {...}} tuples.
   * that apply to the entire range.
   *
   * For an example, see marker-set.test.js -> Fragments test.
   */
  fragments(func) {
    // this.gc();
    // const ranges = [];
    // const tags = [];
    // Object.keys(this.data).forEach(name => {
    //   const entries = this.data[name];
    //   Object.keys(entries).forEach(propsJson => {
    //     const e = entries[propsJson];
    //     ranges.push(e.ranges);
    //     tags.push({
    //       name: name,
    //       props: JSON.parse(propsJson),
    //       metadata: e.metadata
    //     });
    //   });
    // });
    // const g = Range.fragmentsGenerator(ranges, tags);
    // for (let v = g.next(); v && !v.done; v = g.next()) {
    //   const [range, data] = v.value;
    //   func(range, data);
    // }
    for (const [range, data] of this.fragmentsIter()) {
      func(range, data);
    }
  }

  *fragmentsIter() {
    this.gc();
    const ranges = [];
    const tags = [];
    Object.keys(this.data).forEach(name => {
      const entries = this.data[name];
      Object.keys(entries).forEach(propsJson => {
        const e = entries[propsJson];
        ranges.push(e.ranges.map(r => r.clone()));
        tags.push({
          name: name,
          props: JSON.parse(propsJson),
          metadata: Utils.deepCopy(e.metadata),
        });
      });
    });
    const g = Range.fragmentsGenerator(ranges, tags);
    for (let v = g.next(); v && !v.done; v = g.next()) {
      yield v.value;
    }
  }

  /**
   * Returns a Set with indexes of ranges in this set.
   */
  indexSet() {
    const result = new Set();
    Object.keys(this.data).forEach(name => {
      const entries = this.data[name];
      Object.keys(entries).forEach(propsJson => {
        const e = entries[propsJson];
        for (let r of e.ranges) {
          result.add(r.start);
          result.add(r.end);
        }
      });
    });
    return result;
  }

  toAnnotationsMap() {
    const result = new Map();
    const data = this.data;
    for (const key of Object.keys(data)) {
      let map = result.get(key);
      if (!map) {
        map = new Map();
        result.set(key, map);
      }
      for (const propsJson of Object.keys(data[key])) {
        const props = JSON.parse(propsJson);
        for (const r of data[key][propsJson].ranges) {
          for (let idx = r.start; idx < r.end; ++idx) {
            map.set(idx, props);
          }
        }
      }
    }
    return result;
  }
}

export class MarkerSetChange extends Change.BaseChange {
  constructor(name, propsJson, diff, metadata = {}) {
    super();
    this.name = name;
    this.propsJson = propsJson;
    this.diff = diff;
    this.metadata = metadata;
  }

  get type() {
    return 'MS';
  }

  toJSImpl() {
    return {
      n: this.name,
      p: this.propsJson,
      d: {
        a: this.diff.added.map(r => r.toJS()),
        r: this.diff.removed.map(r => r.toJS()),
      },
      m: this.metadata,
    };
  }

  static fromJS(obj) {
    return new MarkerSetChange(
      obj.n,
      obj.p,
      {
        added: obj.d.a.map(v => Range.fromJS(v)),
        removed: obj.d.r.map(v => Range.fromJS(v)),
      },
      obj.m
    );
  }
}

Change.registerType('MS', MarkerSetChange);

export class Fragment {
  set(start, end, markers) {
    this.start = start;
    this.end = end;
    this.markers = markers;
  }
}
