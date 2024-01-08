import { assert } from '../../base/error.ts';
import { isNoValue, isObject } from '../../base/comparisons.ts';
import { Scheme } from './scheme.ts';
import {
  clone,
  DataChanges,
  deserialize,
  diff as objectDiff,
  diffKeys,
  equals as dataEqual,
  gc,
  getRefs,
  isValidData,
  needGC,
  normalize as normalizeObject,
  patch as objectPatch,
  rewriteRefs,
  serialize,
} from './object.ts';
import {
  ConstructorDecoderConfig,
  Decoder,
  isDecoderConfig,
  ReadonlyDecodedObject,
} from '../../base/core-types/encoding/index.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../../base/core-types/encoding/json.ts';
import { DataType, kRecordIdField } from './scheme-types.ts';
import {
  ChecksumEncoderOpts,
  MD5Checksum,
} from '../../base/core-types/encoding/checksum.ts';
import { ReadonlyJSONObject } from '../../base/interfaces.ts';
import { CoreValue, Encodable, Encoder } from '../../base/core-types/index.ts';

export interface ReadonlyRecord {
  readonly isNull: boolean;
  readonly scheme: Scheme;
  readonly isValid: boolean;
  readonly checksum: string;
  readonly refs: Set<string>;

  get(key: string, defaultValue?: any): any;
  has(key: string): boolean;
  cloneData(): DataType;
}

export interface RecordConfig {
  scheme: Scheme;
  data: DataType;
  normalized?: boolean;
}

export interface EncodedRecord {
  s: Decoder;
  data: ReadonlyDecodedObject;
}

const checksumSerOptions: ChecksumEncoderOpts = {
  // For checksum purposes we need to use the flat rep or we won't account
  // for depth changes. Computing the checksum on a DFS run of the tree
  // completely strips out the depth info.
  flatRep: true,
  local: false,
  typeSafe: true,
};

export interface RecordValueWrapper<T> {
  __wrappedValueForRecord(): T;
}

export function isRecordValueWrapper<T>(v: any): v is RecordValueWrapper<T> {
  return typeof v.__wrappedValueForRecord === 'function';
}

export class Record implements ReadonlyRecord, Encodable {
  private _scheme!: Scheme;
  private _data!: DataType;
  private _checksum: string | undefined;
  private _cachedRefs: Set<string> | undefined;
  private _normalized = false;
  private _locked = false;

  constructor(config: RecordConfig | ConstructorDecoderConfig<EncodedRecord>) {
    if (isDecoderConfig(config)) {
      this.deserialize(config.decoder);
    } else {
      assert(isObject(config.data));
      this._scheme = config.scheme;
      this._data = config.data;
      this._normalized = config.normalized === true;
    }
    this.normalize();
    this.assertValidData();
  }

  static nullRecord() {
    return new this({ scheme: Scheme.nullScheme(), data: {} });
  }

  get isNull() {
    return this.scheme.isNull;
  }

  get scheme() {
    return this._scheme;
  }

  get isValid(): boolean {
    return isValidData(this.scheme, this._data)[0] as boolean;
  }

  /**
   * Returns a strong checksum that can be used to efficiently test for
   * equality between two records. It is used to guard against diff/patch bugs
   * that'd otherwise throw both ends of the diff-sync loop out of sync and lead
   * to corruption. We use it as an alternative to the sequential versioning
   * used in the original diff-sync paper by Neil Fraser.
   *
   * Any legacy cryptographic hash would probably do here. The current
   * implementation uses MD5 simply because its so common.
   *
   * WARNING: Any change here may require to re-calculate checksums in the
   * backend's DB for ALL records and their versions (lifetime).
   */
  get checksum(): string {
    this.normalize();
    if (this._checksum === undefined) {
      const csEncoder = new MD5Checksum();
      serialize(csEncoder, this._scheme.fields, this._data, checksumSerOptions);
      this._checksum = csEncoder.getOutput();
    }
    return this._checksum;
  }

  get refs(): Set<string> {
    if (this._cachedRefs === undefined) {
      this._cachedRefs = getRefs(this.scheme.fields, this._data);
    }
    return this._cachedRefs;
  }

  get keys(): string[] {
    return Object.keys(this._data);
  }

  get<T = any>(key: string, defaultValue?: T): T {
    assert(
      this.scheme.hasField(key),
      `Unknown field name '${key}' for scheme '${this.scheme.namespace}'`,
    );
    const data = this._data;

    if (data.hasOwnProperty(key)) {
      return data[key];
    }
    return (!isNoValue(defaultValue) ? defaultValue : undefined) as T;
  }

  has(key: string): boolean {
    assert(
      this.scheme.hasField(key),
      `Unknown field name '${key}' for scheme '${this.scheme.namespace}'`,
    );
    return this._data.hasOwnProperty(key);
  }

  set(key: string, value: any): void {
    assert(!this._locked);
    assert(
      this.scheme.hasField(key),
      `Unknown field name '${key}' for scheme '${this.scheme.namespace}'`,
    );
    if (isRecordValueWrapper(value)) {
      value = value.__wrappedValueForRecord();
    }
    if (value === undefined) {
      this.delete(key);
      return;
    }
    this._data[key] = value;
    this._invalidateCaches();
    this.normalize();
  }

