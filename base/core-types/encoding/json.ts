import {
  JSONObject,
  JSONValue,
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from '../../interfaces.ts';
import { CoreOptions, CoreType, CoreValue, Encoder } from '../base.ts';
import { getCoreType } from '../utils.ts';
import {
  isEncodedDate,
  isEncodedEncodable,
  isEncodedSet,
  JSONBaseEncoder,
} from './base-encoder.ts';
import {
  BaseCyclicalEncoder,
  EncodedRef,
  isEncodedRef,
  isEncodedRefObject,
} from './cyclical.ts';
import { DecodedValue, Decoder } from './types.ts';
import { newInstance } from '../../common.ts';
import { deserializeDate } from '../../date.ts';
import { Encodable } from '../index.ts';

export class JSONEncoder extends JSONBaseEncoder<ReadonlyJSONValue> {
  private _encodedObj: JSONObject;

  constructor() {
    super();
    this._encodedObj = {};
  }

  getOutput(): ReadonlyJSONObject {
    return this._encodedObj;
  }

  newEncoder() {
    return newInstance<JSONEncoder>(this);
  }

  static toJS(value: CoreValue): ReadonlyJSONValue {
    const encoder = new this();
    return encoder.convertValue(value);
  }

  protected setPrimitive(
    key: string,
    value: ReadonlyJSONValue,
    _options?: unknown,
  ): void {
    this._encodedObj[key] = value;
  }
}

export class JSONCyclicalEncoder extends BaseCyclicalEncoder<
  number,
  ReadonlyJSONValue
> {
  private _encoder: JSONEncoder;

  constructor() {
    super();
    this._encoder = new JSONEncoder();
  }

  get encoder(): Encoder<string, CoreValue, ReadonlyJSONValue, CoreOptions> {
    return this._encoder;
  }
  get initRefId(): number {
    return 0;
  }
  nextRefId(prev: number): number {
    return prev + 1;
  }
  convertRef(refId: number, _options?: CoreOptions): ReadonlyJSONValue {
    const ref: EncodedRef = {
      __rId: refId,
    };
    return ref;
  }

  convertRefsMap(
    map: Map<CoreValue, number>,
    options?: CoreOptions,
  ): CoreValue {
    const refs = Array.from(map.entries())
      .sort((a, b) => a[1] - b[1])
      .map((e) => this._encoder.convertValue(e[0], options));

    return refs;
  }

  newEncoder(): Encoder<string, CoreValue, ReadonlyJSONValue, CoreOptions> {
    return new JSONCyclicalEncoder();
  }

  static serialize<T = unknown>(obj: Encodable, opts?: T): ReadonlyJSONObject {
    const encoder = new JSONCyclicalEncoder();
    obj.serialize(encoder, opts);
    return encoder.getOutput() as ReadonlyJSONObject;
  }
}

export class JSONDecoder implements Decoder {
  private readonly _data: ReadonlyJSONObject;

  constructor(encodedValue: ReadonlyJSONObject | undefined) {
    this._data = encodedValue || {};
  }

  get<T extends DecodedValue>(key: string, defaultValue?: T): T | undefined {
    if (!this.has(key)) {
      return defaultValue;
    }
    const val = this._data[key];
    if (!this.needDecode(val)) {
      return val as T;
    }
    return this.decodeValue(this._data[key]) as T;
  }

  protected needDecode(value: ReadonlyJSONValue) {
    if (value instanceof Array) {
      for (const item of value) {
        if (this.needDecode(item)) {
          return true;
        }
      }
    }
    if (isEncodedSet(value)) {
      return true;
    }
    if (isEncodedDate(value)) {
      return true;
    }
    if (isEncodedEncodable(value)) {
      return true;
    }
    if (getCoreType(value) === CoreType.Object) {
      for (const val of Object.values(value as ReadonlyJSONObject)) {
        if (this.needDecode(val as ReadonlyJSONValue)) {
          return true;
        }
      }
    }

    return false;
  }

  has(key: string): boolean {
    // deno-lint-ignore no-prototype-builtins
    return this._data.hasOwnProperty(key);
  }

  getDecoder(key: string, offset?: number): Decoder<string, ReadonlyJSONValue> {
    let value = this.get(key);
    if (offset !== undefined && value instanceof Array) {
      value = value[offset];
    }
    if (value instanceof JSONDecoder) {
      return value;
    }

    return newInstance(this, value);
  }

  decodeValue(value: ReadonlyJSONValue): DecodedValue {
    if (value instanceof Array) {
      return value.map((v) => this.decodeValue(v));
    }
    if (isEncodedSet(value)) {
      const set = new Set<DecodedValue>();
      for (const v of value.__v) {
        set.add(this.decodeValue(v));
      }
      return set;
    }
    if (isEncodedDate(value)) {
      return deserializeDate(value.__v);
    }
    if (isEncodedEncodable(value)) {
      return newInstance<JSONDecoder>(this, value.__v);
    }
    if (getCoreType(value) === CoreType.Object) {
      return this.decodeObject(value as ReadonlyJSONObject);
    }
    return value;
  }

  protected decodeObject(jsonObj: ReadonlyJSONObject): {
    [key: string]: DecodedValue;
  } {
    const obj: { [key: string]: DecodedValue } = {};
    for (let [k, v] of Object.entries(jsonObj)) {
      if (
        v instanceof Array ||
        isEncodedSet(v) ||
        isEncodedDate(v) ||
        isEncodedEncodable(v) ||
        getCoreType(v) === CoreType.Object
      ) {
        v = this.decodeValue(v as ReadonlyJSONValue) as JSONValue;
      }
      obj[k] = v;
    }
    return obj;
  }
}

export class JSONCyclicalDecoder extends JSONDecoder {
  private _tempRefs?: ReadonlyJSONObject[][];

  constructor(encodedValue: ReadonlyJSONObject | undefined) {
    super(encodedValue);
  }

  needDecode(value: ReadonlyJSONValue) {
    if (isEncodedRefObject(value)) {
      return true;
    }
    return super.needDecode(value);
  }

  decodeValue(value: ReadonlyJSONValue): DecodedValue {
    if (isEncodedRefObject(value)) {
      if (!this._tempRefs) this._tempRefs = [];
      this._tempRefs.push(value.__r);
      const obj = this.decodeObject(value.__d);
      this._tempRefs.pop();
      return obj;
    }
    return super.decodeValue(value);
  }

  protected decodeObject(jsonObj: ReadonlyJSONObject): {
    [key: string]: DecodedValue;
  } {
    if (isEncodedRef(jsonObj) && this._tempRefs) {
      const refs = this._tempRefs[this._tempRefs.length - 1];
      return refs[jsonObj.__rId as number];
    }
    return super.decodeObject(jsonObj);
  }
}
