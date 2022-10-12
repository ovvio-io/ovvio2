import { assert } from '../../base/error.ts';
import { Scheme } from './scheme.ts';
import {
  isValidData,
  serialize,
  equals as dataEqual,
  deserialize,
  clone,
  diff as objectDiff,
  patch as objectPatch,
  getRefs,
  normalize as normalizeObject,
  diffKeys,
  DataChanges,
  gc,
  needGC,
  rewriteRefs,
} from './object.ts';
import {
  ConstructorDecoderConfig,
  Decoder,
  isDecoderConfig,
  ReadonlyDecodedObject,
} from '../encoding/index.ts';
import { JSONCyclicalDecoder, JSONCyclicalEncoder } from '../encoding/json.ts';
import { DataType } from './scheme-types.ts';
import { ChecksumEncoderOpts, MD5Checksum } from '../encoding/checksum.ts';
import { ReadonlyJSONObject } from '../../base/interfaces.ts';
import { CoreValue, Encodable, Encoder } from '../core-types/index.ts';

export interface ReadonlyRecord {
  readonly isNull: boolean;
  readonly scheme: Scheme;
  readonly isValid: boolean;
  readonly checksum: string;
  /**
   * @deprecated No longer used. Assume undefined.
   */
  readonly serverTimestamp?: Date;
  readonly refs: Set<string>;
  readonly serverVersion: number;

  get(key: string, defaultValue?: any): any;
  has(key: string): boolean;
  cloneData(): DataType;
}

export interface RecordConfig {
  scheme: Scheme;
  data: DataType;
  serverVersion?: number;
}

export interface EncodedRecord {
  s: Decoder;
  data: ReadonlyDecodedObject;
  serverVersion?: number;
}

const checksumSerOptions: ChecksumEncoderOpts = {
  // For checksum purposes we need to use the flat rep or we won't account
  // for depth changes. Computing the checksum on a DFS run of the tree
  // completely strips out the depth info.
  flatRep: true,
  local: false,
  typeSafe: true,
};

export class Record implements ReadonlyRecord, Encodable {
  private _scheme!: Scheme;
  private _data!: DataType;
  private _checksum: string | undefined;
  private _cachedRefs: Set<string> | undefined;
  private _normalized: boolean = false;
  private _serverVersion!: number;

  constructor(config: RecordConfig | ConstructorDecoderConfig<EncodedRecord>) {
    if (isDecoderConfig(config)) {
      this.deserialize(config.decoder);
    } else {
      Utils.assert(Utils.isObject(config.data));
      this._scheme = config.scheme;
      this._data = config.data;
      this._serverVersion = config.serverVersion || 0;
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
    return <boolean>isValidData(this.scheme, this._data)[0];
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

  get serverVersion(): number {
    return this._serverVersion;
  }

  set serverVersion(v: number) {
    this._serverVersion = v;
  }

  get<T = any>(key: string, defaultValue?: T): T {
    assert(
      this.scheme.hasField(key),
      `Unknown field name '${key}' for scheme '${this.scheme.namespace}'`
    );
    const data = this._data;

    if (data.hasOwnProperty(key)) {
      return data[key];
    }
    return (!Utils.isNoValue(defaultValue) ? defaultValue : undefined) as T;
  }

  has(key: string): boolean {
    assert(
      this.scheme.hasField(key),
      `Unknown field name '${key}' for scheme '${this.scheme.namespace}'`
    );
    return this._data.hasOwnProperty(key);
  }

  set(key: string, value: any) {
    assert(
      this.scheme.hasField(key),
      `Unknown field name '${key}' for scheme '${this.scheme.namespace}'`
    );
    if (value === undefined) {
      this.delete(key);
      return;
    }
    this._data[key] = value;
    this._invalidateCaches();
    this.normalize();
  }

  setMultiple(data: { [K in string]: any }) {
    for (const [key, value] of Object.entries(data)) {
      this.set(key, value);
    }
  }

  delete(key: string): boolean {
    assert(
      this.scheme.hasField(key),
      `Unknown field name '${key}' for scheme '${this.scheme.namespace}'`
    );
    const success = delete this._data[key];
    this._invalidateCaches();
    this.normalize();
    return success;
  }

  touch() {
    this._invalidateCaches();
  }

  isEqual(other: Record, local: boolean = false): boolean {
    if (this === other) {
      return true;
    }
    if (!this.scheme.isEqual(other.scheme)) {
      return false;
    }
    this.normalize();
    other.normalize();
    return dataEqual(this.scheme.getFields(), this._data, other._data, {
      local,
    });
  }

  clone(): Record {
    const scheme = this._scheme;
    const result = new Record({
      scheme,
      data: clone(scheme.getFields(), this._data),
      serverVersion: this.serverVersion,
    });
    result._checksum = this._checksum;
    return result;
  }

  cloneData(onlyFields?: string[]): any {
    return clone(this._scheme.getFields(), this._data, onlyFields);
  }

  copyFrom(record: ReadonlyRecord | Record) {
    this._scheme = record.scheme;
    this._data = record.cloneData();
    this._serverVersion = record.serverVersion;
    this._invalidateCaches();
  }

  diff(other: Record, local: boolean) {
    Utils.assert(other instanceof Record);

    this.normalize();
    other.normalize();

    other.assertValidData();
    return objectDiff(other.scheme.getFields(), this._data, other._data, {
      local,
    });
  }

  patch(changes: DataChanges) {
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
    Utils.assert(newScheme.allowsAutoUpgradeFrom(this.scheme));
    this._data = newScheme.upgradeData(this.scheme, this._data);
    this._scheme = newScheme;
    this._invalidateCaches();
    this.normalize();
  }

  upgradeSchemeToLatest() {
    if (!this._scheme.upgradeAvailable()) {
      return false; //No need to update
    }
    this.upgradeScheme(Scheme.getLatestVersion(this.scheme.namespace));
    return true;
  }

  normalize(): void {
    if (this._normalized) {
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
    options = { local: false }
  ): void {
    encoder.set('s', this.scheme);

    const dataEncoder = encoder.newEncoder();
    serialize(dataEncoder, this.scheme.getFields(), this._data, {
      local: options.local,
    });
    encoder.set('d', dataEncoder.getOutput());

    encoder.set('v', this.serverVersion);
  }

  deserialize(decoder: Decoder): void {
    this._scheme = new Scheme({ decoder: decoder.getDecoder('s') });
    this._data = deserialize(decoder.getDecoder('d'), this.scheme.fields);
    this._serverVersion = decoder.get<number>('v')!;

    this._invalidateCaches();
    this.normalize();
    this.assertValidData();
  }

  toJS(local = false): ReadonlyJSONObject {
    const encoder = new JSONCyclicalEncoder();
    this.serialize(encoder, { local });
    return encoder.getOutput() as ReadonlyJSONObject;
  }

  static fromJS(obj: ReadonlyJSONObject, version?: number): Record {
    const decoder = new JSONCyclicalDecoder(obj);

    const record = new this({ decoder });

    if (version !== undefined) {
      record.serverVersion = version;
    }

    return record;
  }

  assertValidData() {
    const [valid, msg] = isValidData(this.scheme, this._data);
    Utils.assert(<boolean>valid, <string>msg);
  }

  private _invalidateCaches() {
    this._checksum = undefined;
    this._cachedRefs = undefined;
    this._normalized = false;
    this._cachedRefs = undefined;
  }

  rewriteRefs(keyMapping: Map<string, string>, deleteRefs?: Set<string>): void {
    rewriteRefs(this.scheme, this._data, keyMapping, deleteRefs);
    this._invalidateCaches();
    this.normalize();
  }
}
