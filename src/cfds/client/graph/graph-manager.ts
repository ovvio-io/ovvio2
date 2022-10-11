import EventEmitter from 'eventemitter3';
import { Logger } from '@ovvio/base';
import { Record } from '../../base/record';
import { SchemeManager } from '../../base/scheme';
import { assert, uniqueId } from '@ovvio/base/lib/utils';
import { Dictionary } from '../../collections/dict';
import { CoreObject, coreValueCompare } from '../../core-types';
import { CacheEntry, ClientCache } from '../client-cache';
import { IndexQueryManager } from '../indexes/manager';
import { NetworkAdapter } from '../net/network-adapter';
import { UndoManager } from '../undo/manager';
import { Socket } from '../net/socket';
// import { LayerDef, LayeredAdjacencyList } from './adj-list';
import {
  MutationPack,
  mutationPackAppend,
  mutationPackToArr,
} from './mutations';
import { CompositeField } from './types';
import { Vertex } from './vertex';
import VertexGroup from './vertex-group';
import {
  EVENT_CRITICAL_ERROR,
  EVENT_DID_CHANGE,
  RefsChange,
  VertexManager,
} from './vertex-manager';
import { delay } from '@ovvio/base/lib/utils/time';
import { NS_NOTES, NS_TAGS, SchemeNamespace } from '../../base/scheme-types';
import { MicroTaskTimer } from '../timer';
import {
  JSONObject,
  ReadonlyJSONObject,
} from '@ovvio/base/lib/utils/interfaces';
import { unionIter } from '@ovvio/base/lib/utils/set';
import {
  CoroutineScheduler,
  CoroutineTimer,
  SchedulerPriority,
} from '../coroutine';
import { SharedQueriesManager } from './shared-queries';
import {
  EVENT_LOADING_FINISHED,
  EVENT_VERTEX_CHANGED,
  VertexSource,
} from './vertex-source';
import { AdjacencyList, SimpleAdjacencyList } from './adj-list';

const kMaxInitialNotesLoad = 200;
// const kOldestNotesToLoadMs = 1000 * 60 * 60 * 24 * 14;

export interface PointerFilterFunc {
  (key: string): boolean;
}

export interface CreateVertexInfo {
  namespace: string;
  initialData?: CoreObject;
  key?: string;
}

/**
 * @deprecated
 */
export const EVENT_VERTEX_DID_CHANGE = 'vert-did-change';
/**
 * @deprecated
 */
export const EVENT_CACHE_LOADED = 'cache-loaded';

// export interface GraphLayerDef {
//   name: string;
//   filter: (mgr: VertexManager) => boolean;
// }

// function* graphLayersToAdjLayers(
//   graph: GraphManager,
//   graphDefs?: Iterable<GraphLayerDef>
// ): Generator<LayerDef> {
//   if (graphDefs === undefined) {
//     return;
//   }
//   for (const def of graphDefs) {
//     yield {
//       name: def.name,
//       filter: (src: string, dst: string, _fieldName: string) =>
//         def.filter(graph.getVertexManager(src)) &&
//         def.filter(graph.getVertexManager(dst)),
//     };
//   }
// }

// export enum GraphLayer {
//   /**
//    * An optimization layer for everything but notes. This graph is significantly
//    * faster to traverse if all you need is the layout of workspaces.
//    */
//   NoNotes = 'NoNotes',
//   /**
//    * Optimization layer for everything that's not deleted.
//    */
//   NotDeleted = 'NotDeleted',
// }

// export const kBuiltinGraphLayers: GraphLayerDef[] = [
//   {
//     name: GraphLayer.NoNotes,
//     filter: mgr => !mgr.isDeleted && mgr.namespace !== SchemeNamespace.NOTES,
//   },
//   {
//     name: GraphLayer.NotDeleted,
//     filter: mgr => !mgr.isDeleted,
//   },
// ];

