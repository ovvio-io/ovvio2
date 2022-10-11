import { Record } from '../../base/record';
import { DataType } from '../../base/scheme-types';
import {
  Clonable,
  Comparable,
  CoreValue,
  Equatable,
  ReadonlyCoreObject,
} from '../../core-types';
import { MutationPack } from './mutations';

export interface IVertex
  extends Comparable<IVertex>,
    Equatable<IVertex>,
    Clonable<IVertex> {
  readonly key: string;
  readonly record: Record;
  readonly namespace: string;
  readonly isLoading: boolean;
  readonly errorCode: number | undefined;
  readonly isDeleted: number;

  getCompositeValue<T extends CoreValue = CoreValue>(
    fieldName: string
  ): T | undefined;

  cloneData(): DataType;
}

export interface CompositeField<
  V extends IVertex = IVertex,
  T extends CoreValue = CoreValue
> {
  calcValue(vertex: V): T;
  shouldInvalidate(pack: MutationPack): boolean;
}

export function isVertex(val: any): val is IVertex {
  return (
    typeof val === 'object' &&
    val.__proto__.constructor !== Object &&
    typeof val.key === 'string' &&
    typeof val.namespace === 'string'
  );
}

export interface VertexSnapshot {
  data: ReadonlyCoreObject;
  local: ReadonlyCoreObject;
}
