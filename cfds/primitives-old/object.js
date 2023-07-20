import Utils from '@ovvio/base/lib/utils';
import * as Base from './base';
import * as List from './list';
import { diffTexts, patchText } from './plaintext';
// import * as RichText from "./richtext";
import * as RT from './richtext2';
import Change from './change';
import stableStringify from 'json-stable-stringify';
import { RichTextDiff } from './richtext-diff';
import { isValidTree } from './richtext-tree-validation';
import {
  TYPE_STR,
  TYPE_BOOL,
  TYPE_NUMBER,
  TYPE_DATE,
  TYPE_RICHTEXT,
  TYPE_STR_SET,
  TYPE_SET,
  TYPE_REF,
  TYPE_REF_SET,
  TYPE_MAP,
} from '../base/scheme-types';
import { COWMap } from '../collections/cow-map';

// Used internally to hold output of richtext diff
const _TYPE_RICHTEXT_DIFF = '_richtextdiff';

// A set of types that implement their own diff & patch mechanics. This require
// special handling in some edge cases.
const EXTERNAL_TYPES = new Set([TYPE_RICHTEXT]);

/**
 * Given a scheme object and an entity name, this function
 * constructs and returns an object describing the entity's
 * field types.
 */
export function fieldsFromScheme(scheme, entityName) {
  const hierarchy = [];
  let entity = scheme[entityName];
  Utils.assert(entity, 'Unknown entity: ' + entityName);
  while (entity) {
    hierarchy.push(entity.fields);
    entity = scheme[entity.inherits];
  }
  const result = {};
  for (let i = hierarchy.length - 1; i >= 0; --i) {
    Object.assign(result, hierarchy[i]);
  }
  return result;
}

/**
 * Returns whether an object is "primitive", which basically means
 * its constructor is Object.
 *
 * @param o {*} The object to test.
 * @returns {bool} Whether the object is "primitive" or not.
 */
export function isPrimitiveObject(o) {
  return o ? o.constructor.prototype === Object.prototype : false;
}

export function diffFields(k, v1, v2, type, result, local) {
  if (v1 === v2) {
    return;
  }
  switch (type) {
    case TYPE_RICHTEXT: {
      const changes = (v1 || new RT.RichText()).diff(v2, local);
      if (!RT.isTrivialDiff(changes)) {
        result.push(
          new ObjectChange(Base.CHANGE_OTHER, k, changes, _TYPE_RICHTEXT_DIFF)
        );
      }
      break;
    }

    case TYPE_DATE:
      if (v1 instanceof Date) {
        v1 = Utils.serializeDate(v1);
      }
      if (v2 instanceof Date) {
        v2 = Utils.serializeDate(v2);
      }
    // No break. Fall through to number.

    case TYPE_NUMBER:
      if (
        (Utils.isNoValue(v1) && !Utils.isNoValue(v2)) ||
        Math.abs(v1 - v2) > Number.EPSILON
      ) {
        result.push(new ObjectChange(Base.CHANGE_INSERT, k, v2, type));
      }
      break;

    case TYPE_STR:
    case TYPE_REF:
      result.push(new ObjectChange(Base.CHANGE_INSERT, k, v2, type));
      break;

    case TYPE_REF_SET:
    case TYPE_STR_SET:
    case TYPE_SET: {
      const added = Utils.Set.subtractByValue(v2, v1);
      const removed = Utils.Set.subtractByValue(v1, v2);
      if (added.size) {
        result.push(new ObjectChange(Base.CHANGE_INSERT, k, added, type));
      }
      if (removed.size) {
        result.push(new ObjectChange(Base.CHANGE_DELETE, k, removed, type));
      }
      break;
    }

    case TYPE_MAP: {
      v1.diff(
        v2,
        (a, b) => Utils.deepEqual(a, b),
        (changeType, key, oldValue, newValue) => {
          result.push(
            new ObjectChange(
              changeType,
              k,
              [[key, changeType === Base.CHANGE_DELETE ? oldValue : newValue]],
              type
            )
          );
        }
      );
      break;
    }

    default:
      throw new Error('Unknown field type: ' + type);
  }
}

