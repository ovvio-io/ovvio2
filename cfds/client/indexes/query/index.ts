import { Listenable, Listener } from '../../../base/listenable';
import { MutationPack, mutationPackIter } from '../../graph/mutations';
import { EmptyCursor } from '../cursor/empty';
import { cursorAnd, cursorOr, cursorSub } from '../cursor/utils';
import {
  ICursor,
  IIndex,
  IIndexQueryManager,
  IQuery,
  IVertexManager,
} from '../types';
import { QueryIndexBuilder } from './builder';
import { Expression, MultiExpression } from './expression';
import { IVertex } from '../../graph/types';
import { SchemeNamespace } from '../../../base/scheme-types';

/**
 * Start a indexName expression part.
 */
export function index<
  V extends IVertex = IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
>(indexOrName: IIndex<V, M> | string) {
  return new QueryIndexBuilder<V, M>(indexOrName);
}

/**
 * "AND" expression part.
 */
export function and<
  V extends IVertex = IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
>(...expressions: (Expression<V, M> | 0)[]) {
  return new MultiExpression<V, M>((c1, c2) => cursorAnd(c1, c2), expressions);
}

/**
 * Subtraction: expressionLeft - expressionRight.
 */
export function sub<
  V extends IVertex = IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
>(expressionLeft: Expression<V, M>, expressionRight: Expression<V, M>) {
  return new MultiExpression<V, M>(
    (c1, c2) => cursorSub(c1, c2),
    [expressionLeft, expressionRight]
  );
}

/**
 * "OR" expression part.
 */
export function or<
  V extends IVertex = IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
>(...expressions: (Expression<V, M> | 0)[]) {
  return new MultiExpression<V, M>((c1, c2) => cursorOr(c1, c2), expressions);
}

/**
 * Representing a single query.
 */

export interface NotifyOnOptions<V extends IVertex = IVertex> {
  namespace?: SchemeNamespace | SchemeNamespace[];
  fields?: (keyof V & string)[];
}

export class Query<
    V extends IVertex = IVertex,
    M extends IVertexManager<V> = IVertexManager<V>
  >
  extends Listenable<IQuery<V, M>>
  implements IQuery<V, M>
{
  private _manager: IIndexQueryManager;
  private _expression: Expression<V, M> | undefined;
  private _cursor: ICursor<M>;
  public name?: string;
  private _indexes?: Set<string>;

  private _notifyNamespaces?: string[];
  private _notifyOnFields?: Set<string>;

  constructor(
    manager: IIndexQueryManager,
    expression: Expression<V, M> | undefined,
    cursor: ICursor<M>,
    notifyOpts?: NotifyOnOptions<V>
  ) {
    super();
    this._manager = manager;
    this._expression = expression;
    this._cursor = cursor;
    this._cursor.reset();

    if (notifyOpts) {
      if (notifyOpts.fields && notifyOpts.fields.length > 0) {
        this._notifyOnFields = new Set<string>(notifyOpts.fields);
      }
      if (notifyOpts.namespace) {
        if (typeof notifyOpts.namespace === 'string') {
          this._notifyNamespaces = [notifyOpts.namespace];
        } else {
          this._notifyNamespaces = notifyOpts.namespace;
        }
      }
    }
  }

  shouldNotify(value: V, mutationPack: MutationPack): boolean {
    if (this._notifyNamespaces) {
      if (!this._notifyNamespaces.includes(value.namespace)) {
        return false;
      }
    }
    if (this._notifyOnFields) {
      for (const [field] of mutationPackIter(mutationPack)) {
        if (this._notifyOnFields.has(field)) {
          return true;
        }
      }
    }
    return false;
  }

  containsIndex(index: IIndex | string) {
    const name = typeof index === 'string' ? index : index.name;
    if (this._indexes === undefined) {
      this._indexes = new Set<string>();
      if (this._expression) {
        for (const iName of this._expression.getIndexes()) {
          this._indexes.add(iName);
        }
      }
    }
    return this._indexes.has(name);
  }

  get expression() {
    return this._expression;
  }

  get cursor() {
    return this._cursor;
  }

  contains(value: M): boolean {
    return this._cursor.contains(value);
  }

  protected beforeFirstListener(): void {
    this._manager.subscribeQuery(this);
  }

  protected triggerListener(listener: Listener<Query<V, M>>): void {
    this._cursor.reset();
    listener(this);
  }

  protected afterLastListener(): void {
    this._manager.unsubscribeQuery(this);
  }
}

/**
 * Builds the Query class
 */
export function buildQuery<
  V extends IVertex = IVertex,
  M extends IVertexManager<V> = IVertexManager<V>
>(
  manager: IIndexQueryManager,
  expression?: Expression<V, M>,
  notifyOps?: NotifyOnOptions<V>
) {
  let cursor: ICursor<M>;
  if (!expression) {
    cursor = new EmptyCursor<M>();
  } else {
    cursor = expression.createCursor(manager);
  }

  return new Query<V, M>(manager, expression, cursor, notifyOps);
}
