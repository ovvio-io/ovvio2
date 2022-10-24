import {
  index,
  and,
  sub,
  or,
  NotifyOnOptions,
} from '@ovvio/cfds/lib/client/indexes/query';
import { Index } from './indexes/base-index';
import { IndexQueryManager } from '@ovvio/cfds/lib/client/indexes/manager';
import { QueryIndexBuilder } from '@ovvio/cfds/lib/client/indexes/query/builder';
import { Expression } from '@ovvio/cfds/lib/client/indexes/query/expression';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Vertex } from '@ovvio/cfds/lib/client/graph/vertex';

export interface QueryResult<V extends Vertex> {
  vertexManagers: VertexManager<V>[];
}
export interface QueryHandle {
  listen?: () => void;
  close(): void;
}

export { IndexQueryManager };

export abstract class BaseQueryProvider<TParameters, TResult> {
  private _queryHandle: QueryHandle;
  private _listeners: ((res: TResult) => void)[];
  protected _manager?: IndexQueryManager;
  private _params: TParameters | null;
  private _lastValue: TResult | null;

  constructor() {
    this._listeners = [];
  }

  abstract buildQuery(params: TParameters): QueryHandle;

  protected resultEquals(prevResult: TResult | null, newResult: TResult) {
    return prevResult === newResult;
  }

  protected notifyChange(result: TResult): void {
    if (this.resultEquals(this._lastValue, result)) {
      return;
    }
    this._lastValue = result;
    this._listeners.forEach(fn => fn(result));
  }

  listen(onData: (res: TResult) => void) {
    if (this._listeners.length === 0) {
      if (this._queryHandle && this._queryHandle.listen) {
        this._queryHandle.listen();
      }
    }
    this._listeners.push(onData);
    return () => {
      this._listeners.splice(this._listeners.indexOf(onData), 1);
    };
  }

  run(manager: IndexQueryManager, params: TParameters) {
    if (
      manager !== this._manager ||
      this.didParamsChange(this._params, params)
    ) {
      if (this._queryHandle) {
        this._queryHandle.close();
      }

      this._params = params;
      this._manager = manager;

      this._queryHandle = this.buildQuery(params);
      if (this._listeners.length > 0) {
        if (this._queryHandle && this._queryHandle.listen) {
          this._queryHandle.listen();
        }
      }
    }
  }

  close() {
    if (this._queryHandle) this._queryHandle.close();
  }

  private areEqual<T>(a: T, b: T): boolean {
    if (!a && !b) {
      return true;
    }
    if ((a && !b) || (!b && a)) {
      return false;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      return a.every(x => b.some(y => this.areEqual(x, y)));
    }
    return a === b;
  }

  protected didParamsChange(
    prevPrams: TParameters,
    newParams: TParameters
  ): boolean {
    const prevKeys = Object.keys(prevPrams);
    const newKeys = Object.keys(newParams);
    if (prevKeys.length !== newKeys.length) {
      return true;
    }
    for (let i = 0; i < prevKeys.length; ++i) {
      const key = prevKeys[i];
      if (!this.areEqual(prevPrams[key], newParams[key])) {
        return true;
      }
    }

    return false;
  }

  query<V extends Vertex>(
    expression: Expression<V, VertexManager<V>>,
    notifyOps?: NotifyOnOptions<V>
  ) {
    const manager = this._manager!;
    return manager.query<V, VertexManager<V>>(expression, notifyOps);
  }

  protected index<V extends Vertex>(
    i: Index<V>
  ): QueryIndexBuilder<V, VertexManager<V>> {
    return index(i.name);
  }

  protected and<V extends Vertex>(
    ...expressions: Expression<V, VertexManager<V>>[]
  ) {
    return and(...expressions);
  }

  protected sub<V extends Vertex>(
    left: Expression<V, VertexManager<V>>,
    right: Expression<V, VertexManager<V>>
  ) {
    return sub(left, right);
  }

  protected or<V extends Vertex>(
    ...expressions: Expression<V, VertexManager<V>>[]
  ): Expression<V, VertexManager<V>> {
    return or(...expressions);
  }
}

export abstract class QueryProvider<
  TParameters,
  TResult extends Vertex
> extends BaseQueryProvider<TParameters, QueryResult<TResult>> {}

export class EmptyParameters {
  private static EMPTY_PARAMETERS = new EmptyParameters();
  static empty(): EmptyParameters {
    return EmptyParameters.EMPTY_PARAMETERS;
  }
}

export abstract class PureQueryProvider<
  TResult extends Vertex
> extends QueryProvider<{}, TResult> {
  protected didParamsChange(prevPrams: {}, newParams: {}): boolean {
    return false;
  }

  static EmptyParameters(): {} {
    return {};
  }
}
