import Utils from '@ovvio/base/lib/utils';

export class ValueMap {
  constructor() {
    this.map = new Map();
    this.arr = [];
  }

  encodeValue(v) {
    if (this.map.has(v)) {
      return this.map.get(v);
    }
    const encodedValue = String(this.arr.length);
    this.map.set(v, encodedValue);
    this.arr.push(v);
    return encodedValue;
  }

  decodeValue(v) {
    return this.arr[v | 0];
  }

  toJS() {
    return this.arr;
  }

  static fromJS(arr) {
    const result = new this();
    for (let idx = 0; idx < arr.length; ++idx) {
      result.map.set(arr[idx], idx);
    }
    result.arr = Array.from(arr);
    return result;
  }

  static decodeValue(arr, v) {
    return arr[v | 0];
  }
}

function _deflateValue(obj, map) {
  if (Utils.isString(obj)) {
    // if (!obj.length) {
    //   return obj;
    // }
    return map.encodeValue(obj);
  }

  if (Utils.isArray(obj)) {
    return obj.map(v => _deflateValue(v, map));
  }

  if (Utils.isObject(obj)) {
    const result = {};
    const keys = Object.keys(obj).sort();
    for (const k of keys) {
      result[_deflateValue(k, map)] = _deflateValue(obj[k], map);
    }
    return result;
  }

  return obj;
}

/**
 * Compress an object by eliminating repeated strings. We map uninque strings
 * to integers stored as strings, alongside a translation map. For our use cases
 * this simple mapping saves ~30% of the resulting JSON's length.
 */
export function deflate(obj) {
  const map = new ValueMap();
  const deflatedObj = _deflateValue(obj, map);
  return {
    o: deflatedObj,
    m: map.toJS(),
    v: 1,
  };
}

function _inflateValue(obj, mapArr) {
  if (Utils.isString(obj)) {
    // if (!obj.length) {
    //   return obj;
    // }
    return ValueMap.decodeValue(mapArr, obj);
  }

  if (Utils.isArray(obj)) {
    return obj.map(v => _inflateValue(v, mapArr));
  }

  if (Utils.isObject(obj)) {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      result[_inflateValue(k, mapArr)] = _inflateValue(v, mapArr);
    }
    return result;
  }

  return obj;
}

/**
 * Decompress a previously compressed object.
 */
export function inflate(obj) {
  Utils.assert(obj.v === 1, 'Unsupported format');
  return _inflateValue(obj.o, obj.m);
}

export function isDeflatedObject(obj) {
  return Utils.Set.equals(Object.keys(obj), ['o', 'm', 'v']) && obj.v === 1;
}

export function deepInflate(obj) {
  if (isDeflatedObject(obj)) {
    return inflate(obj);
  } else if (Utils.isObject(obj)) {
    const r = {};
    for (const [k, v] of Object.entries(obj)) {
      r[k] = deepInflate(v);
    }
    return r;
  } else {
    return obj;
  }
}
