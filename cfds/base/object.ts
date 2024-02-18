import { assert } from '../../base/error.ts';
import {
  DecodedValue,
  Decoder,
  ReadonlyDecodedArray,
  ReadonlyDecodedObject,
} from '../../base/core-types/encoding/index.ts';
import { Scheme } from './scheme.ts';
import { DataType, SchemeFields } from './scheme-types.ts';
import {
  getTypeOperations,
  SerializeValueTypeOptions,
  ValueType,
  valueTypeEquals,
  ValueTypeOptions,
} from './types/index.ts';
import { Change, EncodedChange } from '../change/index.ts';
import { decodeChange } from '../change/decode.ts';
import { CoreObject, Encoder } from '../../base/core-types/index.ts';
import { log } from '../../logging/log.ts';
import { isDecoder } from '../../base/core-types/encoding/types.ts';
import { JSONCyclicalDecoder } from '../../base/core-types/encoding/json.ts';
import { ReadonlyJSONObject } from '../../base/interfaces.ts';

export function isValidData(scheme: Scheme, data: DataType) {
  const requiredFields = scheme.getRequiredFields();
  if (requiredFields !== undefined) {
    for (const k of requiredFields) {
      if (!data.hasOwnProperty(k) && !scheme.hasInitForField(k)) {
        return [false, `Missing required field "${k}"`];
      }
    }
  }
  return validateFieldTypes(scheme.getFields(), data);
}

export function validateFieldTypes(
  fieldsScheme: SchemeFields,
  data: DataType,
): [boolean, string] {
  for (const [key, value] of Object.entries(data)) {
    const type = fieldsScheme[key];
    if (!type) {
      return [false, `Unknown field ${key}`];
    }

    const typeOP = getTypeOperations(type);
    if (!typeOP.validate(value)) {
      return [false, `Invalid value for field "${key}". Expected ${type}`];
    }
  }

  return [true, ''];
}

export function serialize(
  encoder: Encoder,
  fieldsScheme: SchemeFields,
  data: DataType,
  options: SerializeValueTypeOptions = {},
  overrides: {
    [key: string]: (
      encoder: Encoder,
      key: string,
      value: any,
      options: SerializeValueTypeOptions,
    ) => void;
  } = {},
) {
  if (!data) {
    return;
  }
  for (const [key, value] of Object.entries(data)) {
    const type = fieldsScheme[key];
    assert(type !== undefined, `Unknown field ${key}`);

    if (overrides[type]) {
      try {
        overrides[type](encoder, key, value, options);
        continue;
      } catch (e) {
        log({
          severity: 'INFO',
          error: 'SerializeError',
          trace: e.stack,
          message: e.message,
          key: key,
          valueType: type,
        });
      }
    }

    if (data[key] === undefined) {
      continue;
    }

    const typeOP = getTypeOperations(type);
    typeOP.serialize(key, value, encoder, options);
  }
}

export function deserialize(
  decoder: Decoder,
  fieldsScheme: SchemeFields,
  options: ValueTypeOptions = {},
  overrides: {
    [key: string]: (value: DecodedValue, options: ValueTypeOptions) => any;
  } = {},
): DataType {
  const data: DataType = {};

  for (const [key, type] of Object.entries(fieldsScheme)) {
    assert(type !== undefined, `Unknown field ${key}`);

    const decValue = decoder.get(key);
    if (decValue === undefined) continue;

    if (overrides[type]) {
      try {
        const value = overrides[type](decValue, options);
        if (value !== undefined) {
          data[key] = value;
        }
        continue;
      } catch (e) {
        log({
          severity: 'INFO',
          error: 'SerializeError',
          trace: e.stack,
          message: e.message,
          key,
          valueType: type,
        });
      }
    }

    const typeOP = getTypeOperations(type);
    const value = typeOP.deserialize(decValue, options);
    if (value !== undefined) {
      data[key] = value;
    }
  }

  return data;
}

export function equals(
  fields: SchemeFields,
  data1: DataType,
  data2: DataType,
  options: ValueTypeOptions = {},
) {
  if (!data1 && !data2) {
    return true;
  }
  if (!data1 && data2) {
    return false;
  }
  if (data1 && !data2) {
    return false;
  }

  for (const [key, type] of Object.entries(fields)) {
    if (!valueTypeEquals(type, data1[key], data2[key], options)) {
      return false;
    }
  }

  return true;
}

export function clone(
  fieldsScheme: SchemeFields,
  data: DataType,
  onlyFields?: string[],
): DataType {
  const result: DataType = {};
  for (const key of Object.keys(data)) {
    const type = fieldsScheme[key];
    if (!type) {
      continue;
    }

    if (onlyFields && !onlyFields.includes(key)) {
      continue;
    }

    const value = data[key];
    if (value === undefined) {
      result[key] = value;
      continue;
    }

    const typeOP = getTypeOperations(type);
    result[key] = typeOP.clone(value);
  }
  return result;
}

