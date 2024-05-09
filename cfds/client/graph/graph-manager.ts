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
import {
  MicroTaskTimer,
  NextEventLoopCycleTimer,
  SimpleTimer,
  Timer,
} from '../../../base/timer.ts';
import { CoroutineTimer } from '../../../base/coroutine-timer.ts';
import { CoroutineScheduler } from '../../../base/coroutine.ts';
import { JSONObject, ReadonlyJSONObject } from '../../../base/interfaces.ts';
import { unionIter } from '../../../base/set.ts';
import { kDayMs } from '../../../base/date.ts';
import {
  SharedQueriesManager,
  SharedQueryName,
  SharedQueryType,
} from './shared-queries.ts';
import { VertexSource, VertexSourceEvent } from './vertex-source.ts';
import { AdjacencyList, SimpleAdjacencyList } from './adj-list.ts';
import { MemRepoStorage, Repository } from '../../../repo/repo.ts';
import { Commit, commitContentsIsRecord } from '../../../repo/commit.ts';
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
import { slices } from '../../../base/array.ts';
import { OrderedMap } from '../../../base/collections/orderedmap.ts';
import { downloadJSON } from '../../../base/browser.ts';
import { getOrganizationId } from '../../../net/rest-api.ts';
import * as SetUtils from '../../../base/set.ts';

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

export interface OrganizationStats extends JSONObject {
  assigneeChange: number;
  tagChange: number;
  dueDateChange: number;
  pinChange: number;
  createNote: number;
  createTask: number;
  createSubtask: number;
  createTag: number;
}

