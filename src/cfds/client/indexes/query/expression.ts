import { EmptyCursor } from '../cursor/empty';
import { ICursor, IIndex, IIndexQueryManager, IVertexManager } from '../types';
import { IVertex } from '../../graph/types';

/**
 * Expression interface.
 * Used for base method + instanceof checks
 */
export interface Expression<
  V extends IVertex = IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
> {
  createCursor(manager: IIndexQueryManager): ICursor<M>;
  getIndexes(): Generator<string>;
  usingFilter(): boolean;
}

/**
 * A single index/value equal expression
 */
export class Predicate<
  V extends IVertex = IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
> implements Expression<V, M>
{
  private _index: IIndex<V, M> | string;
  private _pattern: string;
  private _filterFunc?: (value: V) => boolean;
  private _isAsc?: boolean;

  constructor(
    index: IIndex<V, M> | string,
    pattern: string,
    isAsc?: boolean,
    filterFunc?: (value: V) => boolean
  ) {
    this._index = index;
    this._pattern = pattern;
    this._isAsc = isAsc;
    this._filterFunc = filterFunc;
  }

  usingFilter(): boolean {
    return this._filterFunc !== undefined;
  }

  *getIndexes(): Generator<string> {
    const indexName =
      typeof this._index === 'string' ? this._index : this._index.name;
    yield indexName;
  }

  createCursor(manager: IIndexQueryManager): ICursor<M> {
    const index =
      typeof this._index === 'string'
        ? manager.getIndex<V, M>(this._index)
        : this._index;

    const cursor = index.createCursor(
      this._pattern,
      this._isAsc,
      this._filterFunc
    );
    return cursor;
  }
}

/**
 * Combining multiple expressions with "AND" / "OR"
 */
export class MultiExpression<
  V extends IVertex = IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
> implements Expression<V, M>
{
  private _multiFunc: (c1: ICursor<M>, c2: ICursor<M>) => ICursor<M>;
  private _expressions: Iterable<Expression<V, M> | 0>;

  constructor(
    multiFunc: (c1: ICursor<M>, c2: ICursor<M>) => ICursor<M>,
    expressions: Iterable<Expression<V, M> | 0>
  ) {
    this._multiFunc = multiFunc;
    this._expressions = expressions;
  }

  usingFilter(): boolean {
    for (const exp of this._expressions) {
      if (!exp) continue;
      if (exp.usingFilter()) {
        return true;
      }
    }
    return false;
  }

  *getIndexes(): Generator<string> {
    for (const exp of this._expressions) {
      if (!exp) continue;
      for (const index of exp.getIndexes()) {
        yield index;
      }
    }
  }

  createCursor(manager: IIndexQueryManager): ICursor<M> {
    let res: ICursor<M> | undefined;

    for (const exp of this._expressions) {
      if (!exp) continue;
      const cursor = exp.createCursor(manager);
      if (res === undefined) {
        res = cursor;
      } else {
        res = this._multiFunc(res, cursor);
      }
    }

    return res || new EmptyCursor<M>();
  }
}
