import { coreValueCompare } from '../../../base/core-types/comparable.ts';
import { GraphManager } from './graph-manager.ts';
import {
  EVENT_LOADING_FINISHED,
  EVENT_VERTEX_CHANGED,
  EVENT_VERTEX_DELETED,
  VertexSource,
} from './vertex-source.ts';
import { Vertex } from './vertex.ts';
import { VertexManager } from './vertex-manager.ts';
import { assert, notReached } from '../../../base/error.ts';
import { unionIter } from '../../../base/common.ts';
import { MicroTaskTimer, SimpleTimer, Timer } from '../timer.ts';
import {
  CoroutineQueue,
  CoroutineScheduler,
  SchedulerPriority,
} from '../coroutine.ts';

export type Predicate<IT extends Vertex = Vertex, OT extends IT = IT> =
  | ((vertex: IT) => boolean)
  | ((vertex: IT) => vertex is OT);

export interface SortDescriptor<T extends Vertex = Vertex> {
  (v1: T, v2: T): number;
}

// TODO: Change this to a readonly array (requires updates in a few places)
export type QueryResults<T extends Vertex = Vertex> = VertexManager<T>[];

export const EVENT_QUERY_RESULTS_CHANGED = 'QueryResultsChanged';
export const EVENT_QUERY_DID_CLOSE = 'QueryDidClose';

// const gDirtyQueries = new Set<Query<any>>();
// const gQueryMicrotask = new SimpleTimer(50, false, () => {
//   const copy = new Set(gDirtyQueries);
//   gDirtyQueries.clear();
//   for (const query of copy) {
//     query._notifyQueryChanged();
//   }
// });

const kQueryQueue = new CoroutineQueue(CoroutineScheduler.sharedScheduler());
let gQueryId = 0;

export class Query<
  IT extends Vertex = Vertex,
  OT extends IT = IT
