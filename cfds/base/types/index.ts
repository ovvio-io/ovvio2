import { DecodedValue } from '../../../base/core-types/encoding/index.ts';
import { Change, EncodedChange } from '../../change/index.ts';
import { MapTypeOperations } from './map-type.ts';
import { PrimitiveTypeOperations } from './primitive-type.ts';
import { SetTypeOperations } from './set-type.ts';
import { StringTypeOperations } from './string-type.ts';
// import { RichText2TypeOperations } from './richtext2-type';
import { RichText3TypeOperations } from './richtext3-type.ts';
import {
  CoreOptions,
  CoreType,
  CoreValue,
  Encoder,
  getCoreType,
} from '../../../base/core-types/index.ts';
import { DateTypeOperations } from './date-type.ts';
import { ChecksumEncoderOpts } from '../../../base/core-types/encoding/checksum.ts';

export enum ValueType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  // RICHTEXT_V2 = 'richtext',
  STR_SET = 'stringset',
  SET = 'set',
  REF = 'ref',
  REF_SET = 'refset',
  MAP = 'map',
  REF_MAP = 'refmap',
  RICHTEXT_V3 = 'richtext-3',
}

export function isRefValueType(type: ValueType): boolean {
  return (
    type === ValueType.REF ||
    type === ValueType.REF_SET ||
    type === ValueType.RICHTEXT_V3
  );
}

export interface ValueTypeOptions {
  local?: boolean;
  byCharacter?: boolean;
}

export interface SerializeValueTypeOptions extends ChecksumEncoderOpts {
  local?: boolean;
  flatRep?: boolean;
}

export interface IValueTypeOperations<T = any> {
  get valueType(): ValueType;

  clone(value: T): T;

  equals(val1: T, val2: T, options?: ValueTypeOptions): boolean;

  validate(value: any): boolean;

  serialize(
    key: string,
    value: T,
    encoder: Encoder,
    options?: SerializeValueTypeOptions,
  ): void;

  deserialize(value: DecodedValue, options?: ValueTypeOptions): T;

  /**
   * value for data1 is undefined, value2 should be added by diff
   * @param value2
   * @param type
   * @param options
   */
  valueAddedDiff(
    value2: T,
    options?: ValueTypeOptions,
  ): undefined | Change<EncodedChange> | Change<EncodedChange>[];

  /**
   * value for data2 is undefined, value1 should be deleted by diff
   * @param value1
   * @param type
   * @param options
   */
  valueRemovedDiff(
    value1: T,
    options?: ValueTypeOptions,
  ): undefined | Change<EncodedChange> | Change<EncodedChange>[];

  valueChangedDiff(
    value1: T,
    value2: T,
    options?: ValueTypeOptions,
  ): undefined | Change<EncodedChange> | Change<EncodedChange>[];

  patch(
    curValue: T | undefined,
    changes: Change<EncodedChange>[],
    options?: ValueTypeOptions,
  ): T | undefined;

  fillRefs(refs: Set<string>, value: T): void;

  normalize(value: T): T;

  isEmpty(value: T): boolean;

  needGC(value: T): boolean;
  gc(value: T): T | undefined;

  rewriteRefs(
    keyMapping: Map<string, string>,
    value: T,
    deleteRefs?: Set<string>,
  ): T | undefined;
}

const typeOperations: { [key: string]: IValueTypeOperations } = {};

export function getTypeOperations<T = any>(
  type: ValueType,
): IValueTypeOperations<T> {
  const op = typeOperations[type];
  if (op === undefined) {
    throw new Error(`type operations for: ${type} has not been implemented`);
  }
  return op;
}

export function getTypeOperationsByValue(
  value: CoreValue,
): IValueTypeOperations {
  for (const typeOP of Object.values(typeOperations)) {
    if (typeOP.validate(value)) {
      return typeOP;
    }
  }

  throw new Error(`getTypeOperationsByValue failed for: ${value}`);
}

registerTypeOperations();

function registerTypeOperations() {
  if (Object.entries(typeOperations).length === 0) {
    const register = (op: IValueTypeOperations) => {
      typeOperations[op.valueType] = op;
    };

    register(new StringTypeOperations(false));
    register(new StringTypeOperations(true));
    register(new PrimitiveTypeOperations(CoreType.Number, ValueType.NUMBER));
    register(new PrimitiveTypeOperations(CoreType.Boolean, ValueType.BOOLEAN));
    register(new DateTypeOperations());
    register(new SetTypeOperations(false, ValueType.SET));
    register(new SetTypeOperations(false, ValueType.STR_SET));
    register(new SetTypeOperations(true, ValueType.REF_SET));
    register(new MapTypeOperations(false, ValueType.MAP));
    register(new MapTypeOperations(true, ValueType.REF_MAP));
    // register(new RichText2TypeOperations());
    register(new RichText3TypeOperations());

    //Add Types Here
  }
}

export function valueTypeEquals<TValue>(
  type: ValueType,
  value1: TValue | undefined,
  value2: TValue | undefined,
  options?: ValueTypeOptions,
) {
  if (value1 === undefined && value2 !== undefined) {
    return false;
  }
  if (value1 !== undefined && value2 === undefined) {
    return false;
  }
  if (value1 === undefined && value2 === undefined) {
    return true;
  }
  const typeOP = getTypeOperations(type);
  return typeOP.equals(value1, value2, options);
}