export function diff(fieldsScheme, obj1, obj2, local) {
  const result = [];
  for (const k of Object.keys(obj1)) {
    //Object.keys(obj1).forEach(k => {
    if (fieldsScheme[k] && !obj2.hasOwnProperty(k)) {
      result.push(
        new ObjectChange(Base.CHANGE_DELETE, k, obj1[k], fieldsScheme[k])
      );
    }
  }

  for (const k of Object.keys(obj2)) {
    //Object.keys(obj2).forEach(k => {
    const type = fieldsScheme[k];
    if (!type) {
      continue;
    }
    if (!obj1.hasOwnProperty(k)) {
      result.push(new ObjectChange(Base.CHANGE_INSERT, k, obj2[k], type));
    } else {
      diffFields(k, obj1[k], obj2[k], type, result, local);
    }
  }
  return result;
}

export function isTrivialDiff(diff) {
  return !diff || !diff.length;
}

export function keySetFromDiff(diff) {
  const result = new Set();
  if (diff) {
    for (const change of diff) {
      result.add(change.fieldname);
    }
  }
  return result;
}

export function patch(fieldsScheme, obj, changes1, changes2 = []) {
  const changes1ByField = {};
  const changes2ByField = {};
  const modifiedFields = new Set();

  // Apply simple changes as we go over them. External types are joined by
  // fieldname so we can later perform a 3-way merge as merge(base, c1, c2).
  function prepChanges(changes, outMap) {
    for (const c of changes) {
      const k = c.fieldname;
      const type = fieldsScheme[k];
      let handled = false;

      if (EXTERNAL_TYPES.has(type)) {
        // External types will typically have kind === CHANGE_OTHER to mark
        // that a specialized merge is needed. If, however, we have a DELETE
        // or INSERT change, it refers to the entire field and can be handled
        // in place.
        if (c.kind === Base.CHANGE_DELETE) {
          delete obj[k];
          handled = true;
        } else if (c.kind === Base.CHANGE_INSERT) {
          obj[k] = c.valueForPatch(type);
          handled = true;
        } else {
          outMap[k] = c;
          modifiedFields.add(k);
        }
      } else {
        // Primitives can be patched directly as there's no merge happening on
        // them.
        c.simplePatch(obj, type);
      }
    }
  }

  prepChanges(changes1, changes1ByField);
  prepChanges(changes2, changes2ByField);

  for (const field of modifiedFields) {
    const type = fieldsScheme[field];
    switch (type) {
      case TYPE_RICHTEXT: {
        const c1 = changes1ByField[field];
        const c2 = changes2ByField[field];
        // We can safely modify the value in place as we've previously cloned
        // the entire object.
        let base = obj[field] || new RT.RichText();
        obj[field] = base.patch(
          c1 ? c1.data : RT.emptyDiff(),
          c2 ? c2.data : RT.emptyDiff()
        );
        break;
      }

      default:
        throw new Error('Unknown field type: ' + type);
    }
  }
  return obj;
}

export function serialize(fieldsScheme, obj, overrides = {}, local) {
  const result = {};
  if (!obj) {
    return {};
  }
  for (const field of Object.keys(obj)) {
    //Object.keys(obj).forEach(field => {
    const type = fieldsScheme[field];
    if (overrides[type]) {
      try {
        result[field] = overrides[type](obj[field], local);
        continue;
      } catch (e) {
        console.error(e);
      }
    }
    if (obj[field] === undefined) {
      continue;
    }
    let encodedValue;
    switch (type) {
      case TYPE_RICHTEXT:
        encodedValue = obj[field].toJS(local);
        break;

      case TYPE_DATE: {
        encodedValue = Utils.serializeDate(obj[field]);
        break;
      }

      case TYPE_STR:
      case TYPE_REF:
        encodedValue = obj[field];
        break;

      case TYPE_NUMBER: {
        const v = obj[field];
        encodedValue = v ? Number(v) : 0;
        break;
      }

      case TYPE_SET:
      case TYPE_STR_SET:
      case TYPE_REF_SET:
        encodedValue = Utils.Set.mapToArray(obj[field], JSON.stringify).sort();
        break;

      case TYPE_MAP:
        encodedValue = obj[field].toJS();
        break;

      default:
        throw new Error(`field: ${field} unknown type: ${type}`);
    }

    if (!Utils.isNoValue(encodedValue)) {
      result[field] = encodedValue;
    }
  }
  return result;
}

