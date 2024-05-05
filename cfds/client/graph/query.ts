import * as SetUtils from '../../../base/set.ts';
import { GraphManager } from './graph-manager.ts';
import { GroupId, VertexSource, VertexSourceEvent } from './vertex-source.ts';
import { Vertex } from './vertex.ts';
import { VertexManager } from './vertex-manager.ts';
import { MutationPack, mutationPackHasField } from './mutations.ts';
import { QueryStorage } from './query-storage.ts';
import { CoreValue, Equatable } from '../../../base/core-types/base.ts';
import {
  CancellablePromise,
  CoroutineQueue,
  CoroutineScheduler,
  Scheduler,
  SchedulerPriority,
} from '../../../base/coroutine.ts';
import { SimpleTimer, Timer } from '../../../base/timer.ts';
import { assert, notReached } from '../../../base/error.ts';
import { coreValueCompare } from '../../../base/core-types/comparable.ts';
import { unionIter } from '../../../base/common.ts';
import { Emitter } from '../../../base/emitter.ts';

export type Predicate<IT extends Vertex = Vertex, OT extends IT = IT> =
  | ((vertex: IT) => boolean)
  | ((vertex: IT) => vertex is OT);

export interface SortDescriptor<T extends Vertex = Vertex> {
  (v1: T, v2: T): number;
}

// TODO: Change this to a readonly array (requires updates in a few places)
export type QueryResults<T extends Vertex = Vertex> = VertexManager<T>[];

export type GroupByFunction<OT extends Vertex, GT extends CoreValue> = (
  vertex: OT,
) => GroupId<GT> | GroupId<GT>[];

export interface GroupIdComparator<GT extends CoreValue> {
  (gid1: GroupId<GT>, gid2: GroupId<GT>): number;
}

export interface QueryOptions<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  GT extends CoreValue = CoreValue,
> {
  // SRC extends VertexSource<VertexSourceEvent, GT> = VertexSource<
  //   VertexSourceEvent,
  //   GT
  // >
  source: VertexSource;
  predicate: Predicate<IT, OT>;
  name?: string;
  groupBy?: GroupByFunction<OT, GT>;
  sortBy?: SortDescriptor<OT>;
  groupComparator?: GroupIdComparator<GT>;
  sourceGroupId?: GroupId<GT>;
  waitForSource?: boolean;
  contentSensitive?: boolean;
  contentFields?: (keyof OT)[];
  alwaysActive?: boolean;
}

