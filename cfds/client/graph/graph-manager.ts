import { Record } from '../../base/record.ts';
import { SchemeManager } from '../../base/scheme.ts';
import { assert } from '../../../base/error.ts';
import { uniqueId } from '../../../base/common.ts';
import { Dictionary } from '../../../base/collections/dict.ts';
import { CoreObject } from '../../../base/core-types/index.ts';
import { UndoManager } from '../undo/manager.ts';
import { MutationPack, mutationPackAppend } from './mutations.ts';
import { Vertex } from './vertex.ts';
import {
  EVENT_CRITICAL_ERROR,
  EVENT_DID_CHANGE,
  RefsChange,
  VertexManager,
} from './vertex-manager.ts';
import {
  DataType,
  NS_NOTES,
  SchemeNamespace,
} from '../../base/scheme-types.ts';
import { MicroTaskTimer } from '../../../base/timer.ts';
import { JSONObject, ReadonlyJSONObject } from '../../../base/interfaces.ts';
import { unionIter } from '../../../base/set.ts';
import { SharedQueriesManager } from './shared-queries.ts';
import { EVENT_VERTEX_CHANGED, VertexSource } from './vertex-source.ts';
import { AdjacencyList, SimpleAdjacencyList } from './adj-list.ts';
import {
  EVENT_NEW_COMMIT,
  MemRepoStorage,
  Repository,
} from '../../../repo/repo.ts';
import { Commit } from '../../../repo/commit.ts';
import { IDBRepositoryBackup } from '../../../repo/idbbackup.ts';
import { RepoClient } from '../../../net/repo-client.ts';
import { kSyncConfigClient } from '../../../net/base-client.ts';
import { appendPathComponent } from '../../../base/string.ts';
import { NoteSearchEngine } from './note-search.ts';

// We consider only commits from the last 30 days to be "hot", and load them
// automatically
const K_HOT_COMMITS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface PointerFilterFunc {
  (key: string): boolean;
}

/**
 * @deprecated
 */
export const EVENT_VERTEX_DID_CHANGE = 'vert-did-change';

export class GraphManager extends VertexSource {
  readonly sharedQueriesManager: SharedQueriesManager;
  private readonly _rootKey: string;
  private readonly _adjList: AdjacencyList;
  private readonly _vertManagers: Dictionary<string, VertexManager>;
  private readonly _pendingMutations: Dictionary<string, MutationPack>;
  private readonly _undoManager: UndoManager;
  private readonly _ptrFilterFunc: PointerFilterFunc;
  private readonly _processPendingMutationsTimer: MicroTaskTimer;
  private readonly _session: string;
  private readonly _repoById: Dictionary<string, Repository<MemRepoStorage>>;
  private readonly _backup: IDBRepositoryBackup;
  private readonly _repoClients: Dictionary<string, RepoClient<MemRepoStorage>>;
  private readonly _baseServerUrl: string | undefined;
  private readonly _notesSearch: NoteSearchEngine;

  constructor(
    rootKey: string,
    ptrFilterFunc: PointerFilterFunc,
    baseServerUrl?: string
  ) {
    super();
    this._repoById = new Map();
    this._rootKey = rootKey;
    this._adjList = new SimpleAdjacencyList();
    this._vertManagers = new Map();
    this._pendingMutations = new Map();
    this._session = rootKey + '/' + uniqueId();
    this._ptrFilterFunc = ptrFilterFunc;
    this._processPendingMutationsTimer = new MicroTaskTimer(() =>
      this._processPendingMutations()
    );
    this._undoManager = new UndoManager(this);

    this._createVertIfNeeded(this._rootKey);
    this.sharedQueriesManager = new SharedQueriesManager(this);
    this._repoById = new Map();
    this._backup = new IDBRepositoryBackup(rootKey);
    this._repoClients = new Map();
    this._baseServerUrl = baseServerUrl;
    this._notesSearch = new NoteSearchEngine(this);
  }

  get adjacencyList(): AdjacencyList {
    return this._adjList;
  }

  get undoManager() {
    return this._undoManager;
  }

  get rootKey(): string {
    return this._rootKey;
  }

  get ptrFilterFunc(): PointerFilterFunc {
    return this._ptrFilterFunc;
  }