function parseSetValue(v) {
  try {
    return JSON.parse(v);
  } catch (e) {
    return v;
  }
}

export function deserialize(fieldsScheme, obj, overrides = {}) {
  const result = {};
  if (!obj) {
    return {};
  }

  for (const field of Object.keys(obj)) {
    //foreacy
    const type = fieldsScheme[field];
    if (overrides[type]) {
      try {
        result[field] = overrides[type](obj[field]);
        continue;
      } catch (e) {
        console.error(e);
      }
    }
    switch (type) {
      case TYPE_RICHTEXT: {
        let v = obj[field];
        if (typeof v === 'string') {
          v = JSON.parse(v);
        }
        result[field] = RT.RichText.fromJS(v);
        break;
      }

      case TYPE_DATE: {
        result[field] = Utils.deserializeDate(obj[field]);
        break;
      }

      case TYPE_STR:
      case TYPE_REF:
        result[field] = obj[field];
        break;

      case TYPE_NUMBER: {
        const v = obj[field];
        result[field] = v ? Number(v) : 0;
        break;
      }

      case TYPE_REF_SET:
      case TYPE_STR_SET:
      case TYPE_SET: {
        let encodedValue = obj[field];
        // Backwards compatibility - old code used to store plain JSON array
        // as string
        if (Utils.isString(encodedValue)) {
          result[field] = JSON.parse(encodedValue);
        } else {
          Utils.assert(Utils.isArray(encodedValue));
          result[field] = Utils.Set.from(encodedValue, parseSetValue);
        }
        break;
      }

      case TYPE_MAP: {
        result[field] = COWMap.fromJS(obj[field]);
        break;
      }

      default:
        throw new Error(`field: ${field} unknown type: ${type}`);
    }
  }
  return result;
}

export function objectsEqual(fieldsScheme, obj1, obj2, local) {
  if (!obj1 && !obj2) {
    return true;
  }
  if (!obj1 && obj2) {
    return false;
  }
  if (obj1 && !obj2) {
    return false;
  }
  const keys = Object.keys(fieldsScheme);
  for (const k of keys) {
    if (Boolean(obj1.hasOwnProperty(k)) !== Boolean(obj2.hasOwnProperty(k))) {
      return false;
    }
  }
  for (let field of keys) {
    if (!obj1.hasOwnProperty(field)) {
      continue;
    }
    const type = fieldsScheme[field];
    if (!type) {
      throw new Error('Unknown field: ' + field);
    }
    if (!valuesEqual(type, obj1[field], obj2[field], local)) {
      return false;
    }
  }
  return true;
}

export function valuesEqual(type, v1, v2, local) {
  switch (type) {
    case TYPE_RICHTEXT:
      return v1.isEqual(v2, local);

    case TYPE_DATE:
      if (v1 instanceof Date) {
        v1 = Utils.serializeDate(v1);
      }
      if (v2 instanceof Date) {
        v2 = Utils.serializeDate(v2);
      }
    // No break. Fall through to number.
    case TYPE_NUMBER:
      return Utils.numbersEqual(v1, v2);

    case TYPE_STR:
    case TYPE_REF:
      return v1 === v2;

    case TYPE_SET:
    case TYPE_STR_SET:
    case TYPE_REF_SET:
      return Utils.Set.equalsByValue(v1, v2);

    case TYPE_MAP:
      return v1.isEqual(v2, (v1, v2) => Utils.deepEqual(v1, v2));
      break;

    default:
      break;
  }
  throw new Error('Unknown field type: ' + type);
}

