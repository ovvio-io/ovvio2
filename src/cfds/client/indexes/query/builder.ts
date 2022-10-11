import { cursorAnd, cursorOr } from '../cursor/utils';
import { IIndex, IVertexManager } from '../types';
import { IVertex } from '../../graph/types';
import { MultiExpression, Predicate } from './expression';

/**
 * Helps build the query expression for a single Index.
 */
export class QueryIndexBuilder<
  V extends IVertex = IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
> {
  constructor(private readonly index: IIndex<V, M> | string) {}

  /**
   * Index highest level doesn't have a value
   */
  all() {
    return new Predicate<V, M>(this.index, '');
  }

  /**
   * Index equals to pattern value
   */
  eq(pattern: string, filterFunc?: (value: V) => boolean) {
    return new Predicate<V, M>(this.index, pattern, undefined, filterFunc);
  }

  /**
   * A multi expression with "OR" for this same Index
   */
  orAll(values: string[]) {
    const predicates = values.map(v => new Predicate(this.index, v));
    return new MultiExpression<V, M>((c1, c2) => cursorOr(c1, c2), predicates);
  }

  /**
   * A multi expression with "AND" for this same Index
   */
  andAll(values: string[]) {
    const predicates = values.map(v => new Predicate(this.index, v));
    return new MultiExpression<V, M>((c1, c2) => cursorAnd(c1, c2), predicates);
  }
}