export enum CacheStatus {
  Loading,
  Loaded,
  NoCache,
}

export class GraphManager extends VertexSource {
  readonly sharedQueriesManager: SharedQueriesManager;
  private readonly _rootKey: string;
  private readonly _adjList: AdjacencyList;
  private readonly _vertManagers: Dictionary<string, VertexManager>;
  private readonly _clientCache: ClientCache | undefined;
  private readonly _pendingMutations: Dictionary<string, MutationPack>;
  private readonly _undoManager: UndoManager;
  private readonly _ptrFilterFunc: PointerFilterFunc;
  private _socket: Socket | undefined;
  private readonly _indexQueryManager: IndexQueryManager;
  private readonly _compositeFields: {
    [ns: string]: { [fieldName: string]: CompositeField };
  };
  private readonly _processPendingMutationsTimer: MicroTaskTimer;
  private _cacheLoadPromise: Promise<void> | undefined;
  private _cacheStatus: CacheStatus;

  constructor(
    rootKey: string,
    ptrFilterFunc: PointerFilterFunc,
    networkAdapter?: NetworkAdapter,
    cache?: ClientCache
  ) {
    super();
    this._rootKey = rootKey;
    this._adjList = new SimpleAdjacencyList();
    this._vertManagers = new Map();
    this._clientCache = cache;
    this._pendingMutations = new Map();
    this._ptrFilterFunc = ptrFilterFunc;
    if (networkAdapter !== undefined) {
      this._socket = new Socket(networkAdapter);
    }
    this._indexQueryManager = new IndexQueryManager(
      (...args) => this.registerCompositeField(...args),
      key => this.getVertexManager(key) as any
    );
    this._processPendingMutationsTimer = new MicroTaskTimer(() =>
      this._processPendingMutations()
    );
    this._undoManager = new UndoManager(this);
    this._compositeFields = {};
    this._cacheStatus = CacheStatus.Loading;

    this._createVertIfNeeded(this._rootKey);
    this.sharedQueriesManager = new SharedQueriesManager(this);
  }

  get adjacencyList(): AdjacencyList {
    return this._adjList;
  }

  get socket(): Socket | undefined {
    return this._socket;
  }

  get cache(): ClientCache | undefined {
    return this._clientCache;
  }

  get indexQueryManager() {
    return this._indexQueryManager;
  }

  get undoManager() {
    return this._undoManager;
  }

  get cacheLoaded(): boolean {
    return !this._clientCache || this._cacheStatus !== CacheStatus.Loading;
  }

  get cacheStatus(): CacheStatus {
    return this._cacheStatus;
  }

  get isLoading(): boolean {
    return !this.cacheLoaded;
  }

  get rootKey(): string {
    return this._rootKey;
  }

  get ptrFilterFunc(): PointerFilterFunc {
    return this._ptrFilterFunc;
  }

  keys(): Iterable<string> {
    return this._vertManagers.keys();
  }

  vertexManagers(): Iterable<VertexManager> {
    return this._vertManagers.values();
  }

  disconnect(): void {
    if (this.socket !== undefined) {
      this.socket.networkAdapter.close();
      this._socket = undefined;
    }
  }

  hasVertex(key: string): boolean {
    return this._vertManagers.has(key);
  }

  getRootVertex<T extends Vertex>(): T {
    return this.getVertex<T>(this.rootKey);
  }

  getRootVertexManager<T extends Vertex>(): VertexManager<T> {
    return this.getVertexManager<T>(this.rootKey);
  }

  getVertex<T extends Vertex>(key: string): T {
    return this.getVertexManager<T>(key).getVertexProxy();
  }

  createVertex<T extends Vertex>(
    namespace: string,
    initialData: CoreObject,
    key?: string,
    local = false
  ): T {
    return this._createVertIfNeeded<T>(
      key || uniqueId(),
      undefined,
      namespace,
      initialData,
      true,
      local
    ).getVertexProxy();
  }