export function clone(fieldsScheme, obj) {
  const result = {};
  for (const key of Object.keys(obj)) {
    const type = fieldsScheme[key];
    if (!type) {
      continue;
    }

    const value = obj[key];
    if (!value) {
      result[key] = value;
      continue;
    }

    switch (type) {
      case TYPE_RICHTEXT:
        result[key] = value.clone();
        break;

      case TYPE_SET:
      case TYPE_STR_SET:
      case TYPE_REF_SET:
        if (!(value instanceof Set)) {
          console.error(`Skipping unsupported value for field: ${key}`);
          break;
        }
        result[key] = new Set(value);
        break;

      case TYPE_MAP:
        result[key] = value.clone();
        break;

      case TYPE_DATE:
        result[key] = Utils.deserializeDate(Utils.serializeDate(value));
        break;

      default:
        result[key] = value;
        break;
    }
  }
  return result;
}

export function checksum(checksumStream, fieldsScheme, obj, local) {
  const keys = Object.keys(fieldsScheme).sort();
  checksumStream.startObject();
  for (const k of keys) {
    if (!obj.hasOwnProperty(k)) {
      continue;
    }

    const type = fieldsScheme[k];
    const value = obj[k];
    checksumStream.appendKey(k);
    switch (type) {
      case TYPE_RICHTEXT:
        value.toChecksum(checksumStream, local);
        break;

      case TYPE_DATE: {
        checksumStream.appendValue(Utils.serializeDate(value));
        break;
      }

      case TYPE_STR:
      case TYPE_REF:
        checksumStream.appendValue(value);
        break;

      case TYPE_NUMBER: {
        checksumStream.appendValue(value ? Number(value) : 0);
        break;
      }

      case TYPE_STR_SET:
      case TYPE_SET:
      case TYPE_REF_SET:
        // Set support is built in
        checksumStream.appendValue(value);
        break;

      case TYPE_MAP:
        checksumStream.startObject();
        const sortedKeys = Array.from(value.keys()).sort();
        for (const key of sortedKeys) {
          checksumStream.appendKey(key);
          checksumStream.appendValue(value.get(key));
        }
        checksumStream.endObject();
        break;

      default:
        Utils.Error.notReached('Unsupportd type: ' + type);
        break;
    }
  }
  checksumStream.endObject();
}

export function isValidObject(scheme, obj) {
  for (const k of scheme.getRequiredFields()) {
    if (!obj.hasOwnProperty(k) && !scheme.hasDefaultForField(k)) {
      return [false, `Missing required field "${k}"`];
    }
  }
  return validateFieldTypes(scheme.getFields(), obj);
}

