import { Record } from '../../base/record.ts';
import { DataType } from '../../base/scheme-types.ts';
import {
  Clonable,
  Comparable,
  Equatable,
  ReadonlyCoreObject,
} from '../../../base/core-types/index.ts';

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

  cloneData(): DataType;
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
