import { Record } from '../../base/record.ts';
import { SchemeManager } from '../../base/scheme.ts';
import { assert } from '../../../base/error.ts';
import { uniqueId } from '../../../base/common.ts';
import { Dictionary } from '../../../base/collections/dict.ts';
import { CoreObject, CoreValue } from '../../../base/core-types/index.ts';
import { UndoManager } from '../undo/manager.ts';
import {
  MutationPack,
  mutationPackAppend,
  mutationPackOptimize,
} from './mutations.ts';
import { Vertex, VertexId, VertexIdGetKey } from './vertex.ts';
import {
  EVENT_DID_CHANGE,
  RefsChange,
  VertexManager,
} from './vertex-manager.ts';
import { SchemeNamespace } from '../../base/scheme-types.ts';
import { MicroTaskTimer } from '../../../base/timer.ts';
import { JSONObject, ReadonlyJSONObject } from '../../../base/interfaces.ts';
import { unionIter } from '../../../base/set.ts';
import {
  SharedQueriesManager,
  SharedQueryName,
  SharedQueryType,
} from './shared-queries.ts';
import { VertexSource, VertexSourceEvent } from './vertex-source.ts';
import { AdjacencyList, SimpleAdjacencyList } from './adj-list.ts';
import { MemRepoStorage, Repository } from '../../../repo/repo.ts';
import { Commit } from '../../../repo/commit.ts';
import { IDBRepositoryBackup } from '../../../repo/idbbackup.ts';
import { RepoClient } from '../../../net/repo-client.ts';
import {
  ClientStatus,
  EVENT_STATUS_CHANGED,
} from '../../../net/base-client.ts';
import { Query, QueryOptions } from './query.ts';
import { HashMap } from '../../../base/collections/hash-map.ts';
import { coreValueHash } from '../../../base/core-types/encoding/hash.ts';
import { coreValueEquals } from '../../../base/core-types/equals.ts';
import { Emitter } from '../../../base/emitter.ts';
import { TrustPool } from '../../../auth/session.ts';
import {
  kSyncConfigClient,
  SyncScheduler,
} from '../../../net/sync-scheduler.ts';
import {
  MultiSerialScheduler,
  SerialScheduler,
} from '../../../base/serial-scheduler.ts';

export interface PointerFilterFunc {
  (key: string): boolean;
}

export interface CreateVertexInfo {
  namespace: SchemeNamespace;
  initialData?: CoreObject;
  key?: string;
}

/**
 * @deprecated
 */
// export const EVENT_VERTEX_DID_CHANGE = EVENT_VERTEX_CHANGED;
/**
 * @deprecated
 */

export enum CacheLoadingStatus {
  CriticalLoading,
  BackgroundLoading,
  Done,
  NoCache,
}

export type StatusChangedCallback = (
  status: ClientStatus,
  graph: GraphManager,
) => void;

interface RepositoryPlumbing {
  repo: Repository<MemRepoStorage>;
  client?: RepoClient<MemRepoStorage>;
  backup?: IDBRepositoryBackup;
  loadingPromise?: Promise<void>;
  loadedLocalContents?: boolean;
  loadingFinished?: true;
  syncFinished?: true;
  active: boolean;
}