function validateFieldTypes(fieldsScheme, obj) {
  for (const [key, value] of Object.entries(obj)) {
    const type = fieldsScheme[key];
    if (!type) {
      return [false, `Unknown field ${key}`];
    }
    switch (type) {
      case TYPE_DATE:
        if (!(value instanceof Date)) {
          debugger;
          return [false, `Invalid value for field "${key}". Expected ${type}`];
        }
        break;

      case TYPE_STR:
      case TYPE_REF:
        if (!Utils.isString(value)) {
          debugger;
          return [false, `Invalid value for field "${key}". Expected ${type}`];
        }
        break;

      case TYPE_NUMBER:
        if (!Utils.isNumber(value) && !Utils.isBoolean(value)) {
          debugger;
          return [false, `Invalid value for field "${key}". Expected ${type}`];
        }
        break;

      case TYPE_SET:
        if (!(value instanceof Set)) {
          debugger;
          return [false, `Invalid value for field "${key}". Expected ${type}`];
        }
        break;

      case TYPE_STR_SET:
      case TYPE_REF_SET:
        if (!(value instanceof Set)) {
          debugger;
          return [false, `Invalid value for field "${key}". Expected ${type}`];
        }
        for (const s of value) {
          if (!Utils.isString(s)) {
            debugger;
            return [
              false,
              `Invalid value for field "${key}". Expected ${type}`,
            ];
          }
        }
        break;

      case TYPE_RICHTEXT:
        if (!(value instanceof RT.RichText)) {
          debugger;
          return [false, `Invalid value for field "${key}". Expected ${type}`];
        }
        if (!isValidTree(value.builder.root)) {
          debugger;
          return [false, `Invalid value for field "${key}". Expected ${type}`];
        }
        break;

      case TYPE_MAP:
        if (!(value instanceof COWMap)) {
          return [false, 'Value must be COWMap']; //CHANGED BY DOR, crashing when merged map-type to v2
        }
        break;

      default:
        debugger;
        return [false, `Unknown type for field "${key}": ${type}`]; // Unknown type
    }
  }

  return [true, ''];
}

export function normalize(scheme, obj) {
  const fields = scheme.getFields();
  for (const [key, type] of Object.entries(fields)) {
    const value = obj[key];
    if (value === undefined) {
      continue;
    }
    switch (type) {
      case TYPE_RICHTEXT:
        obj[key].normalize();
        break;

      default:
        break;
    }
  }
}

export function stampChanges(changes, data, override = false) {
  for (const c of changes) {
    if (c.dataType === _TYPE_RICHTEXT_DIFF) {
      c.data.stampTreeChanges(data, override);
    }
  }
}

export function getObjectRefs(fieldsScheme, data) {
  const result = new Set();
  for (const [key, type] of Object.entries(fieldsScheme)) {
    switch (type) {
      case TYPE_REF: {
        const value = data[key];
        if (value) {
          Utils.assert(Utils.isString(value));
          result.add(value);
        }
        break;
      }

      case TYPE_REF_SET: {
        const value = data[key];
        if (value) {
          Utils.assert(value instanceof Set);
          Utils.Set.update(result, value);
        }
        break;
      }

      default:
        break;
    }
  }

  return result;
}

export function getChangedRefs(changes, outSet) {
  if (!outSet) {
    outSet = new Set();
  }
  for (const c of changes) {
    if (c.dataType === TYPE_REF) {
      outSet.add(c.data);
    } else if (c.dataType === TYPE_REF_SET) {
      Utils.Set.update(outSet, c.data);
    }
  }
  return outSet;
}

export function diffKeys(fieldsScheme, obj1, obj2, local) {
  const result = new Set();
  for (const k of Object.keys(obj1)) {
    if (fieldsScheme[k] && !obj2.hasOwnProperty(k)) {
      result.add(k);
    }
  }
  // Object.keys(obj1).forEach(k => {
  //   if (fieldsScheme[k] && !obj2.hasOwnProperty(k)) {
  //     result.add(k);
  //   }
  // });
  for (const k of Object.keys(obj2)) {
    //Object.keys(obj2).forEach(k => {
    const type = fieldsScheme[k];
    if (!type) {
      continue;
    }
    if (
      !obj1.hasOwnProperty(k) ||
      !valuesEqual(type, obj1[k], obj2[k], local)
    ) {
      result.add(k);
    }
  }
  return Array.from(result);
}

export class ObjectChange extends Change.BaseChange {
  constructor(kind, fieldname, data, dataType) {
    super();
    this.kind = kind;
    this.fieldname = fieldname;
    this.data = data;
    this.dataType = dataType;
  }

  get type() {
    return 'OC';
  }

