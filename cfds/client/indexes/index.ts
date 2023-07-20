import {
  MutationPack,
  mutationPackIsEmpty,
  mutationPackIter,
} from '../graph/mutations';
import { GetVertexManagerFunc, ICursor, IIndex, IVertexManager } from './types';
import { isVertex, IVertex } from '../graph/types';
import { IndexTree } from './tree/base';
import { createDefaultIndexTree } from './tree';
import { IterableCursor } from './cursor/iterable';
import {
  CompareOptions,
  coreValueCompare,
  MaxComparableValue,
} from '../../core-types/comparable';
import {
  CoreArray,
  CoreValue,
  coreValueClone,
  coreValueEquals,
  ReadonlyCoreArray,
} from '../../core-types';
import { Logger } from '@ovvio/base';
import Severity from '@ovvio/base/lib/logger/severity';

const WINDOW_DEBUG_TRACE = '__index_trace';

export interface IndexOptions {
  name: string;
  namespaces: string | string[];
  fieldName: string;
  isAsc?: boolean;
}

const compareOptions: CompareOptions = {
  extendFunc: (v1, v2) => {
    const v1Vertex = isVertex(v1);
    const v2Vertex = isVertex(v2);
    if (v1Vertex && v2Vertex) {
      //@ts-ignore
      return coreValueCompare(v1.key, v2.key);
    }
    if (v1Vertex && typeof v2 === 'string') {
      //@ts-ignore
      return coreValueCompare(v1.key, v2);
    }
    if (typeof v1 === 'string' && v2Vertex) {
      //@ts-ignore
      return coreValueCompare(v1, v2.key);
    }
  },
};

export class Index<
  V extends IVertex = IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
> implements IIndex<V, M>
{
  private _tree: IndexTree<ReadonlyCoreArray, string>;
  private _reverseMap: Map<string, ReadonlyCoreArray[]>;

  private _namespaces: string[];
  private _isAsc: boolean;
  private _size: number = 0;
  private _vertexMngFunc: GetVertexManagerFunc;

  readonly name: string;
  readonly fieldName: string;

  constructor(options: IndexOptions, vertexMngFunc: GetVertexManagerFunc) {
    this.name = options.name;
    this.fieldName = options.fieldName;
    this._namespaces =
      typeof options.namespaces === 'string'
        ? [options.namespaces]
        : options.namespaces;
    this._tree = createDefaultIndexTree<ReadonlyCoreArray, string>((a, b) =>
      coreValueCompare(a, b, compareOptions)
    );
    this._reverseMap = new Map<string, ReadonlyCoreArray[]>();
    this._isAsc = options.isAsc !== undefined ? options.isAsc : true;
    this._vertexMngFunc = vertexMngFunc;
  }

  print(pattern: string, isAsc?: boolean): void {
    const [minKey, maxKey] = this.getMinMaxKeys(pattern);
    console.log(`Index: ${this.name} print starting`);
    for (const [key, vertexKey] of this._tree.range(minKey, maxKey, isAsc)) {
      console.log(`Index Item: ${key} : ${vertexKey}`);
    }
    console.log(`Index: ${this.name} print done`);
  }

  get size(): number {
    return this._size;
  }

  search(pattern: string, isAsc?: boolean): Generator<[CoreValue, M]> {
    const [minKey, maxKey] = this.getMinMaxKeys(pattern);
    return this.runSearch(minKey, maxKey, isAsc);
  }

  createCursor(
    pattern: string,
    isAsc?: boolean,
    filterFunc?: (value: V) => boolean
  ): ICursor<M> {
    const [minKey, maxKey] = this.getMinMaxKeys(pattern);

    const getIterable = () => this.runSearch(minKey, maxKey, isAsc);
    const containsFunc = (value: M) => {
      const treeKeys = this._reverseMap.get(value.key);
      if (treeKeys && treeKeys.length > 0) {
        if (minKey === undefined && maxKey === undefined) {
          return true;
        }
        for (const treeKey of treeKeys) {
          if (
            (minKey === undefined ||
              this._tree.comparator(minKey, treeKey) <= 0) &&
            (maxKey === undefined ||
              this._tree.comparator(maxKey, treeKey) >= 0)
          ) {
            return true;
          }
        }
      }
      return false;
    };

    const lInternalFunc = filterFunc
      ? (value: M) => {
          const vertex = value.getVertexProxy();
          return filterFunc(vertex);
        }
      : undefined;

    const cursor = new IterableCursor<M>(
      getIterable,
      containsFunc,
      this._isAsc,
      lInternalFunc
    );
    return cursor;
  }

  update(value: V, mutPack?: MutationPack): boolean {
    if (!this._namespaces.includes(value.namespace)) return false;

    if (!mutationPackIsEmpty(mutPack)) {
      let fieldChanged = false;
      for (const [field] of mutationPackIter(mutPack)) {
        if (this.fieldName === field) {
          fieldChanged = true;
          break;
        }
      }
      if (!fieldChanged) {
        return false; //Key Mutation not found
      }
    }

    const oldKeyValue = this._reverseMap.get(value.key);

    const newKeyValue = value.getCompositeValue<
      ReadonlyCoreArray[] | undefined
    >(this.fieldName);

    if (coreValueEquals(oldKeyValue, newKeyValue)) {
      return false; //Nothing to change
    }

    if (oldKeyValue) {
      for (const oldKey of oldKeyValue) {
        this._tree.remove(oldKey);
      }
      this._size--;
    }

    if (newKeyValue) {
      for (const newKey of newKeyValue) {
        this._tree.insert(newKey, value.key);
      }
      this._reverseMap.set(value.key, newKeyValue);
      this._size++;
    } else {
      this._reverseMap.delete(value.key);
    }

    this.traceLog(`updated by ${value.key}`);

    return true;
  }

  private *runSearch(
    minKey: ReadonlyCoreArray | undefined,
    maxKey: ReadonlyCoreArray | undefined,
    isAsc?: boolean
  ): Generator<[CoreValue, M]> {
    const rangeAsc = isAsc !== undefined ? isAsc : this._isAsc;
    for (const [key, vertexKey] of this._tree.range(minKey, maxKey, rangeAsc)) {
      yield [key[key.length - 1], this._vertexMngFunc<V, M>(vertexKey)];
    }
  }

  private getMinMaxKeys(
    pattern: string
  ): [CoreArray | undefined, CoreArray | undefined] {
    const pPattern = this.processPattern(pattern);

    let minKey: CoreArray | undefined;
    let maxKey: CoreArray | undefined;

    if (pPattern !== undefined) {
      minKey = pPattern;
      maxKey = coreValueClone(pPattern);
      maxKey.push(MaxComparableValue);
    }

    return [minKey, maxKey];
  }

  private processPattern(pattern: string) {
    const patternParts: CoreArray = [];
    let i = 0;
    for (const part of pattern.split('/')) {
      if (part !== '') {
        patternParts[i] = part;
        i++;
      }
    }

    return patternParts.length === 0 ? undefined : patternParts;
  }

  private traceLog(message: string, extra?: any) {
    if (Logger.isEnabled(Severity.DEBUG) && window !== undefined) {
      const traceVal: boolean | undefined = (window as any)[WINDOW_DEBUG_TRACE];

      if (traceVal === undefined || traceVal === null) return false;

      if (typeof traceVal === 'boolean') {
        if (traceVal) Logger.debug(`Index "${this.name}": ${message}`, extra);
        return;
      }
    }
  }
}
