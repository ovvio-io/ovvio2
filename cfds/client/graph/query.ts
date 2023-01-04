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
import { mapIterable, unionIter } from '../../../base/common.ts';
import { SimpleTimer, Timer } from '../../../base/timer.ts';
import {
  CancellablePromise,
  CoroutineQueue,
  CoroutineScheduler,
  SchedulerPriority,
} from '../../../base/coroutine.ts';
import { GlobalLogger } from '../../../logging/log.ts';
import { MutationPack } from './mutations.ts';
import { Dictionary } from '../../../base/collections/dict.ts';

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

// const kQueryQueue = new CoroutineQueue(CoroutineScheduler.sharedScheduler());
let gQueryId = 0;

export type GroupId = string | undefined;

/**
 * A function responsible for mapping a query result (vertex) to one or more
 * groups.
 */
export type GroupByFunction<T extends Vertex = Vertex> = (
  v: T
) => GroupId | GroupId[];

export interface QueryOptions<OT extends Vertex> {
  name?: string;
  deps?: Query[];
  groupBy?: GroupByFunction<OT>;
}

export type SourceType<IT extends Vertex> =
  | Query<Vertex, IT>
  | UnionQuery<Vertex, IT>
  | GraphManager;
export type SourceProducer<IT extends Vertex> = () => SourceType<IT>;

/**
 * Queries are implemented as linear search over an abstract list of vertices
 * called a source. Queries implemented as Coroutines to allow both multiplexing
 * their execution and to pause the search when it's taking too much time.
 *
 * Queries themselves act as sources for other queries, enabling efficient
 * chaining. Thus, we're treating queries both as end queries from the UI, and
 * as intermediate "indexes" that are opened once the app boots, and are kept
 * open during the entire execution.
 *
 * Whenever a vertex changes, all root queries get notified. If the vertex falls
 * in the result set of a query, it'll pass the update down to all chained
 * queries. If not, the rest of the chian won't be notified. This allows us to
 * control the way updates propagate throughout the app.
 *
 * Queries may have other queries as dependencies. Whenever a dependency's
 * result set changes, the query will re-scan its source (refreshing it if
 * needed), and update the results accordingly.
 */
export class Query<
  IT extends Vertex = Vertex,
  OT extends IT = IT