  createVertices<T extends Vertex>(vInfos: CreateVertexInfo[]): T[] {
    const vManagers: VertexManager<T>[] = [];
    for (const vInfo of vInfos) {
      const newV = this._createVertIfNeeded<T>(
        vInfo.key || uniqueId(),
        undefined,
        vInfo.namespace,
        vInfo.initialData,
        false
      );

      vManagers.push(newV);
    }
    for (const v of vManagers) {
      if (this.cacheLoaded) {
        v.onCacheLoaded(undefined);
        v.onGraphCacheLoaded();
      }
    }
    const vertices = vManagers.map(v => v.getVertexProxy());

    return vertices;
  }

  getVertexManager<V extends Vertex = Vertex>(
    key: string,
    discoveredBy?: string
  ): VertexManager<V> {
    return this._createVertIfNeeded<V>(key, discoveredBy || this.rootKey);
  }

  /**
   * Create a Vertex group that you can listen to changes together
   */
  createGroup(keys?: string[]): VertexGroup {
    return new VertexGroup(this, keys);
  }

  registerCompositeField(
    namespaces: string | string[] | undefined,
    fieldName: string,
    impl: CompositeField
  ): void {
    if (namespaces === undefined) {
      namespaces = [''];
    } else if (typeof namespaces === 'string') {
      namespaces = [namespaces];
    }
    const compositeFields = this._compositeFields;
    for (const ns of namespaces) {
      let nsDict = compositeFields[ns];
      if (nsDict === undefined) {
        nsDict = {};
        compositeFields[ns] = nsDict;
      }
      nsDict[fieldName] = impl;
    }
  }

  getCompositeField(
    namespace: string,
    fieldName: string
  ): CompositeField | undefined {
    const nsDict = this._compositeFields[namespace];
    if (nsDict && nsDict[fieldName]) {
      return nsDict[fieldName];
    }
    const allDict = this._compositeFields[''];
    if (allDict && allDict[fieldName]) {
      return allDict[fieldName];
    }
    return undefined;
  }

  *compositeFieldsForNamespace(
    namespace: string
  ): Generator<[fieldName: string, impl: CompositeField]> {
    const nsDict = this._compositeFields[namespace];
    if (nsDict) {
      for (const entry of Object.entries(nsDict)) {
        yield entry;
      }
    }
    const allDict = this._compositeFields[''];
    if (allDict) {
      for (const entry of Object.entries(allDict)) {
        yield entry;
      }
    }
  }

  private _createVertIfNeeded<V extends Vertex = Vertex>(
    key: string,
    discoveredBy?: string,
    ns?: string,
    initialData?: CoreObject,
    runOnCacheLoaded = true,
    local = false
  ): VertexManager<V> {
    let mgr = this._vertManagers.get(key);
    if (mgr === undefined) {
      const scheme =
        ns !== undefined ? SchemeManager.instance.getScheme(ns) : undefined;
      const record =
        scheme !== undefined
          ? new Record({
              scheme: scheme,
              data: initialData!,
            })
          : undefined;
      mgr = new VertexManager(this, key, record, discoveredBy);
      this._vertManagers.set(key, mgr);
      this._setupVertexManager(mgr, runOnCacheLoaded);
    }
    return mgr as VertexManager<V>;
  }

  private _setupVertexManager(
    mgr: VertexManager,
    runOnCacheLoaded: boolean
  ): void {
    const key = mgr.key;
    mgr.on(EVENT_DID_CHANGE, (pack: MutationPack, refsChange, RefsChange) =>
      this._vertexDidChange(key, pack, refsChange)
    );
    mgr.on(EVENT_CRITICAL_ERROR, () => this.emit(EVENT_CRITICAL_ERROR));
    if (runOnCacheLoaded) {
      mgr.onCacheLoaded(undefined);
      if (this.cacheLoaded) {
        mgr.onGraphCacheLoaded();
      }
    }
  }

