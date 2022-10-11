import { SchemeNamespace } from '../../base/scheme-types';
import { Comparable, CoreValue, Equatable } from '../../core-types';
import { MutationPack } from '../graph/mutations';
import { IVertex } from '../graph/types';
import { IndexBuilder } from './builder';
import { NotifyOnOptions } from './query';
import { Expression } from './query/expression';

export interface IIndexQueryManager {
  addIndex<V extends IVertex = IVertex>(
    name: string,
    namespaces: SchemeNamespace | SchemeNamespace[]
  ): IndexBuilder<V>;
  addCustomIndex(index: IBaseIndex): void;

  getIndex<
    V extends IVertex = IVertex,
    M extends IVertexManager<V> = IVertexManager<V>
  >(
    name: string
  ): IIndex<V, M>;
  getCustomIndex<TIndex extends IBaseIndex = IBaseIndex>(name: string): TIndex;

  removeIndex(name: string): void;
  removeCustomIndex(name: string): void;

  query<
    V extends IVertex = IVertex,
    M extends IVertexManager<V> = IVertexManager<V>
  >(
    expression: Expression<V, M>,
    notifyOps?: NotifyOnOptions<V>
  ): IQuery<V, M>;
  subscribeQuery<
    V extends IVertex = IVertex,
    M extends IVertexManager<V> = IVertexManager<V>
  >(
    query: IQuery<V, M>
  ): void;
  unsubscribeQuery<
    V extends IVertex = IVertex,
    M extends IVertexManager<V> = IVertexManager<V>
  >(
    query: IQuery<V, M>
  ): void;
}

export interface IBaseIndex<V extends IVertex = IVertex> {
  readonly name: string;
  update(value: V, mutPack?: MutationPack): boolean;
}

export interface IVertexManager<V extends IVertex = IVertex>
  extends Comparable,
    Equatable {
  readonly key: string;
  getVertexProxy(): V;
}

export interface IIndex<
  V extends IVertex = IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
> extends IBaseIndex<V> {
  readonly size: number;
  createCursor(
    pattern: string,
    isAsc?: boolean,
    filterFunc?: (value: V) => boolean
  ): ICursor<M>;
  print(pattern: string, isAsc?: boolean): void;
}

export interface ICursor<V extends CoreValue = CoreValue> {
  readonly isAsc: boolean;
  readonly isDone: boolean;
  readonly item: [CoreValue, V] | undefined;
  readonly value: V | undefined;

  move(): void;
  contains(value: V): boolean;
  reset(): void;
  read(): V | undefined;
  readMany(num: number): Generator<V>;
  readAll(): Generator<V>;
  readAllByGroup(
    gFunc: (a: [CoreValue, V], b: [CoreValue, V]) => boolean,
    fFunc?: (group: V[]) => boolean
  ): Generator<V[]>;
  readAllToArray(): V[];
}

export interface IQuery<
  V extends IVertex = IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
> {
  readonly expression?: Expression<V>;
  readonly cursor: ICursor<M>;
  name?: string;

  contains(value: M): boolean;
  shouldNotify(value: V, mutationPack: MutationPack): boolean;
  containsIndex(index: IIndex | string): boolean;

  listen(f: (query: IQuery<V, M>) => void, fireOnStart?: boolean): () => void;
  notify(): void;
  removeAllListeners(): void;
}

export type GetVertexManagerFunc = <
  V extends IVertex = IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
>(
  key: string
) => M;
