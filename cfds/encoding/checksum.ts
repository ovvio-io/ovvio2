import Utils, { randomInt } from '@ovvio/base/lib/utils';
import { MurmurHash3 } from '@ovvio/base/lib/utils/hash';
import { StreamMD5 } from '../external/md5';
import { BaseEncoder } from './base-encoder';
import {
  CoreDictionary,
  CoreOptions,
  CoreValue,
  Encodable,
  ReadonlyCoreArray,
  ReadonlyCoreObject,
} from '../core-types/base';
import { getCoreType } from '../core-types/utils';
import { SerializeValueTypeOptions } from '../base/types';

export interface ChecksumEncoderOpts extends SerializeValueTypeOptions {
  typeSafe?: boolean;
}

export abstract class ChecksumEncoder<
  ST,
  OT extends ChecksumEncoderOpts = ChecksumEncoderOpts
> extends BaseEncoder<string, string, OT> {
  private _data: { [key: string]: string };
  private _defaultOpts: OT | undefined;
  readonly typeSafe: boolean;

  constructor(opts?: OT) {
    super(opts);
    this._data = {};
    this.typeSafe = opts?.typeSafe === true;
    this._defaultOpts = opts;
  }

  newEncoder() {
    return Utils.newInstance<ChecksumEncoder<ST, OT>>(this);
  }

  getOutput(): string {
    const data = this._data;
    const keys = Object.keys(data).sort();
    const typeSafe = this.typeSafe;
    let state = this.newState();
    for (const k of keys) {
      state = this.appendValue(state, typeSafe ? 'k' + k : k);
      state = this.appendValue(state, data[k]);
    }
    return this.finalizeState(state);
  }

  protected getDefaultOpts(): OT | undefined {
    return this._defaultOpts;
  }

  protected setPrimitive(key: string, value: string, _options?: OT): void {
    this._data[key] = value;
  }

  protected isNativeValue(value: CoreValue, options?: OT): value is string {
    const typeSafe =
      typeof options?.typeSafe === 'boolean' ? options.typeSafe : this.typeSafe;
    return typeSafe ? false : typeof value === 'string';
  }

  checksumForValue(value: CoreValue, options?: OT): string {
    return this.checksumForString(this.convertValue(value, options));
  }

  convertValue(value: CoreValue, options?: OT): string {
    const type = getCoreType(value);
    const converted = super.convertValue(value, options);
    const typeSafe =
      typeof options?.typeSafe === 'boolean' ? options.typeSafe : this.typeSafe;
    return typeSafe ? String(type) + converted : converted;
  }

  protected convertEncodable(
    value: Encodable<string, CoreValue>,
    options?: OT
  ): string {
    const encoder = this.newEncoder();
    value.serialize(encoder, options);
    return encoder.getOutput();
  }

  protected convertSet(set: Set<CoreValue>, options?: OT): string {
    const checksums: string[] = [];

    const iterableFilter = options?.iterableFilter || this.iterableFilter;
    for (const v of set) {
      if (iterableFilter === undefined || iterableFilter(v)) {
        checksums.push(this.checksumForValue(v, options));
      }
    }
    checksums.sort();
    return this.convertArray(checksums);
  }

  protected convertArray(arr: ReadonlyCoreArray, options?: OT): string {
    const state = this.newState();
    const iterableFilter = options?.iterableFilter || this.iterableFilter;

    for (const v of arr) {
      if (iterableFilter === undefined || iterableFilter(v)) {
        this.appendValue(state, this.convertValue(v, options));
      }
    }
    return this.finalizeState(state);
  }

  protected convertGenerator(g: Generator<CoreValue>, options?: OT): string {
    const state = this.newState();
    const iterableFilter = options?.iterableFilter || this.iterableFilter;
    for (const v of g) {
      if (iterableFilter === undefined || iterableFilter(v)) {
        this.appendValue(state, this.convertValue(v, options));
      }
    }
    return this.finalizeState(state);
  }

  protected convertObject(obj: ReadonlyCoreObject, options?: OT): string {
    const encoder = Utils.newInstance<ChecksumEncoder<ST, OT>>(this, {
      ...this.getDefaultOpts(),
      ...options,
    });
    // We use an inner encoder which sorts the keys and generates a consistent
    // value.
    const keyFilter = options?.objectFilterFields || this.objectFilterFields;
    for (const [k, v] of Object.entries(obj)) {
      if (keyFilter(k, obj)) {
        encoder.set(k, v);
      }
    }
    return encoder.getOutput();
  }

  protected convertNumber(n: number, _options?: OT): string {
    return String(n);
  }

  protected convertBoolean(b: boolean, _options?: OT): string {
    return b ? 'true' : 'false';
  }

  protected convertString(str: string, _options?: OT): string {
    return str;
  }

  protected convertNull(_options?: OT): string {
    return 'null';
  }

  protected convertUndefined(_options?: OT): string {
    return 'undefined';
  }

  protected convertDate(date: Date, _options?: OT): string {
    return String(Utils.serializeDate(date));
  }

  protected convertDictionary(value: CoreDictionary, _options?: OT) {
    const encoder = Utils.newInstance<ChecksumEncoder<ST, OT>>(this);
    for (const [k, v] of value) {
      encoder.set(k, v);
    }
    return encoder.getOutput();
  }

  protected checksumForString(value: string, options?: OT): string {
    return this.finalizeState(
      this.appendValue(this.newState(options), value, options),
      options
    );
  }

  protected abstract newState(options?: OT): ST;
  protected abstract appendValue(state: ST, value: string, options?: OT): ST;
  protected abstract finalizeState(state: ST, options?: OT): string;
}

export class MD5Checksum<OT = any> extends ChecksumEncoder<any, OT> {
  protected newState() {
    return StreamMD5.init();
  }

  protected appendValue(state: any, value: string) {
    StreamMD5.update(state, value);
    return state;
  }
  protected finalizeState(state: any): string {
    return StreamMD5.finalize(state);
  }
}

export interface Murmur3Opts extends ChecksumEncoderOpts {
  seed?: number;
}

export class Murmur3Checksum extends ChecksumEncoder<MurmurHash3, Murmur3Opts> {
  readonly _seed: number;

  constructor(options?: Murmur3Opts) {
    if (options === undefined) {
      options = {};
    }
    if (options.seed === undefined) {
      // By default, start with the same seed for everyone
      // options.seed = 3172939476544195;
      options.seed = randomInt(0, Number.MAX_SAFE_INTEGER);
    }
    super(options);
    this._seed = options.seed;
  }

  protected newState(options?: Murmur3Opts): MurmurHash3 {
    return new MurmurHash3(options?.seed || this._seed);
  }

  protected appendValue(
    state: MurmurHash3,
    value: string,
    options?: Murmur3Opts
  ) {
    state.hash(value);
    return state;
  }
  protected finalizeState(state: MurmurHash3, options?: Murmur3Opts): string {
    return String(state.result());
  }
}