  private _vertexDidChange(
    key: string,
    pack: MutationPack,
    refsChange: RefsChange
  ): void {
    this.getVertexManager(key).traceLog(
      `Vertex mutated ${mutationPackToArr(pack).map(x => x[0])}`
    );
    const pendingMutations = this._pendingMutations;
    pack = mutationPackAppend(pendingMutations.get(key), pack);
    pendingMutations.set(key, pack);
    if (this.cacheLoaded) {
      this._processPendingMutationsTimer.schedule();
    }
    this.emit(EVENT_VERTEX_DID_CHANGE, key, pack, refsChange);
    // this.emit(EVENT_VERTEX_CHANGED, key, pack, refsChange);
  }

  private _processPendingMutations(): void {
    if (this._pendingMutations.size > 0) {
      const mutations: [VertexManager, MutationPack][] = new Array(
        this._pendingMutations.size
      );
      let i = 0;
      for (const [key, mut] of this._pendingMutations) {
        mutations[i++] = [this.getVertexManager(key), mut];
      }
      const pendingMutations = Array.from(this._pendingMutations.entries());
      this._pendingMutations.clear();

      //Send mutations to index/query/undo ...
      this._indexQueryManager.update(mutations);
      this._undoManager.update(mutations);

      for (const [key, pack] of pendingMutations) {
        this.emit(EVENT_VERTEX_CHANGED, key, pack);
      }
    }
  }

  loadCache(): Promise<void> {
    if (this._cacheLoadPromise === undefined) {
      this._cacheLoadPromise = this._loadCacheImpl();
    }
    return this._cacheLoadPromise;
  }

  private async _loadCacheImpl(): Promise<void> {
    assert(!this.cacheLoaded);
    Logger.info('Cache loading starting...');
    const startTime = Date.now();
    const cache = this.cache;
    const rootKey = this.rootKey;
    const allEntries: CacheEntry[] = [];
    const keysToEntries = new Map<string, CacheEntry>();
    // First, fetch the entire cache to memory
    if (undefined !== cache) {
      try {
        await cache.loadAll(entry => {
          allEntries.push(entry);
          keysToEntries.set(entry.key, entry);
        });
      } catch (err) {
        Logger.error('Failed loading cache', err);
      }
    }
    // Sort all cache entries by the order we need to load them. Everything but
    // notes is at the top, followed by a long list of notes.
    allEntries.sort(compareCacheEntries);
    // We load notes up to the cutoff defined above. Everything else will be
    // loaded asynchronously in the background later.
    // const cutoff = Date.now() - kOldestNotesToLoadMs;
    let nextEntryToLoadIdx = 0;
    let firstNoteIdx = -1;
    for (const entry of allEntries) {
      // const lastMod = entry.record?.get<Date | undefined>('lastModified');
      if (entry.record?.scheme.namespace === NS_NOTES) {
        if (
          firstNoteIdx > 0 &&
          nextEntryToLoadIdx - firstNoteIdx >= kMaxInitialNotesLoad //||
          // (lastMod !== undefined && lastMod.getTime() < cutoff)
        ) {
          break;
        }
        if (firstNoteIdx < 0) {
          firstNoteIdx = nextEntryToLoadIdx;
        }
      }
      this._createVertIfNeeded(
        entry.key,
        rootKey,
        undefined,
        undefined,
        false
      ).onCacheLoaded(entry);
      ++nextEntryToLoadIdx;
    }
    // As a result of loading the initial sub-graph from the cache, a bunch of
    // adjacent vertices may have been created. Call onCacheLoaded() on them so
    // we have a somewhat complete sub graph
    let didLoad = true;
    while (didLoad) {
      didLoad = false;
      for (const mgr of this._vertManagers.values()) {
        const key = mgr.key;
        if (!mgr.cacheLoaded) {
          mgr.onCacheLoaded(keysToEntries.get(key));
          didLoad = true;
        }
      }
    }
    // Update our cache status to reflect what actually happened
    this._cacheStatus =
      allEntries.length > 0 ? CacheStatus.Loaded : CacheStatus.NoCache;
    // Finalize cache loading for the vertexes that did load
    for (const mgr of this._vertManagers.values()) {
      assert(mgr.cacheLoaded);
      mgr.onGraphCacheLoaded();
    }
    this._processPendingMutations();
    Logger.info(
      `Cache loading took ${
        (Date.now() - startTime) / 1000
      }sec. Loaded ${nextEntryToLoadIdx} entries. ${
        allEntries.length - nextEntryToLoadIdx
      } are left to load in background. First note index: ${firstNoteIdx}`
    );
    // Let everyone know cache loading completed
    this.emit(EVENT_CACHE_LOADED);
    this.emit(EVENT_LOADING_FINISHED);
    // Start a background task to load the remaining cache entries
    if (nextEntryToLoadIdx < allEntries.length) {
      const backgroundStartTime = Date.now();
      new CoroutineTimer(
        CoroutineScheduler.sharedScheduler(),
        () => {
          const entry = allEntries[nextEntryToLoadIdx];
          const mgr = this._createVertIfNeeded(
            entry.key,
            rootKey,
            undefined,
            undefined,
            false
          );
          if (!mgr.cacheLoaded) {
            assert(mgr.isLoading && mgr.isNull);
            mgr.onCacheLoaded(entry);
            mgr.onGraphCacheLoaded();
          }
          ++nextEntryToLoadIdx;
          if (nextEntryToLoadIdx >= allEntries.length) {
            console.log(
              `Background load finished in ${
                Date.now() - backgroundStartTime
              }ms`
            );
          }
          return nextEntryToLoadIdx < allEntries.length;
        },
        SchedulerPriority.Background
      ).schedule();
    }
  }