export class GraphManager
  extends Emitter<VertexSourceEvent | 'status-changed'>
  implements VertexSource
{
  readonly sharedQueriesManager: SharedQueriesManager;
  private readonly _trustPool: TrustPool;
  private readonly _adjList: AdjacencyList;
  private readonly _vertManagers: Dictionary<string, VertexManager>;
  private readonly _pendingMutations: Dictionary<string, MutationPack>;
  private readonly _undoManager: UndoManager;
  private readonly _processPendingMutationsTimer: MicroTaskTimer;
  private readonly _executedFieldTriggers: Map<string, string[]>;
  private readonly _repoById: Dictionary<string, RepositoryPlumbing>;
  private readonly _openQueries: HashMap<string, [QueryOptions, Query]>;
  private readonly _syncScheduler: SyncScheduler | undefined;
  private _prevClientStatus: ClientStatus = 'offline';

  constructor(trustPool: TrustPool, baseServerUrl?: string) {
    super(undefined, true);
    this._trustPool = trustPool;
    this._adjList = new SimpleAdjacencyList();
    this._vertManagers = new Map();
    this._pendingMutations = new Map();
    this._processPendingMutationsTimer = new MicroTaskTimer(() =>
      this._processPendingMutations(),
    );
    this._executedFieldTriggers = new Map();
    this._undoManager = new UndoManager(this);

    this.sharedQueriesManager = new SharedQueriesManager(this);
    this._repoById = new Map();
    this._openQueries = new HashMap<string, [QueryOptions, Query]>(
      coreValueHash,
      coreValueEquals,
    );
    if (baseServerUrl) {
      this._syncScheduler = new SyncScheduler(
        `${baseServerUrl}/batch-sync`,
        kSyncConfigClient,
        trustPool,
      );
    }

    // Automatically init the directory as everything depends on its presence.
    this.repository('/sys/dir');
  }

  protected suspend(): void {
    this._processPendingMutationsTimer.unschedule();
  }

  protected resume(): void {
    this._processPendingMutationsTimer.schedule();
  }

  get adjacencyList(): AdjacencyList {
    return this._adjList;
  }

  get undoManager() {
    return this._undoManager;
  }

  get trustPool(): TrustPool {
    return this._trustPool;
  }

  get rootKey(): string {
    return this._trustPool.currentSession.owner!;
  }

  get selectionId(): string {
    const trustPool = this.trustPool;
    return `${trustPool.currentSession.owner}/${trustPool.currentSession.id}`;
  }

  get ptrFilterFunc(): PointerFilterFunc {
    const selectionId = this.selectionId;
    return (key: string) => key !== selectionId;
  }

  get isLoading(): boolean {
    return false;
  }

  get graph(): VertexSource {
    return this;
  }

  get status(): ClientStatus {
    let offlineCount = 0,
      syncingCount = 0;
    for (const { client } of this._repoById.values()) {
      if (!client) {
        ++offlineCount;
        continue;
      }
      switch (client.status) {
        case 'offline':
          ++offlineCount;
          break;

        case 'sync':
          ++syncingCount;
          break;

        case 'idle':
          break;
      }
    }
    if (syncingCount > 0) {
      return 'sync';
    }
    return offlineCount === this._repoById.size ? 'offline' : 'idle';
  }

  async loadRepository(id: string): Promise<void> {
    id = Repository.normalizeId(id);
    const plumbing = this.plumbingForRepository(id);
    if (plumbing.loadingPromise) {
      return plumbing.loadingPromise;
    }

    const backup = plumbing.backup;
    const client = plumbing?.client;

    if (typeof backup === 'undefined') {
      plumbing.loadingFinished = true;
      // if (client) {
      // await client.sync();
      // client.ready = true;
      // client.startSyncing();
      // }
      return Promise.resolve();
    }

    const repo = plumbing.repo;
    plumbing.loadingPromise = MultiSerialScheduler.get('repoLoad').run(
      async () => {
        if (backup) {
          const commits = await backup.loadCommits();
          if (commits instanceof Array) {
            repo.allowMerge = false;
            try {
              repo.persistVerifiedCommits(commits);
            } finally {
              repo.allowMerge = true;
            }
          } else {
            console.log(`Unexpected IDB result: ${commits}`);
          }
        } else {
          console.log(`Backup disabled for repo: ${id}`);
        }
        // Load all keys from this repo
        for (const key of repo.keys()) {
          this.getVertexManager(key).touch();
        }
        plumbing.active = true;
        plumbing.loadingFinished = true;
        // const numberOfCommits = repo.numberOfCommits();
        // if (numberOfCommits > (id === 'sys/dir' ? 1 : 0)) {
        //   plumbing.loadedLocalContents = true;
        //   if (client) {
        //     client.ready = true;
        //     client.startSyncing();
        //   }
        // }
      },
    );
    return plumbing.loadingPromise;
  }

  async syncRepository(id: string): Promise<void> {
    return SerialScheduler.get('RepoSync').run(async () => {
      const plumbing = this.plumbingForRepository(id);
      const client = plumbing.client;
      await this.loadRepository(id);
      if (client && client.isOnline) {
        await client.sync();
        // Load all keys from this repo
        for (const key of plumbing.repo.keys()) {
          this.getVertexManager(key).touch();
        }
        plumbing.syncFinished = true;
        client.ready = true;
        client.startSyncing();
      }
    });
  }

  startSyncing(repoId: string): void {
    this.plumbingForRepository(repoId).client?.startSyncing();
  }

  async prepareRepositoryForUI(repoId: string): Promise<void> {
    await this.loadRepository(repoId);
    const plumbing = this.plumbingForRepository(repoId);
    if (plumbing.loadedLocalContents !== true) {
      await this.syncRepository(repoId);
      this.startSyncing(repoId);
    } else {
      this.startSyncing(repoId);
    }
  }

  private plumbingForRepository(id: string): RepositoryPlumbing {
    id = Repository.normalizeId(id);
    let plumbing = this._repoById.get(id);
    if (!plumbing) {
      const repo = new Repository(
        new MemRepoStorage(),
        this.trustPool,
        Repository.namespacesForType(Repository.parseId(id)[0]),
      );
      plumbing = {
        repo,
        backup: new IDBRepositoryBackup(id, repo),
        // Data repo starts inactive. Everything else starts active.
        active: !id.startsWith('/data/'),
      };
      repo.attach('NewCommit', (c: Commit) => {
        if (plumbing?.loadingFinished !== true) {
          return;
        }
        plumbing!.backup?.persistCommits([c]);
        // if (c.session === this.trustPool.currentSession.id) {
        //   plumbing!.client?.touch();
        // }
        if (!c.key || !repo.commitIsLeaf(c) || !this.repositoryReady(id)) {
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
        if (
          repo.valueForKey(c.key).scheme.namespace !== SchemeNamespace.SESSIONS
        ) {
          const mgr = this.getVertexManager(c.key);
          if (c.session !== this.trustPool.currentSession.id) {
            if (plumbing.syncFinished && mgr.hasPendingChanges) {
              mgr.commit();
            } else {
              mgr.touch();
            }
          }
          // else {
          //   mgr.touch();
          // }
        }

        // Any kind of activity needs to reset the sync timer. This causes
        // the initial sync to run at full speed, which is a desired side
        // effect.
        // if (plumbing?.syncFinished === true) {
        //   plumbing?.client?.touch();
        // }
      });
      this._repoById.set(id, plumbing);

      const [storage, resId] = Repository.parseId(id);
      if (this._syncScheduler) {
        const client = new RepoClient(
          repo,
          storage,
          resId,
          kSyncConfigClient,
          this._syncScheduler,
        );
        plumbing.client = client;
        client.on(EVENT_STATUS_CHANGED, () => {
          const status = this.status;
          if (this._prevClientStatus !== status) {
            this._prevClientStatus = status;
            this.emit('status-changed');
          }
        });
        // client.startSyncing();
      }
      // Start loading this repository to memory
      this.loadRepository(id);
    }
    return plumbing;
  }

  getSysDir(): Repository<MemRepoStorage> {
    return this.repository(Repository.id('sys', 'dir'));
  }

  repository(id: string): Repository<MemRepoStorage> {
    this.loadRepository(id);
    return this.plumbingForRepository(id).repo;
  }

  client(repoId: string): RepoClient<MemRepoStorage> | undefined {
    return this.plumbingForRepository(repoId).client;
  }

  repositoryReady(id: string | undefined): boolean {
    if (!id) {
      return false;
    }
    id = Repository.normalizeId(id);
    const plumbing = this.plumbingForRepository(id);
    return (
      plumbing?.loadedLocalContents === true || plumbing?.syncFinished === true
    );
  }

  /**
   * When creating a new repository and immediately populating it, it's
   * sometimes needed to forcefully mark it ready and wait for sync to pick
   * things up later.
   */
  markRepositoryReady(id: string | undefined): void {
    if (!id) {
      return;
    }
    id = Repository.normalizeId(id);
    this.prepareRepositoryForUI(id);
    const plumbing = this.plumbingForRepository(id);
    plumbing.loadingFinished = true;
    plumbing.syncFinished = true;
  }

  repositoryForKey(
    key: string,
  ): [string | undefined, Repository<MemRepoStorage> | undefined] {
    for (const [id, { repo }] of this._repoById) {
      if (repo.hasKey(key)) {
        return [id, repo];
      }
    }
    return [undefined, undefined];
  }

  repositoryIsActive(id: string): boolean {
    return this._repoById.get(id)?.active === true;
  }

  repositoryFinishedLoading(id: string): boolean {
    return this.plumbingForRepository(id).loadingFinished === true;
  }

  setRepositoryIsActive(id: string, flag: boolean): void {
    id = Repository.normalizeId(id);
    if (flag) {
      this.plumbingForRepository(id).active = true;
      this.loadRepository(id);
    } else {
      if (this._repoById.has(id)) {
        this._repoById.get(id)!.active = false;
      }
    }
  }

  *keys(): Generator<string> {
    for (const { repo } of this._repoById.values()) {
      for (const k of repo.keys()) {
        yield k;
      }
    }
  }

  keyInGroup(key: string): boolean {
    return this.hasVertex(key);
  }

  vertexManagers(): Iterable<VertexManager> {
    return this._vertManagers.values();
  }

  sharedQuery<T extends SharedQueryName>(name: T): SharedQueryType<T> {
    return this.sharedQueriesManager[name] as SharedQueryType<T>;
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

  getVertex<T extends Vertex>(key: string): T;
  getVertex<T extends Vertex>(key: VertexId<T>): T;
  getVertex<T extends Vertex>(key: VertexId<T>): T {
    return this.getVertexManager<T>(VertexIdGetKey(key)).getVertexProxy();
  }

  createVertex<T extends Vertex>(
    namespace: SchemeNamespace,
    initialData: CoreObject,
    key?: string,
    local = false,
  ): T {
    return this._createVertIfNeeded<T>(
      key || uniqueId(),
      namespace,
      initialData,
      local,
    ).getVertexProxy();
  }

  createVertices<T extends Vertex>(vInfos: CreateVertexInfo[]): T[] {
    const vManagers: VertexManager<T>[] = [];
    for (const vInfo of vInfos) {
      let mgr = this._vertManagers.get(vInfo.key!);
      if (mgr === undefined) {
        const record = new Record({
          scheme: SchemeManager.instance.getScheme(vInfo.namespace)!,
          data: vInfo.initialData!,
        });
        mgr = new VertexManager(this, vInfo.key!, record);
      }

      vManagers.push(mgr as VertexManager<T>);
    }
    for (const mgr of vManagers) {
      this._setupVertexManager(mgr);
    }
    const vertices = vManagers.map((v) => v.getVertexProxy());
    return vertices;
  }

  getVertexManager<V extends Vertex = Vertex>(key: string): VertexManager<V>;

  getVertexManager<V extends Vertex = Vertex>(
    key: VertexId<V>,
  ): VertexManager<V>;

  getVertexManager<V extends Vertex = Vertex>(
    key: VertexId<V>,
  ): VertexManager<V> {
    return this._createVertIfNeeded<V>(VertexIdGetKey(key));
  }

  query<
    IT extends Vertex = Vertex,
    OT extends IT = IT,
    GT extends CoreValue = CoreValue,
  >(options: QueryOptions<IT, OT, GT>): Query<IT, OT, GT> {
    const name = options.name;
    if (typeof name === 'undefined') {
      return new Query(options);
    }
    let [prevOpts, query] = this._openQueries.get(name) || [];
    if (!query || !coreValueEquals(options, prevOpts)) {
      query = new Query(options) as unknown as Query;
      this._openQueries.set(name, [options as unknown as QueryOptions, query]);
    }
    return query as unknown as Query<IT, OT, GT>;
  }

  builtinVertexKeys(): string[] {
    const rootKey = this.rootKey;
    return [
      'ViewGlobal',
      'ViewTasks',
      'ViewNotes',
      'ViewOverview',
      'ViewWsSettings',
      `${rootKey}-ws`,
    ];
  }

  private _createVertIfNeeded<V extends Vertex = Vertex>(
    key: string,
    ns?: SchemeNamespace,
    initialData?: CoreObject,
    local = false,
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
      mgr = new VertexManager(this, key, record, local);
      this._vertManagers.set(key, mgr);
      this._setupVertexManager(mgr);
    } else if (mgr.scheme.isNull && initialData && ns) {
      const scheme = SchemeManager.instance.getScheme(ns);
      assert(scheme !== undefined);
      const record = new Record({
        scheme: scheme,
        data: initialData!,
      });
      mgr.record = record;
    }
    return mgr as VertexManager<V>;
  }

  private _setupVertexManager(mgr: VertexManager): void {
    const key = mgr.key;
    mgr.attach(
      EVENT_DID_CHANGE,
      (pack: MutationPack, refsChange: RefsChange, RefsChange: RefsChange) =>
        this._vertexDidChange(key, pack, refsChange),
    );
    // mgr.on(EVENT_CRITICAL_ERROR, () => this.emit(EVENT_CRITICAL_ERROR));
    const session = this.trustPool.currentSession;
    mgr.reportInitialFields(
      mgr.repository?.headForKey(mgr.key)?.session === session.id,
    );
  }

  private _vertexDidChange(
    key: string,
    pack: MutationPack,
    refsChange: RefsChange,
  ): void {
    const pendingMutations = this._pendingMutations;
    pack = mutationPackAppend(pendingMutations.get(key), pack);
    pendingMutations.set(key, pack);
    this._processPendingMutationsTimer.schedule();
    // this.emit(EVENT_VERTEX_DID_CHANGE, key, pack, refsChange);
    // this.emit(EVENT_VERTEX_CHANGED, key, pack, refsChange);
  }

  private _processPendingMutations(): void {
    if (this._pendingMutations.size > 0) {
      const mutations: [VertexManager, MutationPack][] = new Array(
        this._pendingMutations.size,
      );
      let i = 0;
      for (const [key, mut] of this._pendingMutations) {
        mutations[i++] = [
          this.getVertexManager(key),
          mutationPackOptimize(mut),
        ];
      }
      const pendingMutations = Array.from(this._pendingMutations.entries());
      this._pendingMutations.clear();

      //Send mutations to index/query/undo ...
      this._undoManager.update(mutations);

      this._executedFieldTriggers.clear();
      for (const [key, pack] of pendingMutations) {
        this.emit('vertex-changed', key, pack);
      }
    }
  }

  fieldTriggerHasExecuted(key: string, fieldName: string): boolean {
    const fields = this._executedFieldTriggers.get(key);
    if (!fields) {
      return false;
    }
    return fields.includes(fieldName);
  }

  markFieldTriggerExecuted(key: string, fieldName: string): void {
    const fields = this._executedFieldTriggers.get(key);
    if (!fields) {
      this._executedFieldTriggers.set(key, [fieldName]);
    } else {
      if (!fields.includes(fieldName)) {
        fields.push(fieldName);
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
    excludeNs: string[] = [],
    editRecord: (r: Record) => void = () => {},
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
    local: boolean,
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
      mgr.scheduleCommitIfNeeded();
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