export function diff(
  schemeFields: SchemeFields,
  data1: DataType,
  data2: DataType,
  options: ValueTypeOptions = {},
): DataChanges {
  const changes: DataChanges = {};

  const addChanges = (
    field: string,
    fChanges: undefined | Change<EncodedChange> | Change<EncodedChange>[],
  ) => {
    if (fChanges === undefined) return;

    if (Array.isArray(fChanges)) {
      if (fChanges.length === 0) return;
    } else {
      fChanges = [fChanges];
    }
    for (const change of fChanges) {
      if (changes[field] === undefined) changes[field] = [];
      changes[field].push(change);
    }
  };

  for (const [key, type] of Object.entries(schemeFields)) {
    const value1 = data1[key];
    const value2 = data2[key];

    if (value1 === undefined && value2 === undefined) continue;

    const typeOP = getTypeOperations(type);

    let fChanges: undefined | Change<EncodedChange> | Change<EncodedChange>[];
    if (value1 === undefined && value2 !== undefined) {
      //New Value
      fChanges = typeOP.valueAddedDiff(value2, options);
    } else if (value1 !== undefined && value2 === undefined) {
      //Value Removed
      fChanges = typeOP.valueRemovedDiff(value1, options);
    } else {
      //Value Changed
      fChanges = typeOP.valueChangedDiff(value1, value2, options);
    }

    addChanges(key, fChanges);
  }

  return changes;
}

export function patch(
  fieldsScheme: SchemeFields,
  data: DataType,
  changes: DataChanges,
  options: ValueTypeOptions = {},
) {
  for (const [field, fChanges] of Object.entries(changes)) {
    const type = fieldsScheme[field];

    const typeOP = getTypeOperations(type);
    const newValue = typeOP.patch(data[field], fChanges, options);

    if (newValue === undefined) {
      delete data[field];
    } else {
      data[field] = newValue;
    }
  }

  return data;
}

export function getRefs(
  schemeFields: SchemeFields,
  data: DataType,
): Set<string> {
  const refs = new Set<string>();
  for (const [key, type] of Object.entries(schemeFields)) {
    getTypeOperations(type).fillRefs(refs, data[key]);
  }

  return refs;
}

export function getRefsFromValue(type: ValueType, value: any): Set<string> {
  const result = new Set<string>();
  if (value === undefined) {
    return result;
  }
  getTypeOperations(type).fillRefs(result, value);
  return result;
}

export function normalize(scheme: Scheme, data: DataType) {
  for (const [key, type] of Object.entries(scheme.fields)) {
    let value = data[key];

    const typeOP = getTypeOperations(type as ValueType);

    if (value !== undefined && typeOP.isEmpty(value)) {
      value = undefined;
    }

    if (value === undefined) {
      if (scheme.hasInitForField(key)) {
        value = scheme.initValueForField(key, data);
        data[key] = value;
      } else {
        delete data[key];
      }
    } else {
      data[key] = typeOP.normalize(value);
    }
  }
}

export function needGC(scheme: Scheme, data: DataType): boolean {
  for (const [key, type] of Object.entries(scheme.fields)) {
    let value = data[key];
    if (value === undefined) continue;

    const typeOP = getTypeOperations(type as ValueType);

    if (typeOP.needGC(value)) {
      return true;
    }
  }
  return false;
}

export function gc(scheme: Scheme, data: DataType): boolean {
  let result = false;
  for (const [key, type] of Object.entries(scheme.fields)) {
    let value = data[key];
    if (value === undefined) continue;

    const typeOP = getTypeOperations(type as ValueType);
    const newValue = typeOP.gc(value);
    if (newValue !== undefined) {
      data[key] = newValue;
      result = true;
    }
  }
  return result;
}

export function diffKeys(
  schemeFields: SchemeFields,
  data1: DataType,
  data2: DataType,
  options: ValueTypeOptions = {},
) {
  const result = new Set<string>();

  for (const key of Object.keys(data1)) {
    if (schemeFields[key] && !data2.hasOwnProperty(key)) {
      //Key not found in data2
      result.add(key);
    }
  }

  for (const key of Object.keys(data2)) {
    const type = schemeFields[key];
    if (!type) {
      continue;
    }
    if (!data1.hasOwnProperty(key)) {
      //Key not found in data1
      result.add(key);
      continue;
    }

    const typeOP = getTypeOperations(type);
    if (!typeOP.equals(data1[key], data2[key], options)) {
      //Key found in both, but is not equal
      result.add(key);
    }
  }
  return Array.from(result);
}

export interface DataChanges extends CoreObject {
  [key: string]: Change<EncodedChange>[];
}

export interface DecodedDataChange extends ReadonlyDecodedObject {
  [key: string]: Decoder[];
}

export function decodedDataChanges(dec: DecodedDataChange) {
  const changes: DataChanges = {};

  for (const key in dec) {
    changes[key] = (dec[key] as ReadonlyDecodedArray).map((v) =>
      decodeChange(v as Decoder),
    );
  }

  return changes;
}

export function concatChanges(changes1: DataChanges, changes2: DataChanges) {
  const changes: DataChanges = {};

  const addChanges = (fromChanges: DataChanges) => {
    for (const key in fromChanges) {
      if (changes[key] === undefined) {
        changes[key] = [];
      }
      changes[key].push(...fromChanges[key]);
    }
  };

  addChanges(changes1);
  addChanges(changes2);

  return changes;
}

export function anyChanges(changes: DataChanges) {
  for (const key in changes) {
    if (changes[key] !== undefined && changes[key].length > 0) {
      return true;
    }
  }
  return false;
}

export function rewriteRefs(
  scheme: Scheme,
  data: DataType,
  keyMapping: Map<string, string>,
  deleteRefs?: Set<string>,
): DataType {
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || !scheme.hasField(key)) {
      continue;
    }
    const type = scheme.getFieldType(key);
    const newValue = getTypeOperations(type).rewriteRefs(
      keyMapping,
      data[key],
      deleteRefs,
    );
    if (newValue === undefined) {
      delete data[key];
    } else {
      data[key] = newValue;
    }
  }
  return data;
}