  /**
   * Given a source vertex in the graph, this method performs a BFS run starting
   * at the source, and exports all encountered vertices.
   *
   * @param     srcKey The key of the source vertex.
   *
   * @param   distance The maximum distance from the source to search. You must
   *                   ensure a deep enough sub-graph is exported or the
   *                   imported sub-graph will not be usable. This value will
   *                   differ based on the provided source and the desired
   *                   effect during import.
   *
   * @param  excludeNs An optional list of scheme namespaces to skip. Vertices
   *                   matching this list will not be exported regardless of
   *                   their distance from the source.
   *
   * @param editRecord An optional callback where you can apply any cleanups
   *                   to individual records just before they're being encoded.
   *
   * @returns A JSON encoded sub-graph.
   */
  exportSubGraph(
    srcKey: string,
    distance: number,
    excludeNs: string[] = [SchemeNamespace.INVITES],
    editRecord: (r: Record) => void = () => {}
  ): ReadonlyJSONObject {
    const rootKey = this.rootKey;
    const result: JSONObject = {};
    // In a BFS run, unvisited vertices have depths that never decrease, and
    // increase by at most 1. While there are more memory efficient
    // representations, this one is good enough while being quite readable.
    const keysQueue: [string, number][] = [[srcKey, 0]];
    const excludedNsSet = new Set(excludeNs);
    const deletedKeys = new Set<string>();
    const rewriteKeys = new Map<string, string>();
    // Rewrite all refs to our root key so they're absolute
    rewriteKeys.set(rootKey, '/');

    while (keysQueue.length > 0) {
      const [key, depth] = keysQueue.shift()!;
      const vert = this.getVertex(key);
      // We can stop early if existed the defined perimeter
      if (depth > distance) {
        break;
      }
      // Never export the root key. Instead, we treat all refs to the root
      // like pointers to '/'.
      if (key === rootKey) {
        continue;
      }
      // Skip excluded namespaces
      if (excludedNsSet.has(vert.namespace)) {
        deletedKeys.add(key);
        continue;
      }
      // Skip already visited vertices
      if (result.hasOwnProperty(key)) {
        continue;
      }
      const record = vert.record.clone();
      record.serverVersion = 0;
      record.rewriteRefs(rewriteKeys, deletedKeys);
      editRecord(record);
      result[key] = record.toJS(false);
      if (depth < distance) {
        const mgr = this.getVertexManager(key);
        // NOTE: We traverse the computed, in-memory, graph rather than the
        // persistent sub-graph from the underlying records. At the time of this
        // writing (April, 2022) this better captures the app's intention.
        for (const [edgeMgr] of unionIter(mgr.outEdges(), mgr.inEdges())) {
          keysQueue.push([edgeMgr.key, depth + 1]);
        }
      }
    }
    return result;
  }