export class GraphManager
  extends Emitter<VertexSourceEvent | 'status-changed'>
  implements VertexSource
{
  readonly sharedQueriesManager: SharedQueriesManager;
  private readonly _trustPool: TrustPool;
  private readonly _adjList: AdjacencyList;
  private readonly _vertManagers: Dictionary<string, VertexManager>;
  private readonly _pendingMutations: OrderedMap<string, MutationPack>;
  private readonly _undoManager: UndoManager;
  private readonly _processPendingMutationsTimer: Timer;
  private readonly _executedFieldTriggers: Map<string, string[]>;
  private readonly _repoById: Dictionary<string, RepositoryPlumbing>;
  private readonly _openQueries: HashMap<string, [QueryOptions, Query]>;
  private readonly _syncScheduler: SyncScheduler | undefined;
  private readonly _reportedInitialMutations: Set<string>;
  private _prevClientStatus: ClientStatus = 'offline';

  constructor(trustPool: TrustPool, baseServerUrl?: string) {
    super(undefined, true);
    this._trustPool = trustPool;
    this._adjList = new SimpleAdjacencyList();
    this._vertManagers = new Map();
    this._pendingMutations = new OrderedMap();
    // this._processPendingMutationsTimer = new MicroTaskTimer(() =>
    //   this._processPendingMutations(),
    // );
    this._processPendingMutationsTimer = new CoroutineTimer(
      CoroutineScheduler.sharedScheduler(),
      () => this._processPendingMutations(),
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
        getOrganizationId(),
      );
    }
    this._reportedInitialMutations = new Set();

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
    for (const [repoId, { client }] of this._repoById) {
      const [storage, id] = Repository.parseId(repoId);
      // Hide events status from UI
      if (storage === 'events') {
        continue;
      }
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

  *repositories(): Generator<[string, Repository<MemRepoStorage>]> {
    for (const [key, plumbing] of this._repoById) {
      yield [key, plumbing.repo];
    }
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
          const commits = await backup.loadCommits(id);
          if (commits instanceof Array) {
            repo.persistVerifiedCommits(commits);
          } else {
            console.log(`Unexpected IDB result: ${commits}`);
          }
        } else {
          console.log(`Backup disabled for repo: ${id}`);
        }
        // Load all keys from this repo
        await CoroutineScheduler.sharedScheduler().map(
          slices(repo.keys(), 10),
          (keys) => {
            for (const k of keys) {
              this.getVertexManager(k).touch();
            }
          },
        );
        // for (const key of repo.keys()) {
        //   this.getVertexManager(key).touch();
        // }
        plumbing.active = true;
        plumbing.loadingFinished = true;
        const numberOfCommits = repo.numberOfCommits();

        if (
          (id === Repository.sysDirId &&
            this.hasVertex(this.rootKey) &&
            this.getRootVertexManager().scheme.namespace ===
              SchemeNamespace.USERS) ||
          (id !== Repository.sysDirId && numberOfCommits > 0)
        ) {
          plumbing.loadedLocalContents = true;
          if (client) {
            client.ready = true;
            client.startSyncing();
          }
        }
        if (Repository.parseId(id)[0] === 'events') {
          this.syncRepository(id);
        }
      },
    );
    return plumbing.loadingPromise;
  }

  async syncRepository(id: string): Promise<void> {
    return MultiSerialScheduler.get('RepoSync').run(async () => {
      const plumbing = this.plumbingForRepository(id);
      const client = plumbing.client;
      await this.loadRepository(id);
      if (client && client.isOnline) {
        await client.sync();
        // Load all keys from this repo
        await CoroutineScheduler.sharedScheduler().map(
          slices(plumbing.repo.keys(), 10),
          (keys) => {
            for (const k of keys) {
              this.getVertexManager(k).touch();
            }
          },
        );
        // for (const key of plumbing.repo.keys()) {
        //   this.getVertexManager(key).touch();
        // }
        plumbing.repo.allowMerge = true;
        plumbing.syncFinished = true;
        client.ready = true;
        client.startSyncing();
      }
    });
  }

  startSyncing(repoId: string): void {
    this.plumbingForRepository(repoId).client?.startSyncing();
  }

  stopSyncing(repoId: string): void {
    this.plumbingForRepository(repoId).client?.stopSyncing();
  }

  async prepareRepositoryForUI(repoId: string): Promise<void> {
    await this.loadRepository(repoId);
    const plumbing = this.plumbingForRepository(repoId);

    if (!plumbing.syncFinished) {
      if (plumbing.loadedLocalContents) {
        this.syncRepository(repoId).finally(() => this.startSyncing(repoId));
      } else {
        await this.syncRepository(repoId);
        this.startSyncing(repoId);
      }
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
        undefined,
        undefined,
      );
      repo.allowMerge = false;
      plumbing = {
        repo,
        backup: new IDBRepositoryBackup(`${getOrganizationId()}:${id}`, repo),
        // Data repo starts inactive. Everything else starts active.
        active: !id.startsWith('/data/'),
      };
      repo.attach('NewCommit', (c: Commit) => {
        if (plumbing?.loadingFinished !== true) {
          return;
        }
        plumbing!.backup?.persistCommits([c]);
        const repoReady = this.repositoryReady(id);
        if (repoReady) {
          plumbing!.client?.touch();
        }
        if (!c.key /*|| !repo.commitIsLeaf(c)*/ || !repoReady) {
          return;
        }
        if (c.createdLocally) {
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
        const namespace = repo.valueForKey(c.key).scheme.namespace;
        if (
          namespace !== SchemeNamespace.SESSIONS &&
          namespace !== SchemeNamespace.EVENTS
        ) {
          const mgr = this.getVertexManager(c.key);
          // if (
          //   c.session !== this.trustPool.currentSession.id ||
          //   c.parents.length > 1
          // ) {
          if (plumbing.syncFinished && mgr.hasPendingChanges) {
            mgr.commit();
          } else {
            mgr.touch();
          }
          // }
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
          getOrganizationId(),
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
      plumbing?.syncFinished === true || plumbing?.loadedLocalContents === true
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
      // 'ViewGlobal',
      // 'ViewTasks',
      // 'ViewNotes',
      // 'ViewOverview',
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
      let record =
        scheme !== undefined
          ? new Record({
              scheme: scheme,
              data: initialData!,
            })
          : undefined;
      if (!record) {
        const repo = this.repositoryForKey(key)[1];
        if (repo) {
          record = repo.valueForKey(key);
        }
      }
      // A lot of places call this method to blindly initialize keys. Some keys,
      // however, have no meaningful representation in the graph, and thus are
      // skipped in a graceful way that won't break the base assumptions of the
      // caller.
      if (
        record &&
        [(SchemeNamespace.SESSIONS, SchemeNamespace.EVENTS)].includes(
          record.scheme.namespace,
        )
      ) {
        return this.getRootVertexManager();
      }
      mgr = new VertexManager(
        this,
        key,
        initialData ? record : undefined,
        local,
      );
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
    mgr.attach(EVENT_DID_CHANGE, (pack: MutationPack) =>
      this._vertexDidChange(key, pack),
    );
    // mgr.on(EVENT_CRITICAL_ERROR, () => this.emit(EVENT_CRITICAL_ERROR));
    const session = this.trustPool.currentSession;
    new MicroTaskTimer(() =>
      mgr.reportInitialFields(
        mgr.repository?.headForKey(mgr.key)?.session === session.id,
      ),
    ).schedule();
  }

  private _vertexDidChange(key: string, pack: MutationPack): void {
    const pendingMutations = this._pendingMutations;
    pack = mutationPackAppend(pendingMutations.get(key), pack);
    pendingMutations.set(key, pack);
    this._processPendingMutationsTimer.schedule();
  }

  private _processPendingMutations(): void {
    if (!this.rootKey) {
      return;
    }
    if (this._pendingMutations.size > 0) {
      const batchSize = 100;
      const creationMutations: [VertexManager, MutationPack][] = [];
      const editMutations: [VertexManager, MutationPack][] = [];
      // const mutations: [VertexManager, MutationPack][] = [];
      for (const [key, pack] of this._pendingMutations) {
        if (creationMutations.length >= batchSize) {
          break;
        }
        if (!this._reportedInitialMutations.has(key)) {
          creationMutations.push([this.getVertexManager(key), pack]);
          this._reportedInitialMutations.add(key);
        }
      }
      creationMutations.forEach(([mgr]) =>
        this._pendingMutations.delete(mgr.key),
      );
      for (const [key, pack] of this._pendingMutations) {
        if (editMutations.length >= batchSize) {
          break;
        }
        editMutations.push([this.getVertexManager(key), pack]);
      }
      editMutations.forEach(([mgr]) => this._pendingMutations.delete(mgr.key));
      // for (let i = 0; i < batchSize; ++i) {
      //   const key = this._pendingMutations.startKey;
      //   if (!key) {
      //     break;
      //   }
      //   const mut = this._pendingMutations.get(key);
      //   mutations[i] = [this.getVertexManager(key), mutationPackOptimize(mut)];
      //   this._pendingMutations.delete(key);
      // }

      //Send mutations to index/query/undo ...
      this._undoManager.update(creationMutations);
      if (editMutations.length > 0) {
        this._undoManager.update(editMutations);
      }

      this._executedFieldTriggers.clear();
      for (const [mgr, pack] of creationMutations) {
        this.emit('vertex-changed', mgr.key, pack);
      }
      for (const [mgr, pack] of editMutations) {
        this.emit('vertex-changed', mgr.key, pack);
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

  downloadOrgStats(days = 1): void {
    const startTs = Date.now() - kDayMs * days;
    const stats = new Map<string, OrganizationStats>();
    const sysDir = this.getSysDir();

    for (const [repoId, repo] of this.repositories()) {
      if (Repository.parseId(repoId)[0] !== 'data') {
        continue;
      }
      for (const key of repo.keys()) {
        if (repo.valueForKey(key).scheme.namespace === SchemeNamespace.NOTES) {
          for (const c of repo.commitsForKey(key)) {
            if (c.timestamp.getTime() < startTs || c.parents.length > 1) {
              continue;
            }
            const session = this.trustPool.getSession(c.session);
            if (!session) {
              continue;
            }
            assert(session.owner !== undefined);
            const userRecord = sysDir.valueForKey(session.owner);
            const domain = userRecord.has('email')
              ? userRecord.get<string>('email')!.split('@')[1]
              : 'unknown';
            let domainStats = stats.get(domain);
            if (!domainStats) {
              domainStats = {
                assigneeChange: 0,
                tagChange: 0,
                dueDateChange: 0,
                pinChange: 0,
                createNote: 0,
                createTask: 0,
                createSubtask: 0,
                createTag: 0,
              };
              stats.set(domain, domainStats);
            }
            if (c.parents.length === 0) {
              if (!commitContentsIsRecord(c.contents)) {
                continue;
              }
            }
            const changedFields = repo.changedFieldsInCommit(c);
            if (changedFields?.includes('assignees')) {
              ++domainStats.assigneeChange;
            }
            if (changedFields?.includes('tags')) {
              ++domainStats.tagChange;
            }
            if (changedFields?.includes('dueDate')) {
              ++domainStats.dueDateChange;
            }
            if (changedFields?.includes('pinnedBy')) {
              ++domainStats.pinChange;
            }
          }
        }
      }
    }

    const result: JSONObject = {};
    for (const [k, v] of stats) {
      result[k] = v;
    }
    downloadJSON('stats.json', result);
  }

  revertAllKeysToBefore(ts: number): void {
    for (const [_repoId, repo] of this.repositories()) {
      repo.revertAllKeysToBefore(ts);
    }
  }

  listMissingWorkspaces(names: Iterable<string>): string[] {
    this.sharedQuery('workspaces').map((ws) => ws.name);
    return Array.from(
      SetUtils.subtract(
        Array.from(names).map((n) => normalizeWsName(n)),
        this.sharedQuery('workspaces').map((ws) => normalizeWsName(ws.name)),
      ),
    );
  }
}

function normalizeWsName(name: string): string {
  name = name.trim();
  while (name[0] === '"') {
    name = name.substring(1);
  }
  while (name[name.length - 1] === '"') {
    name = name.substring(0, name.length - 1);
  }
  return name;
}