  toJSImpl() {
    let d = null;
    switch (this.dataType) {
      case TYPE_RICHTEXT:
      case _TYPE_RICHTEXT_DIFF:
        d = this.data.toJS();
        break;

      case TYPE_DATE:
        d = Utils.serializeDate(this.data);
        break;

      case TYPE_STR:
      case TYPE_NUMBER:
      case TYPE_REF:
        d = this.data;
        break;

      case TYPE_SET:
      case TYPE_STR_SET:
      case TYPE_REF_SET:
        d = Utils.Set.mapToArray(this.data, JSON.stringify);
        break;

      case TYPE_MAP:
        d = this.data instanceof COWMap ? Array.from(this.data) : this.data;
        break;

      default:
        break;
    }
    const ret = {
      k: this.kind,
      f: this.fieldname,
    };
    if (typeof d !== 'undefined') {
      ret.d = d;
      ret.t = this.dataType;
    }
    return ret;
  }

  static fromJS(obj) {
    let d = undefined;
    if (typeof obj.d !== 'undefined') {
      switch (obj.t) {
        case _TYPE_RICHTEXT_DIFF:
          d = RichTextDiff.fromJS(obj.d);
          break;

        case TYPE_RICHTEXT:
          d = RT.RichText.fromJS(obj.d);
          break;

        case TYPE_DATE:
          d = Utils.deserializeDate(obj.d);
          break;

        case TYPE_STR:
        case TYPE_NUMBER:
        case TYPE_REF:
          d = obj.d;
          break;

        case TYPE_SET:
        case TYPE_STR_SET:
        case TYPE_REF_SET:
          d = Utils.Set.from(obj.d, JSON.parse);
          break;

        case TYPE_MAP:
          d = new COWMap(obj.d);
          break;

        default:
          debugger;
          throw new Error('Unkonwn value type: ' + obj.t);
          break;
      }
    }
    return new this(obj.k, obj.f, d, obj.t);
  }

  valueForPatch(type) {
    if (type === TYPE_DATE) {
      return Utils.deserializeDate(this.data);
    }
    if (type === TYPE_NUMBER && typeof this.data !== TYPE_NUMBER) {
      return Number(this.data);
    }
    if (type === TYPE_MAP && !(this.data instanceof COWMap)) {
      return new COWMap(this.data);
    }
    return this.data;
  }

  simplePatch(obj, type) {
    if (this.kind === Base.CHANGE_INSERT) {
      switch (type) {
        case TYPE_STR_SET:
        case TYPE_SET:
        case TYPE_REF_SET: {
          let set = obj[this.fieldname] || new Set();
          set = Utils.Set.unionByValue(set, this.valueForPatch(type));
          obj[this.fieldname] = set;
          break;
        }

        case TYPE_MAP: {
          let map = obj[this.fieldname];
          if (!map) {
            map = new COWMap();
            obj[this.fieldname] = map;
          }
          for (const [k, v] of this.valueForPatch(type)) {
            map.set(k, v);
          }
          break;
        }

        default:
          obj[this.fieldname] = this.valueForPatch(type);
          break;
      }
    } else if (this.kind === Base.CHANGE_DELETE) {
      switch (type) {
        case TYPE_STR_SET:
        case TYPE_SET:
        case TYPE_REF_SET: {
          let set = obj[this.fieldname];
          if (set) {
            set = Utils.Set.subtractByValue(set, this.valueForPatch(type));
            if (!set.size) {
              delete obj[this.fieldname];
            } else {
              obj[this.fieldname] = set;
            }
          }
          break;
        }

        case TYPE_MAP: {
          const map = obj[this.fieldname];
          if (!map) {
            break;
          }
          for (const [k, v] of this.valueForPatch(type)) {
            const curValue = map.get(k);
            if (Utils.deepEqual(curValue, v)) {
              map.delete(k);
            }
          }
          if (!map.size) {
            delete obj[this.fieldname];
          }
          break;
        }

        default:
          delete obj[this.fieldname];
          break;
      }
    } else {
      throw new Error('Unsupported change type: ' + type);
    }
  }
}

Change.registerType('OC', ObjectChange);