// export const EVENT_QUERY_RESULTS_CHANGED = 'QueryResultsChanged';

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
    OT extends IT = IT,
    GT extends CoreValue = CoreValue,
  >
  extends Emitter<VertexSourceEvent>
  implements VertexSource
{
  readonly startTime: number;
  readonly source: VertexSource;
  readonly predicate: Predicate<IT, OT>;
  private readonly _id: number;
  private readonly _sourceGroupId?: GroupId<GT>;
  private readonly _vertexChangedListener: (
    key: string,
    mutations: MutationPack,
  ) => void;
  private readonly _vertexDeletedListener: (key: string) => void;
  private readonly _results: Map<GroupId<GT>, QueryStorage<OT>>;
  private readonly _clientsNotifyTimer: Timer;
  private readonly _sortDescriptor?: SortDescriptor<OT>;
  private readonly _groupByFunc?: GroupByFunction<OT, GT>;
  private readonly _name?: string;
  private readonly _groupComparator?: GroupIdComparator<GT>;
  private readonly _contentSensitive: boolean;
  private readonly _contentFields?: readonly string[];
  private readonly _waitForSource: boolean = false;
  private _isLoading: boolean;
  private _scanSourcePromise: CancellablePromise<void> | undefined;
  private _groupsLimit: number = Number.MAX_SAFE_INTEGER;
  private _limit: number = Number.MAX_SAFE_INTEGER;
  private _isLocked = false;
  private _attached = false;
  private _proxy: typeof this;

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
    source: VertexSource,
    predicate: Predicate<IT, OT>,
    sortBy?: SortDescriptor<OT>,
    name?: string,
  ): Promise<QueryResults<OT>> {
    let resolve: (
      value: QueryResults<OT> | PromiseLike<QueryResults<OT>>,
    ) => void;
    const promise = new Promise<QueryResults<OT>>((res) => (resolve = res));
    const query = new this({ source, predicate, sortBy, name });
    const callback = () => {
      if (!query.isLoading) {
        const results = query.results;
        query.detach('results-changed', callback);
        resolve(results);
      }
    };
    query.attach('results-changed', callback);
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
  static blocking<
    IT extends Vertex = Vertex,
    OT extends IT = IT,
    GT extends CoreValue = CoreValue,
  >(
    source: VertexSource,
    predicate: Predicate<IT, OT>,
    sortDescriptor?: SortDescriptor<OT>,
  ): QueryResults<OT> {
    const result: VertexManager<OT>[] = [];
    const graph = (
      source instanceof GraphManager ? source : source.graph
    ) as GraphManager;
    for (const key of source.keys()) {
      const vert = graph.getVertex<IT>(key);
      if (predicate(vert)) {
        result.push(vert.manager as VertexManager<OT>);
      }
    }
    if (sortDescriptor !== undefined) {
      result.sort((mgr1, mgr2) =>
        sortDescriptor(mgr1.getVertexProxy(), mgr2.getVertexProxy()),
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
    limit?: number,
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

  constructor(opts: QueryOptions<IT, OT, GT>) {
    super(undefined, opts.alwaysActive);
    this.startTime = Date.now();
    this._id = ++gQueryId;
    this._vertexChangedListener = (key, mutations) =>
      this.vertexChanged(key, mutations);
    this._vertexDeletedListener = (key) => this.vertexDeleted(key);
    // this._resultKeys = new Set();
    this._results = new Map();
    this._clientsNotifyTimer = new SimpleTimer(300, false, () =>
      this._notifyQueryChanged(),
    );
    this._isLoading = true;
    this.source = opts.source;
    this.predicate = opts.predicate;
    if (opts.name) {
      this._name = opts.name;
    }
    if (opts.groupBy) {
      this._groupByFunc = opts.groupBy;
    }
    if (opts.groupComparator) {
      this._groupComparator = opts.groupComparator;
    }
    if (opts.sourceGroupId) {
      this._sourceGroupId = opts.sourceGroupId;
    }
    if (opts.sortBy) {
      this._sortDescriptor = opts.sortBy;
    }
    this._contentSensitive = opts?.contentSensitive === true;
    this._waitForSource = opts?.waitForSource === true;
    this._proxy = new Proxy(this, {});
  }

  protected suspend(): void {
    if (!this.isLocked && this._attached) {
      this.detachFromSource();
      console.log(`Query ${this.debugName} suspended`);
    }
  }

  protected resume(): void {
    if (!this._attached) {
      const source = this.source as VertexSource;
      if (this._waitForSource === true && source.isLoading) {
        source.once('loading-finished', () => this.attachToSource());
      } else {
        this.attachToSource();
      }
    }
  }

  get name(): string | undefined {
    return this._name;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get graph(): GraphManager {
    const src = this.source;
    if (src instanceof GraphManager) {
      return src;
    }
    return src.graph as GraphManager;
  }

  get results(): QueryResults<OT> {
    const unsafeInternalArrays: VertexManager<OT>[][] = [];
    for (const storage of this._results.values()) {
      unsafeInternalArrays.push(storage.results);
    }
    return ([] as VertexManager<OT>[])
      .concat(...unsafeInternalArrays)
      .sort((mgr1, mgr2) =>
        (this._sortDescriptor || coreValueCompare)(
          mgr1.getVertexProxy(),
          mgr2.getVertexProxy(),
        ),
      );
  }

  get groupComparator(): GroupIdComparator<GT> {
    return this._groupComparator || coreValueCompare;
  }

  get isLocked(): boolean {
    return this._isLocked;
  }

  lock(): this {
    this._isLocked = true;
    return this;
  }

  unlock(): this {
    this._isLocked = false;
    return this;
  }

  vertices(gid?: GroupId<GT>): OT[] {
    if (typeof gid !== 'undefined') {
      return this.group(gid).map((mgr) => mgr.getVertexProxy());
    }
    return this.results.map((mgr) => mgr.getVertexProxy());
  }

  get count(): number {
    let size = 0;
    for (const list of this._results.values()) {
      size += list.size;
    }
    return size;
  }

  get groupCount(): number {
    return this._results.size;
  }

  get scheduler(): Scheduler {
    // At the time of this writing, we're still testing different execution
    // strategies. Currently executing all queries concurrently results in a
    // more responsive UI with less re-rendering than executing queries
    // serially. That being said, when there are a high number of query
    // cancellations, serial execution will result in a smoother user
    // experience. This was the case in one of the first iterations on the new
    // filters bar on April, 2022.
    //
    // Using kQueryQueue as the scheduler will enforce a serial execution.
    // return kQueryQueue;
    return CoroutineScheduler.sharedScheduler();
    // return this.graph.cacheLoadingEnded
    //   ? CoroutineScheduler.sharedScheduler()
    //   : kQueryQueue;
  }

  get limit(): number {
    return this._limit;
  }

  set limit(n: number) {
    if (n !== this._limit) {
      this._limit = n;
      for (const storage of this._results.values()) {
        storage.limit = n;
      }
      this._clientsNotifyTimer.schedule();
    }
  }

  get groupsLimit(): number {
    return this._groupsLimit;
  }

  set groupsLimit(n: number) {
    if (n !== this._groupsLimit) {
      this._groupsLimit = n;
      this._clientsNotifyTimer.schedule();
    }
  }

  get proxy(): typeof this {
    return this._proxy;
  }

  groups(): GroupId<GT>[] {
    return Array.from(this._results.keys()).sort(
      this._groupComparator || coreValueCompare,
    );
  }

  group(id: GroupId<GT>): QueryResults<OT> {
    const storage = this._results.get(id);
    return storage ? storage.results : [];
  }

  countForGroup(id: GroupId<GT>): number {
    const storage = this._results.get(id);
    return storage ? storage.size : 0;
  }

  hasVertex(key: string): boolean {
    return this.source.hasVertex(key) && this.hasVertexInStorage(key);
  }

  private hasVertexInStorage(key: string): boolean {
    for (const storage of this._results.values()) {
      if (storage.has(key)) {
        return true;
      }
    }
    return false;
  }

  keys(gid?: GroupId<GT>): Iterable<string> {
    if (typeof gid === 'undefined') {
      return this.results.map((mgr) => mgr.key);
    }
    const storage = this._results.get(gid);
    if (!storage) {
      return [];
    }
    return storage.results.map((mgr) => mgr.key);
  }

  *groupsForKey(key: string): Iterable<GroupId<GT>> {
    if (!this.graph.hasVertex(key)) {
      return;
    }
    for (const [gid, storage] of this._results.entries()) {
      if (storage.has(key)) {
        yield gid;
      }
    }
  }

  keyInGroup(key: string, gid: GroupId<GT>): boolean {
    const storage = this._results.get(gid);
    return storage !== undefined && storage.has(key);
  }

  forEach(f: (vert: OT, idx: number, groupId: GroupId<GT>) => void): void {
    for (const [groupId, storage] of this._results.entries()) {
      storage.results.forEach((mgr, idx) =>
        f(mgr.getVertexProxy(), idx, groupId),
      );
    }
  }

  map<T>(mapper: (vert: OT, idx: number, groupId: GroupId<GT>) => T): T[] {
    const result: T[] = [];
    this.forEach((vert, idx, gid) => result.push(mapper(vert, idx, gid)));
    return result;
  }

  transform<T = VertexManager<OT>>(
    filter: (vert: OT, idx: number, groupId: GroupId<GT>) => boolean,
    mapper: (
      vert: VertexManager<OT>,
      idx: number,
      groupId: GroupId<GT>,
    ) => T = (vert) => vert as unknown as T,
  ): T[] {
    const result: T[] = [];
    this.forEach((vert, idx, gid) => {
      if (filter(vert, idx, gid)) {
        result.push(mapper(vert.manager, idx, gid));
      }
    });
    return result;
  }

  onResultsChanged(handler: () => void): () => void {
    this.attach('results-changed', () => {
      handler();
    });
    return () => {
      this.detach('results-changed', handler);
    };
  }

  private detachFromSource(): void {
    if (this._attached) {
      if (this._scanSourcePromise) {
        this._scanSourcePromise.cancelImmediately();
        this._scanSourcePromise = undefined;
      }
      const source: VertexSource = this.source as VertexSource;
      source.detach('vertex-changed', this._vertexChangedListener);
      source.detach('vertex-deleted', this._vertexDeletedListener);
      this._attached = false;
    }
  }

  /*****************************************/
  /******** Private API Starts Here ********/
  /*****************************************/

  private diffGroupIds(
    key: string,
  ): [added: GroupId<GT>[], removed: GroupId<GT>[]] {
    const mgr = this.graph.getVertexManager<OT>(key);
    const existingGroups = new Set<GroupId<GT>>(this.groupsForKey(key));
    const match = this.predicate(mgr.getVertexProxy());
    const newGroupIds = match
      ? this._groupByFunc
        ? this._groupByFunc(mgr.getVertexProxy())
        : undefined
      : [];
    const newIdsSet = new Set<GroupId<GT>>();

    if (newGroupIds instanceof Array) {
      if (newGroupIds.length > 0) {
        SetUtils.update(newIdsSet, newGroupIds as GroupId<GT>[]);
      } else if (match) {
        newIdsSet.add(null);
      }
    } else {
      newIdsSet.add(typeof newGroupIds === 'undefined' ? null : newGroupIds);
    }
    return [
      Array.from(newIdsSet),
      Array.from(SetUtils.subtract(existingGroups, newIdsSet)),
    ];
  }

  private vertexChanged(key: string, pack: MutationPack): void {
    const sourceGID = this._sourceGroupId;
    if (sourceGID && !this.source.keyInGroup(key, sourceGID)) {
      return;
    }

    const wasInSourceKeys = this.hasVertex(key);
    const vertex = this.graph.getVertex<OT>(key);
    const [allCurrentGroupIds, removedGroupIds] = this.diffGroupIds(key);
    let shouldNotify = false;
    const results = this._results;
    let sortedGroupIds = this.groups();
    for (const groupId of removedGroupIds) {
      const storage = results.get(groupId);
      if (!storage) {
        continue;
      }
      const groupInLimit =
        this._groupsLimit <= 0 ||
        sortedGroupIds.indexOf(groupId) < this._groupsLimit;
      if (storage.size === 1) {
        assert(storage.has(key)); // Sanity check
        shouldNotify =
          (results.delete(groupId) && groupInLimit) || shouldNotify;
      } else {
        shouldNotify = (storage.delete(key) && groupInLimit) || shouldNotify;
      }
    }
    sortedGroupIds = this.groups();
    if (this.predicate(vertex)) {
      for (const gid of allCurrentGroupIds) {
        let storage = results.get(gid);
        if (typeof storage === 'undefined') {
          storage = new QueryStorage<OT>(this.graph, this._sortDescriptor);
          storage.limit = this.limit;
          results.set(gid, storage);
          sortedGroupIds = this.groups();
        }
        const groupInLimit =
          this._groupsLimit <= 0 ||
          sortedGroupIds.indexOf(gid) < this._groupsLimit;
        shouldNotify = (storage.add(key) && groupInLimit) || shouldNotify;
      }
      // TODO: Wrap in a micro task timer to avoid timing issues around
      // coroutine cancellation. This is currently not an issue since we're
      // using cancelImmediately() rather than cancel().
      this.emit('vertex-changed', key, pack);
    } else if (wasInSourceKeys) {
      // TODO: Wrap in a micro task timer to avoid timing issues around
      // coroutine cancellation. This is currently not an issue since we're
      // using cancelImmediately() rather than cancel().
      this.emit('vertex-deleted', key, pack);
    }
    // if (
    //   wasInSourceKeys !== this.hasVertex(key) &&
    //   !(shouldNotify || this.shouldNotifyForKey(key))
    // ) {
    //   debugger;
    // }
    if (wasInSourceKeys !== this.hasVertex(key) && shouldNotify) {
      // console.log(
      //   `${performance.now()} Query ${this.name} changed. Count = ${
      //     this.count
      //   }, group count = ${this.groupCount}`
      // );
      this._clientsNotifyTimer.schedule();
    } else if (
      wasInSourceKeys &&
      this._contentSensitive &&
      (!this._contentFields ||
        this._contentFields.length <= 0 ||
        mutationPackHasField(pack, ...this._contentFields))
    ) {
      this._clientsNotifyTimer.schedule();
    }
  }

  private vertexDeleted(key: string): void {
    // debugger;
    if (!this.hasVertexInStorage(key)) {
      return;
    }
    const results = this._results;
    const oldGroups = Array.from(this.groupsForKey(key));
    if (oldGroups.length > 0) {
      let shouldNotify = false; //this.shouldNotifyForKey(key);
      for (const gid of oldGroups) {
        const storage = results.get(gid)!;
        shouldNotify = storage.delete(key) || shouldNotify;
        if (storage.size === 0) {
          results.delete(gid);
        }
      }
      this.emit('vertex-deleted', key);
      if (shouldNotify) {
        this._clientsNotifyTimer.schedule();
      }
    }
  }

  protected *loadKeysFromSource(): Generator<void> {
    const startTime = performance.now();
    console.log(
      `${performance.now()} Query ${
        this.debugName
      } starting source scan. Pending queries: ${kQueryQueue.size}`,
    );
    if (!this.isActive) {
      console.log(
        `${performance.now()} Query ${this.debugName} cancelled, took ${
          performance.now() - startTime
        }ms. Pending queries: ${kQueryQueue.size}`,
      );
      return;
    }
    for (const key of this.source.keys(this._sourceGroupId)) {
      if (!this.isActive) {
        console.log(
          `${performance.now()} Query ${this.debugName} cancelled, took ${
            performance.now() - startTime
          }ms. Pending queries: ${kQueryQueue.size}`,
        );
        return;
      }
      this.vertexChanged(key);
      yield;
    }
    const runningTime = performance.now() - startTime;
    console.log(
      `${performance.now()} Query ${
        this.debugName
      } completed, took ${runningTime}ms and found ${
        this.count
      } results. Pending queries: ${kQueryQueue.size}`,
    );
    this._isLoading = false;
    this.emit('loading-finished');
    this._clientsNotifyTimer.schedule();
  }

  private get debugName(): string {
    let res = String(this._id);
    if (this.name !== undefined) {
      res += '/' + this.name;
    }
    return res;
  }

  private attachToSource(): void {
    if (!this._attached) {
      const source = this.source as VertexSource;
      // assert(!source.isLoading);
      source.attach('vertex-changed', this._vertexChangedListener);
      source.attach('vertex-deleted', this._vertexDeletedListener);
      this.scheduleSourceScan();
      this._attached = true;
    }
  }

  private scheduleSourceScan(): void {
    if (this._scanSourcePromise) {
      this._scanSourcePromise.cancelImmediately();
    }
    const promise = this.scheduler.schedule(
      this.loadKeysFromSource(),
      SchedulerPriority.Normal,
      `Query.SourceScan/${this.name}`,
    );
    promise.finally(() => {
      if (this._scanSourcePromise === promise) {
        this._scanSourcePromise = undefined;
      }
    });
    this._scanSourcePromise = promise;
  }

  _notifyQueryChanged(): void {
    if (!this.isActive /*|| this.isLoading*/) {
      return;
    }
    // this._cachedSortedResults = undefined;
    // console.log(
    //   `Query ${this.name} changed. Count = ${this.count}, group count = ${this.groupCount}`,
    // );
    this._proxy = new Proxy(this, {});
    this.emit('results-changed');
  }
}

export interface QueryInputDefinition<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  GT extends CoreValue = CoreValue,
> {
  query: Query<IT, OT, GT>;
  groupId?: GT;
}

export class UnionQuery<
    IT extends Vertex = Vertex,
    OT extends IT = IT,
    GT extends CoreValue = CoreValue,
  >
  extends Emitter<VertexSourceEvent>
  implements VertexSource
{
  readonly sources: QueryInputDefinition<IT, OT, GT>[];
  private readonly _changeListeners: Map<
    Query<IT, OT, GT>,
    (key: string, pack: MutationPack) => void
  >;
  private _isLoading: boolean;
  private _isOpen: boolean;

  constructor(
    sources: Iterable<Query<IT, OT, GT> | QueryInputDefinition<IT, OT, GT>>,
    readonly name?: string,
    readonly groupId?: GT,
  ) {
    super();
    this._changeListeners = new Map();
    let loadingCount = 0;
    this.sources = Array.from(sources).map((src) =>
      src instanceof Query ? { query: src } : src,
    );
    for (let src of this.sources) {
      const query = src.query;
      if (query.isLoading) {
        ++loadingCount;
        // eslint-disable-next-line no-loop-func
        query.once('loading-finished', () => {
          if (!this.isOpen) {
            return;
          }
          assert(!query.isLoading);
          // src.on(EVENT_VERTEX_CHANGED, this.changeListenerForQuery(src));
          // src.on(EVENT_VERTEX_DELETED, this.changeListenerForQuery(src));
          // src.once(EVENT_QUERY_DID_CLOSE, this._closeListener);
          assert(loadingCount > 0);
          if (--loadingCount === 0) {
            this._isLoading = false;
            this.emit('loading-finished');
          }
        });
      } //else {
      query.attach('vertex-changed', this.changeListenerForQuery(query));
      query.attach('vertex-deleted', this.changeListenerForQuery(query));
      // }
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

  queries(): Iterable<Query<IT, OT, GT>> {
    return this._changeListeners.keys();
  }

  *keys(): Generator<string> {
    const processedKeys = new Set<string>();
    for (const key of unionIter(
      ...this.sources.map((src) => src.query.keys(src.groupId)),
    )) {
      if (!processedKeys.has(key)) {
        processedKeys.add(key);
        yield key;
      }
    }
  }

  hasVertex(key: string): boolean {
    for (const src of this.sources) {
      if (
        src.groupId
          ? src.query.keyInGroup(key, src.groupId)
          : src.query.hasVertex(key)
      ) {
        return true;
      }
    }
    return false;
  }

  keyInGroup(key: string): boolean {
    return this.hasVertex(key);
  }

  protected suspend(): void {
    if (this._isOpen) {
      this._isOpen = false;
      for (const q of this.queries()) {
        q.detach('vertex-changed', this.changeListenerForQuery(q));
        q.detach('vertex-deleted', this.changeListenerForQuery(q));
      }
    }
  }

  private changeListenerForQuery(
    src: Query<IT, OT, GT>,
  ): (key: string, pack: MutationPack) => void {
    let result = this._changeListeners.get(src);
    if (result === undefined) {
      result = (key, pack) => {
        this.emit(
          this.hasVertex(key) ? 'vertex-changed' : 'vertex-deleted',
          key,
          pack,
        );
      };
      this._changeListeners.set(src, result);
    }
    return result;
  }
}