> extends VertexSource {
  private readonly _id: number;
  private readonly _vertexChangedListener: (key: string) => void;
  private readonly _vertexDeletedListener: (key: string) => void;
  private readonly _closeListener: () => void;
  private readonly _resultKeys: Set<string>;
  private readonly _clientsNotifyTimer: Timer;
  private _isOpen: boolean;
  private _isLoading: boolean;
  private _locked: boolean;
  private _cachedSortedResults: QueryResults<OT> | undefined;

  /**
   * A single use async query for the times you only need a one-off and don't
   * care for listening to result updates.
   *
   * @param source The source to query.
   * @param predicate A predicate defining what goes into the results.
   * @param sortDescriptor An optional sort descriptor.
   * @param name An optional query name for debugging and profiling purposes.
   *
   * @returns An array of VertexManager instances.
   */
  static async<IT extends Vertex = Vertex, OT extends IT = IT>(
    source: Query<any, IT> | UnionQuery<any, IT> | GraphManager,
    predicate: Predicate<IT, OT>,
    sortDescriptor?: SortDescriptor<OT>,
    name?: string
  ): Promise<QueryResults<OT>> {
    let resolve: (
      value: QueryResults<OT> | PromiseLike<QueryResults<OT>>
    ) => void;
    const promise = new Promise<QueryResults<OT>>((res) => (resolve = res));
    const query = new this(source, predicate, sortDescriptor, name);
    query.on(EVENT_QUERY_RESULTS_CHANGED, () => {
      if (!query.isLoading) {
        const results = query.results;
        query.close();
        resolve(results);
      }
    });
    return promise;
  }

  /**
   * A blocking query for the times you must absolutely get a response right
   * now.
   *
   * @param source The source to query.
   * @param predicate A predicate defining what goes into the results.
   * @param sortDescriptor An optional sort descriptor.
   *
   * @returns An array of VertexManager instances.
   */
  static blocking<IT extends Vertex = Vertex, OT extends IT = IT>(
    source: Query<any, IT> | UnionQuery<any, IT> | GraphManager,
    predicate: Predicate<IT, OT>,
    sortDescriptor?: SortDescriptor<OT>
  ): QueryResults<OT> {
    const result: VertexManager<OT>[] = [];
    const graph = source instanceof GraphManager ? source : source.graph;
    for (const key of source.keys()) {
      const vert = graph.getVertex<IT>(key);
      if (predicate(vert)) {
        result.push(vert.manager as VertexManager<OT>);
      }
    }
    if (sortDescriptor !== undefined) {
      result.sort((mgr1, mgr2) =>
        sortDescriptor(mgr1.getVertexProxy(), mgr2.getVertexProxy())
      );
    }
    return result;
  }

  /**
   * A blocking query for the times you must absolutely get a response right
   * now. This is similar to the `blocking()` call except it only counts the
   * results rather then actually returning them.
   *
   * @param source The source to query.
   * @param predicate A predicate defining what goes into the results.
   * @param limit An optional max limit for the resulting count.
   *
   * @returns The number of results found.
   */
  static blockingCount<IT extends Vertex = Vertex>(
    source: Query<any, IT> | UnionQuery<any, IT> | GraphManager,
    predicate: Predicate<IT>,
    limit?: number
  ): number {
    let result = 0;
    const graph = source instanceof GraphManager ? source : source.graph;
    for (const key of source.keys()) {
      if (predicate(graph.getVertex(key))) {
        ++result;
        if (limit !== undefined && result >= limit) {
          break;
        }
      }
    }
    return result;
  }

  constructor(
    readonly source: Query<any, IT> | UnionQuery<any, IT> | GraphManager,
    readonly predicate: Predicate<IT, OT>,
    readonly sortDescriptor?: SortDescriptor<OT>,
    readonly name?: string
  ) {
    super();
    this._id = ++gQueryId;
    this._vertexChangedListener = (key) => this.vertexChanged(key);
    this._vertexDeletedListener = (key) => this.vertexDeleted(key);
    this._closeListener = () => this.close();
    this._resultKeys = new Set();
    this._clientsNotifyTimer = new SimpleTimer(50, false, () =>
      this._notifyQueryChanged()
    );
    this._isOpen = true;
    this._isLoading = true;
    this._locked = false;

    if (source instanceof Query || source instanceof UnionQuery) {
      assert(source.isOpen);
      source.once(EVENT_QUERY_DID_CLOSE, this._closeListener);
    }

    if (source.isLoading) {
      source.once(EVENT_LOADING_FINISHED, () =>
        this.attachToSourceAfterLoading()
      );
    } else {
      this.attachToSourceAfterLoading();
    }
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get graph(): GraphManager {
    const src = this.source;
    if (src instanceof GraphManager) {
      return src;
    }
    return src.graph;
  }

  get results(): QueryResults<OT> {
    if (this.isLoading) {
      return [];
    }
    this._buildResultsIfNeeded();
    return this._cachedSortedResults!;
  }

  get count(): number {
    return this._resultKeys.size;
  }

  hasVertex(key: string): boolean {
    return this._resultKeys.has(key);
  }

  keys(): Iterable<string> {
    return this._resultKeys.values();
  }

  close(): void {
    // TODO
    if (this._isOpen) {
      assert(!this._locked);
      this.source.off(EVENT_VERTEX_CHANGED, this._vertexChangedListener);
      this.source.off(EVENT_VERTEX_DELETED, this._vertexDeletedListener);
      this.source.off(EVENT_QUERY_DID_CLOSE, this._closeListener);
      this._isOpen = false;
      this.emit(EVENT_QUERY_DID_CLOSE);
    }
  }

  lock(): Query<IT, OT> {
    this._locked = true;
    return this;
  }

  /*****************************************/
  /******** Private API Starts Here ********/
  /*****************************************/

  private vertexChanged(key: string): void {
    const wasInSourceKeys = this.hasVertex(key);
    if (this.predicate(this.graph.getVertex(key))) {
      this._resultKeys.add(key);
      this.emit(EVENT_VERTEX_CHANGED, key);
    } else if (wasInSourceKeys) {
      this._resultKeys.delete(key);
      this.emit(EVENT_VERTEX_DELETED, key);
    }
    if (!this.isLoading && wasInSourceKeys !== this.hasVertex(key)) {
      this._clientsNotifyTimer.schedule();
    }
  }

  private vertexDeleted(key: string): void {
    if (this.hasVertex(key)) {
      this._resultKeys.delete(key);
      this.emit(EVENT_VERTEX_DELETED, key);
      this._clientsNotifyTimer.schedule();
    }
  }

  protected *loadKeysFromSource(): Generator<void> {
    const startTime = performance.now();
    if (!this.isOpen) {
      console.log(
        `${performance.now()} Query ${this.debugName} cancelled, took ${
          performance.now() - startTime
        }ms. Pending queries: ${kQueryQueue.size}`
      );
      return;
    }
    for (const key of this.source.keys()) {
      if (!this.isOpen) {
        console.log(
          `${performance.now()} Query ${this.debugName} cancelled, took ${
            performance.now() - startTime
          }ms. Pending queries: ${kQueryQueue.size}`
        );
        return;
      }
      this.vertexChanged(key);
      yield;
    }
    this._buildResultsIfNeeded();
    const runningTime = performance.now() - startTime;
    console.log(
      `${performance.now()} Query ${
        this.debugName
      } completed, took ${runningTime}ms and found ${
        this.count
      } results. Pending queries: ${kQueryQueue.size}`
    );
    this._isLoading = false;
    this.emit(EVENT_LOADING_FINISHED);
    this._clientsNotifyTimer.schedule();
  }

  private _buildResultsIfNeeded(): void {
    if (this._cachedSortedResults === undefined) {
      const results: VertexManager<OT>[] = [];
      const graph = this.graph;
      for (const key of this.keys()) {
        results.push(graph.getVertexManager(key));
      }
      const sortDesc = this.sortDescriptor;
      results.sort((a, b) => {
        const ret = sortDesc
          ? sortDesc(a.getVertexProxy(), b.getVertexProxy())
          : 0;
        return ret === 0 ? coreValueCompare(a.key, b.key) : ret;
      });
      this._cachedSortedResults = results;
    }
  }

  private get debugName(): string {
    let res = String(this._id);
    if (this.name !== undefined) {
      res += '/' + this.name;
    }
    return res;
  }

  private attachToSourceAfterLoading(): void {
    const source = this.source;
    assert(!source.isLoading);
    // At the time of this writing, we're still testing different execution
    // strategies. Currently executing all queries concurrently results in a
    // more responsive UI with less re-rendering than executing queries
    // serially. That being said, when there are a high number of query
    // cancellations, a serial execution will result in a smoother user
    // experience. This was the case in one of the first iterations on the new
    // filters bar on April, 2022.
    //
    // Using kQueryQueue as the scheduler will enforce a serial execution.
    const scheduler = CoroutineScheduler.sharedScheduler(); // kQueryQueue;
    source.on(EVENT_VERTEX_CHANGED, this._vertexChangedListener);
    source.on(EVENT_VERTEX_DELETED, this._vertexDeletedListener);
    scheduler.schedule(
      this.loadKeysFromSource(),
      SchedulerPriority.Normal,
      `Query/${this.name}`
    );
  }

  _notifyQueryChanged(): void {
    if (!this.isOpen || this.isLoading) {
      return;
    }
    this._cachedSortedResults = undefined;
    this.emit(EVENT_QUERY_RESULTS_CHANGED);
  }
}

export class UnionQuery<
  IT extends Vertex = Vertex,
  OT extends IT = IT
> extends VertexSource {
  private readonly _changeListeners: Map<Query<IT, OT>, (key: string) => void>;
  private readonly _closeListener: () => void;
  private _isLoading: boolean;
  private _isOpen: boolean;

  constructor(
    readonly sources: Iterable<Query<IT, OT>>,
    readonly name?: string
  ) {
    super();
    this._changeListeners = new Map();
    this._closeListener = () => this.close();
    let loadingCount = 0;
    for (const src of sources) {
      if (src.isLoading) {
        ++loadingCount;
        // eslint-disable-next-line no-loop-func
        src.once(EVENT_LOADING_FINISHED, () => {
          if (!this.isOpen) {
            return;
          }
          assert(!src.isLoading);
          src.on(EVENT_VERTEX_CHANGED, this.changeListenerForQuery(src));
          src.on(EVENT_VERTEX_DELETED, this.changeListenerForQuery(src));
          src.once(EVENT_QUERY_DID_CLOSE, this._closeListener);
          assert(loadingCount > 0);
          if (--loadingCount === 0) {
            this._isLoading = false;
            this.emit(EVENT_LOADING_FINISHED);
          }
        });
      } else {
        src.on(EVENT_VERTEX_CHANGED, this.changeListenerForQuery(src));
        src.on(EVENT_VERTEX_DELETED, this.changeListenerForQuery(src));
        src.once(EVENT_QUERY_DID_CLOSE, this._closeListener);
      }
    }
    this._isLoading = loadingCount > 0;
    this._isOpen = true;
  }

  // eslint-disable-next-line getter-return
  get graph(): GraphManager {
    for (const q of this.queries()) {
      return q.graph;
    }
    notReached('UnionQuery has no underlying queries');
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  queries(): Iterable<Query<IT, OT>> {
    return this._changeListeners.keys();
  }

  *keys(): Generator<string> {
    const processedKeys = new Set<string>();
    for (const key of unionIter(
      ...Array.from(this.queries()).map((q) => q.keys())
    )) {
      if (!processedKeys.has(key)) {
        processedKeys.add(key);
        yield key;
      }
    }
  }

  hasVertex(key: string): boolean {
    for (const q of this.queries()) {
      if (q.hasVertex(key)) {
        return true;
      }
    }
    return false;
  }

  close() {
    if (this._isOpen) {
      this._isOpen = false;
      for (const q of this.queries()) {
        q.off(EVENT_VERTEX_CHANGED, this.changeListenerForQuery(q));
        q.off(EVENT_VERTEX_DELETED, this.changeListenerForQuery(q));
        q.off(EVENT_QUERY_DID_CLOSE, this._closeListener);
      }
      this.emit(EVENT_QUERY_DID_CLOSE);
    }
  }

  private changeListenerForQuery(src: Query<IT, OT>): (key: string) => void {
    let result = this._changeListeners.get(src);
    if (result === undefined) {
      result = (key) => {
        this.emit(
          this.hasVertex(key) ? EVENT_VERTEX_CHANGED : EVENT_VERTEX_DELETED,
          key
        );
      };
      this._changeListeners.set(src, result);
    }
    return result;
  }
}