  /**
   * Given an encoded graph, this method imports it as a local sub graph.
   * This method will create new keys for the imported vertices for a few
   * reasons:
   *
   * - To avoid conflicts with the original, persistent, vertices (to which the
   *   user most likely has no access to).
   *
   * - To allow the same sub-graph to be imported more than once without
   *   overwriting itself.
   *
   * @param encodedGraph An encoded JSON sub-graph.
   * @returns The created vertex managers.
   */
  importSubGraph(
    encodedGraph: ReadonlyJSONObject,
    local: boolean
  ): VertexManager[] {
    const vertManagers = this._vertManagers;
    const decodedGraph = this.decodeGraph(encodedGraph);
    const createdManagers: VertexManager[] = [];
    // First, instantiate all VertexManagers without really connecting the graph
    // they form. This allows us to later build a complete graph rather than
    // dealing with the complex logic of incrementally building the graph.
    for (const [key, record] of decodedGraph) {
      // Sanity checks
      assert(key !== this.rootKey && !vertManagers.has(key));
      const mgr = new VertexManager(this, key, record, this.rootKey, local);
      vertManagers.set(key, mgr);
      createdManagers.push(mgr);
    }
    // Actually connect our graph. This triggers the initial values mutation
    // which causes the vertices to actually appear in query results.
    for (const mgr of createdManagers) {
      this._setupVertexManager(mgr, true);
    }
    return createdManagers;
  }

  private decodeGraph(encodedGraph: ReadonlyJSONObject): Map<string, Record> {
    const result = new Map<string, Record>();
    const keysMapping = new Map<string, string>();
    for (const [origKey, encodedRecord] of Object.entries(encodedGraph)) {
      const newKey = uniqueId();
      const record = Record.fromJS(encodedRecord as ReadonlyJSONObject);
      result.set(newKey, record);
      keysMapping.set(origKey, newKey);
    }
    // Rewrite references to the root with our current root key
    keysMapping.set('/', this.rootKey);
    for (const record of result.values()) {
      record.rewriteRefs(keysMapping);
    }
    console.log('Key Mapping:');
    console.log(keysMapping);
    return result;
  }
}

function compareCacheEntries(e1: CacheEntry, e2: CacheEntry): number {
  if (e1.record && !e2.record) {
    return -1;
  }
  if (!e1.record && e2.record) {
    return 1;
  }
  if (e1.isDeleted && !e2.isDeleted) {
    return 1;
  }
  if (!e1.isDeleted && e2.isDeleted) {
    return -1;
  }
  if (
    e1.record?.scheme.namespace !== NS_NOTES &&
    e2.record?.scheme.namespace === NS_NOTES
  ) {
    return -1;
  }
  if (
    e1.record?.scheme.namespace === NS_NOTES &&
    e2.record?.scheme.namespace !== NS_NOTES
  ) {
    return 1;
  }
  if (e1.record?.has('lastModified') && e2.record?.has('lastModified')) {
    const lm1 = e1.record.get<Date>('lastModified');
    const lm2 = e2.record.get<Date>('lastModified');
    return lm2.getTime() - lm1.getTime();
  }
  return coreValueCompare(e1.key, e2.key);
}