> extends VertexSource {
  logger = GlobalLogger;
  private readonly _id: number;
  private readonly _vertexChangedListener: (
    key: string,
    pack: MutationPack
  ) => void;
  private readonly _vertexDeletedListener: (
    key: string,
    pack: MutationPack
  ) => void;
  private readonly _closeListener: () => void;
  private readonly _resultKeys: Set<string>;
  private readonly _groupedResultKeys?: Map<GroupId, Set<string>>;
  private readonly _clientsNotifyTimer: Timer;
  private readonly _name?: string;
  private readonly _deps?: Query[];
  private readonly _depsListener?: () => void;
  private readonly _sourceProducer?: SourceProducer<IT>;
  private readonly _groupByFunc?: GroupByFunction<OT>;
  private _source: SourceType<IT>;
  private _isOpen: boolean;
  private _isLoading: boolean;
  private _locked: boolean;
  private _cachedSortedResults: QueryResults<OT> | undefined;
  private _cachedSortedGroups: Map<GroupId, QueryResults<OT>> | undefined;
  private _scanSourcePromise: CancellablePromise<void> | undefined;
  private _scanResultsPromise: CancellablePromise<void> | undefined;

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
    sourceOrProducer: SourceType<IT> | SourceProducer<IT>,
    readonly predicate: Predicate<IT, OT>,
    readonly sortDescriptor?: SortDescriptor<OT>,
    nameOrOpts?: string | QueryOptions<OT>
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

    if (typeof nameOrOpts === 'string') {
      this._name = nameOrOpts;
    } else if (typeof nameOrOpts !== 'undefined') {
      if (nameOrOpts.name) {
        this._name = nameOrOpts.name;
      }
      if (nameOrOpts.deps) {
        this._deps = nameOrOpts.deps;
        if (this._deps) {
          this._depsListener = () => this.onDependencyChanged();
          for (const d of this._deps) {
            d.on(EVENT_QUERY_RESULTS_CHANGED, this._depsListener);
            d.once(EVENT_QUERY_DID_CLOSE, this._closeListener);
          }
        }
      }
      if (nameOrOpts.groupBy) {
        this._groupByFunc = nameOrOpts.groupBy;
        this._groupedResultKeys = new Map();
      }
    }

    if (typeof sourceOrProducer === 'function') {
      this._sourceProducer = sourceOrProducer;
      this._source = this._sourceProducer();
    } else {
      this._source = sourceOrProducer;
    }
    this.attachToSource();
  }

  get source(): SourceType<IT> {
    return this._source;
  }

  get name(): string | undefined {
    return this._name;
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
    this._buildResultsIfNeeded();
    return this._cachedSortedResults!;
  }

  get groups(): Dictionary<GroupId, QueryResults<OT>> {
    this._buildResultsIfNeeded();
    return this._cachedSortedGroups || new Map([[undefined, this.results]]);
  }

  get count(): number {
    return this._resultKeys.size;
  }

  get scheduler(): CoroutineScheduler {
    // At the time of this writing, we're still testing different execution
    // strategies. Currently executing all queries concurrently results in a
    // more responsive UI with less re-rendering than executing queries
    // serially. That being said, when there are a high number of query
    // cancellations, serial execution will result in a smoother user
    // experience. This was the case in one of the first iterations on the new
    // filters bar on April, 2022.
    //
    // Using kQueryQueue as the scheduler will enforce a serial execution.
    return CoroutineScheduler.sharedScheduler(); // kQueryQueue;
  }

  onResultsChanged(handler: () => void): () => void {
    this.on(EVENT_QUERY_RESULTS_CHANGED, handler);
    return () => {
      this.off(EVENT_QUERY_RESULTS_CHANGED, handler);
    };
  }

  hasVertex(key: string | Vertex | VertexManager): boolean {
    if (typeof key !== 'string') {
      key = key.key;
    }
    return this._resultKeys.has(key);
  }

  keys(): Iterable<string> {
    return this._resultKeys.values();
  }

  groupCount(): number {
    return this._groupedResultKeys?.size || 0;
  }

  group(name: GroupId): QueryResults<OT> {
    this._buildResultsIfNeeded();
    return this._cachedSortedGroups?.get(name) || [];
  }

  private detachFromSource(): void {
    this.source.off(EVENT_VERTEX_CHANGED, this._vertexChangedListener);
    this.source.off(EVENT_VERTEX_DELETED, this._vertexDeletedListener);
    this.source.off(EVENT_QUERY_DID_CLOSE, this._closeListener);
  }

  private attachToSource(): void {
    const source = this._source;
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

  close(): void {
    // TODO
    if (this._isOpen) {
      assert(!this._locked);
      this.detachFromSource();
      if (this._depsListener && this._deps) {
        for (const d of this._deps) {
          d.off(EVENT_QUERY_RESULTS_CHANGED, this._depsListener);
          d.off(EVENT_QUERY_DID_CLOSE, this._closeListener);
        }
      }
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

  private existingGroupIdsForKey(key: string): GroupId[] {
    const groupedResultKeys = this._groupedResultKeys;
    if (!groupedResultKeys) {
      return [undefined];
    }
    const result = [];
    for (const [groupId, keySet] of groupedResultKeys) {
      if (keySet.has(key)) {
        result.push(groupId);
      }
    }
    return result;
  }

  private vertexChanged(key: string, pack: MutationPack): void {
    const wasInSourceKeys = this.hasVertex(key);
    const prevGroupIds = this.existingGroupIdsForKey(key);
    const vertex = this.graph.getVertex<OT>(key);
    const newGroupIds = this.groupIdsForVertex(key);
    for (const groupId of prevGroupIds) {
      const prevSet = this._groupedResultKeys!.get(groupId);
      if (!prevSet) {
        continue;
      }
      if (prevSet?.size === 1) {
        assert(prevSet.has(key));
        this._groupedResultKeys!.delete(groupId);
      } else {
        prevSet?.delete(key);
      }
    }
    if (this.predicate(vertex)) {
      this._resultKeys.add(key);
      for (const groupId of newGroupIds) {
        let set = this._groupedResultKeys!.get(groupId);
        if (!set) {
          set = new Set();
          this._groupedResultKeys!.set(groupId, set);
        }
        set.add(key);
      }
      this.emit(EVENT_VERTEX_CHANGED, key, pack);
    } else if (wasInSourceKeys) {
      this._resultKeys.delete(key);
      this.emit(EVENT_VERTEX_DELETED, key, pack);
    }
    if (!this.isLoading && wasInSourceKeys !== this.hasVertex(key)) {
      this._clientsNotifyTimer.schedule();
    }
  }

  private vertexDeleted(key: string, pack: MutationPack): void {
    if (this.hasVertex(key)) {
      this._resultKeys.delete(key);
      this.emit(EVENT_VERTEX_DELETED, key, pack);
      this._clientsNotifyTimer.schedule();
    }
  }

  protected *loadKeysFromSource(): Generator<void> {
    const startTime = performance.now();
    if (!this.isOpen) {
      this.logger.log({
        severity: 'INFO',
        name: 'QueryCancelled',
        value: performance.now() - startTime,
        unit: 'Milliseconds',
        queryName: this.debugName,
      });
      return;
    }
    for (const key of this.source.keys()) {
      if (!this.isOpen) {
        this.logger.log({
          severity: 'INFO',
          name: 'QueryCancelled',
          value: performance.now() - startTime,
          unit: 'Milliseconds',
          queryName: this.debugName,
        });
        return;
      }
      this.vertexChanged(key);
      yield;
    }
    this._buildResultsIfNeeded();
    const runningTime = performance.now() - startTime;
    this.logger.log({
      severity: 'INFO',
      name: 'QueryCompleted',
      value: runningTime,
      unit: 'Milliseconds',
      queryName: this.debugName,
      itemCount: this.count,
    });
    // When any of our dependencies change, we're forced to do a full scan all
    // over again. In this case, however, we don't emit the loading event.
    if (this._isLoading) {
      this._isLoading = false;
      this.emit(EVENT_LOADING_FINISHED);
      this._clientsNotifyTimer.schedule();
    }
  }

  private compareManagers(a: VertexManager<OT>, b: VertexManager<OT>): number {
    const sortDesc = this.sortDescriptor;
    const ret = sortDesc ? sortDesc(a.getVertexProxy(), b.getVertexProxy()) : 0;
    return ret === 0 ? coreValueCompare(a.key, b.key) : ret;
  }

  private _buildResultsIfNeeded(): void {
    if (this._cachedSortedResults === undefined) {
      const results: VertexManager<OT>[] = [];
      const graph = this.graph;
      for (const key of this.keys()) {
        results.push(graph.getVertexManager(key));
      }
      const sortDesc = this.sortDescriptor
        ? this.compareManagers.bind(this)
        : undefined;
      if (sortDesc) {
        results.sort(sortDesc);
      }
      this._cachedSortedResults = results;
      this._cachedSortedGroups = undefined;
      if (this._groupedResultKeys) {
        const sortedGroups = new Map<GroupId, QueryResults<OT>>();
        for (const [groupKey, keys] of this._groupedResultKeys) {
          const arr = Array.from(
            mapIterable(keys, (k) => graph.getVertexManager<OT>(k))
          );
          if (sortDesc) {
            arr.sort(sortDesc);
          }
          sortedGroups.set(groupKey, arr);
        }
        this._cachedSortedGroups = sortedGroups;
      }
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
    source.on(EVENT_VERTEX_CHANGED, this._vertexChangedListener);
    source.on(EVENT_VERTEX_DELETED, this._vertexDeletedListener);
    this.scheduleSourceScan();
  }

  private scheduleSourceScan(): void {
    if (this._scanSourcePromise) {
      this._scanSourcePromise.cancel();
    }
    const promise = this.scheduler.schedule(
      this.loadKeysFromSource(),
      SchedulerPriority.Normal,
      `Query.SourceScan/${this.name}`
    );
    promise.finally(() => {
      if (this._scanResultsPromise === promise) {
        this._scanResultsPromise = undefined;
      }
    });
    this._scanResultsPromise = promise;
  }

  _notifyQueryChanged(): void {
    if (!this.isOpen || this.isLoading) {
      return;
    }
    this._cachedSortedResults = undefined;
    this._cachedSortedGroups = undefined;
    this.emit(EVENT_QUERY_RESULTS_CHANGED);
    this.logger.log({
      severity: 'INFO',
      name: 'QueryFired',
      queryName: this.name,
      value: 1,
      unit: 'Count',
    });
  }

  private onDependencyChanged(): void {
    // Cancel any previous re-scan
    if (this._scanResultsPromise) {
      this._scanResultsPromise.cancel();
    }
    if (this._sourceProducer) {
      // Refresh our source if needed
      if (this._scanSourcePromise) {
        this._scanSourcePromise.cancel();
      }
      this.detachFromSource();
      this._source = this._sourceProducer();
      this.attachToSource();
    } else {
      // No source refresh needed, but we still need to re-scan it all over
      // again as dependencies may affect our predicate
      this.scheduleSourceScan();
    }
    // Also re-scan all existing results and see if they still match. While
    // this is slower than throwing everything away and starting over, this
    // enables the UI to see incremental updates which increases responsiveness
    const promise = this.scheduler.schedule(
      this.scanCurrentResults(),
      SchedulerPriority.Normal,
      `Query.ResultsScan/${this.name}`
    );
    promise.finally(() => {
      if (this._scanResultsPromise === promise) {
        this._scanResultsPromise = undefined;
      }
    });
    this._scanResultsPromise = promise;
  }

  private *scanCurrentResults(): Generator<void> {
    for (const k of this._resultKeys) {
      this.vertexChanged(k);
      yield;
    }
  }

  private groupIdsForVertex(v: string | OT | VertexManager<OT>): GroupId[] {
    const groupByFunc = this._groupByFunc;
    if (!groupByFunc) {
      return [undefined];
    }
    if (typeof v === 'string') {
      v = this.graph.getVertex<OT>(v);
    } else if (v instanceof VertexManager<OT>) {
      v = v.getVertexProxy() as OT;
    }
    const res = groupByFunc(v);
    return res instanceof Array ? res : [res];
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
  // deno-lint-ignore getter-return
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