  get isLoading(): boolean {
    return false;
  }

  get session(): string {
    return this._session;
  }

  get noteSearchEngine(): NoteSearchEngine {
    return this._notesSearch;
  }

  async loadLocalContents(): Promise<void> {
    for (const [repoId, commits] of Object.entries(
      await this._backup.loadCommits()
    )) {
      this.repository(repoId).persistCommits(commits);
    }
  }

  repository(id: string): Repository<MemRepoStorage> {
    let repo = this._repoById.get(id);
    if (!repo) {
      repo = new Repository(new MemRepoStorage());
      repo.on(EVENT_NEW_COMMIT, (c: Commit) => {
        if (!c.key) {
          return;
        }
        const record = repo!.recordForCommit(c);
        const ns = record.scheme.namespace;
        if (
          ns === NS_NOTES &&
          c.timestamp.getTime() < Date.now() - K_HOT_COMMITS_WINDOW_MS
        ) {
          return;
        }
        // The following line does two major things:
        //
        // 1. It creates the vertex manager if it doesn't already exist.
        //    Since this event gets triggered when loading from cache, this
        //    implicitly boots our graph.
        //
        // 2. A commit will be performed if we need to merge some newly
        //    discovered commits.
        this.getVertexManager(c.key).scheduleCommitIfNeeded();

        // Any kind of activity needs to reset the sync timer
        this._repoClients.get(id)?.touch();
      });
      this._repoById.set(id, repo);

      if (this._baseServerUrl) {
        const client = new RepoClient(
          repo,
          // serveAddr/repoId/sync
          appendPathComponent(this._baseServerUrl, id, 'sync'),
          kSyncConfigClient
        );
        this._repoClients.set(id, client);
        client.startSyncing();
      }
    }
    return repo;
  }

  keys(): Iterable<string> {
    return this._vertManagers.keys();
  }

  vertexManagers(): Iterable<VertexManager> {
    return this._vertManagers.values();
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
      namespace,
      initialData,
      local
    ).getVertexProxy();
  }

  getVertexManager<V extends Vertex = Vertex>(
    key: string,
    discoveredBy?: string
  ): VertexManager<V> {
    return this._createVertIfNeeded<V>(key, discoveredBy || this.rootKey);
  }

  private _createVertIfNeeded<V extends Vertex = Vertex>(
    key: string,
    ns?: string,
    initialData?: CoreObject,
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
              data: initialData! as DataType,
            })
          : undefined;
      mgr = new VertexManager(this, key, record, local);
      this._vertManagers.set(key, mgr);
      mgr.on(EVENT_DID_CHANGE, (pack: MutationPack, refsChange: RefsChange) =>
        this._vertexDidChange(key, pack, refsChange)
      );
      mgr.on(EVENT_CRITICAL_ERROR, () => this.emit(EVENT_CRITICAL_ERROR));
      this._setupVertexManager(mgr);
    }
    return mgr as VertexManager<V>;
  }

  private _setupVertexManager(mgr: VertexManager): void {
    const key = mgr.key;
    mgr.on(EVENT_DID_CHANGE, (pack: MutationPack, refsChange: RefsChange) =>
      this._vertexDidChange(key, pack, refsChange)
    );
    mgr.on(EVENT_CRITICAL_ERROR, () => this.emit(EVENT_CRITICAL_ERROR));
  }

  private _vertexDidChange(
    key: string,
    pack: MutationPack,
    refsChange: RefsChange
  ): void {
    const pendingMutations = this._pendingMutations;
    pack = mutationPackAppend(pendingMutations.get(key), pack);
    pendingMutations.set(key, pack);
    this._processPendingMutationsTimer.schedule();
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
      this._undoManager.update(mutations);

      for (const [key, pack] of pendingMutations) {
        this.emit(EVENT_VERTEX_CHANGED, key, pack);
      }
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
      const mgr = new VertexManager(this, key, record, local);
      vertManagers.set(key, mgr);
      createdManagers.push(mgr);
    }
    // Actually connect our graph. This triggers the initial values mutation
    // which causes the vertices to actually appear in query results.
    for (const mgr of createdManagers) {
      this._setupVertexManager(mgr);
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
    return result;
  }
}