  setMultiple(data: { [K in string]: any }): void {
    assert(!this._locked);
    for (const [key, value] of Object.entries(data)) {
      this.set(key, value);
    }
  }

  delete(key: string): boolean {
    assert(!this._locked);
    assert(
      this.scheme.hasField(key),
      `Unknown field name '${key}' for scheme '${this.scheme.namespace}'`,
    );
    const success = delete this._data[key];
    this._invalidateCaches();
    this.normalize();
    return success;
  }

  touch() {
    this._invalidateCaches();
  }

  isEqual(other: Record, local = false): boolean {
    if (this === other /*|| (!local && this.checksum === other.checksum)*/) {
      return true;
    }
    if (!this.scheme.isEqual(other.scheme)) {
      return false;
    }
    this.normalize();
    other.normalize();
    if (this._checksum && other._checksum && !local) {
      return this._checksum === other._checksum;
    }
    return dataEqual(this.scheme.getFields(), this._data, other._data, {
      local,
    });
  }

  clone(): Record {
    const scheme = this._scheme;
    const result = new Record({
      scheme,
      data: clone(scheme.getFields(), this._data),
      normalized: this._normalized,
    });
    result._checksum = this._checksum;
    return result;
  }

  cloneData(onlyFields?: string[]): any {
    return clone(this._scheme.getFields(), this._data, onlyFields);
  }

  copyFrom(record: ReadonlyRecord | Record) {
    assert(!this._locked);
    this._scheme = record.scheme;
    this._data = record.cloneData();
    this._invalidateCaches();
  }

  diff(other: Record, local: boolean, byCharacter?: boolean) {
    assert(other instanceof Record);

    this.normalize();
    other.normalize();

    other.assertValidData();
    return objectDiff(other.scheme.getFields(), this._data, other._data, {
      local,
      byCharacter,
    });
  }

  patch(changes: DataChanges) {
    assert(!this._locked);
    const scheme = this.scheme;
    this._data = objectPatch(scheme.getFields(), this._data, changes);
    this._invalidateCaches();
    this.normalize();
  }

  diffKeys(other: Record, local: boolean): string[] {
    this.normalize();
    other.normalize();
    return diffKeys(other.scheme.fields, this._data, other._data, {
      local,
    });
  }

  upgradeScheme(newScheme: Scheme) {
    assert(!this._locked);
    assert(newScheme.allowsAutoUpgradeFrom(this.scheme));
    this._data = newScheme.upgradeData(this.scheme, this._data);
    this._scheme = newScheme;
    this._invalidateCaches();
    this.normalize();
  }

  upgradeSchemeToLatest() {
    assert(!this._locked);
    if (!this._scheme.upgradeAvailable()) {
      return false; //No need to update
    }
    this.upgradeScheme(Scheme.getLatestVersion(this.scheme.namespace));
    return true;
  }

  normalize(): void {
    if (this._normalized || this.isNull) {
      return;
    }
    this._invalidateCaches();
    normalizeObject(this.scheme, this._data);
    this._normalized = true;
  }

  gc(): boolean {
    return gc(this._scheme, this._data);
  }

  needGC(): boolean {
    return needGC(this._scheme, this._data);
  }

  serialize(
    encoder: Encoder<string, CoreValue>,
    options = { local: false },
  ): void {
    this.normalize();
    encoder.set('s', this.scheme);
    const dataEncoder = encoder.newEncoder();
    serialize(dataEncoder, this.scheme.getFields(), this._data, {
      local: options.local,
    });
    encoder.set('d', dataEncoder.getOutput());
    encoder.set('n', this._normalized);
  }

  deserialize(decoder: Decoder): void {
    assert(!this._locked);
    this._scheme = new Scheme({ decoder: decoder.getDecoder('s') });
    this._data = deserialize(decoder.getDecoder('d'), this.scheme.fields);

    this._invalidateCaches();
    this._normalized = decoder.get<boolean>('n') || false;
    this.normalize();
    this.assertValidData();
  }

  toJS(local = false): ReadonlyJSONObject {
    const encoder = new JSONCyclicalEncoder();
    this.serialize(encoder, { local });
    return encoder.getOutput() as ReadonlyJSONObject;
  }

  static fromJS(obj: ReadonlyJSONObject): Record {
    const decoder = new JSONCyclicalDecoder(obj);
    const record = new this({ decoder });
    return record;
  }

  assertValidData() {
    const [valid, msg] = isValidData(this.scheme, this._data);
    assert(<boolean>valid, <string>msg);
  }

  private _invalidateCaches() {
    this._checksum = undefined;
    this._cachedRefs = undefined;
    this._normalized = false;
    this._cachedRefs = undefined;
  }

  rewriteRefs(keyMapping: Map<string, string>, deleteRefs?: Set<string>): void {
    assert(!this._locked);
    rewriteRefs(this.scheme, this._data, keyMapping, deleteRefs);
    this._invalidateCaches();
    this.normalize();
  }

  lock(): void {
    this._locked = true;
  }

  unlock(): void {
    this._locked = false;
  }
}
