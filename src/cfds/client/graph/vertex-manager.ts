import EventEmitter from 'eventemitter3';
import { NS_NOTES, Record } from '../..';
import { DiffSyncState, Edit } from '../../base/ds-state';
import { Scheme } from '../../base/scheme';
import {
  Code,
  ErrorType,
  ServerError,
  typeFromCode,
} from '../../server/errors';
import { CacheStatus, GraphManager } from './graph-manager';
import {
  MutationPack,
  mutationPackIter,
  mutationPackAppend,
  mutationPackIsEmpty,
  mutationPackOptimize,
} from './mutations';
import { RichText } from '../../richtext/tree';
import {
  Comparable,
  CoreObject,
  CoreValue,
  coreValueCompare,
  coreValueEquals,
  coreValueClone,
  Equatable,
} from '../../core-types';
import vertexBuilder from './vertices/vertex-builder';
import {
  BaseDynamicTimer,
  EaseInOutSineTimer,
  NextEventLoopCycleTimer,
  SimpleTimer,
} from '../timer';
import { Request, Response } from '../net/socket';
import { ListResponse, RequestCommand } from '../../server/types';
import { VertexSnapshot } from './types';
import Severity from '@ovvio/base/lib/logger/severity';
import { PointerValue, projectPointers } from '../../richtext/flat-rep';
import { ValueType } from '../../base/types';
import { CacheData } from '../client-cache';
import { Logger, Utils } from '@ovvio/base';
import { assert, EnvVars, randomInt } from '@ovvio/base/lib/utils';
import { delay } from '@ovvio/base/lib/utils/time';
import { extractFieldRefs, kNoRefsValue, Vertex, VertexConfig } from './vertex';
import { kSharedSyncScheduler } from './sync-scheduler';

const K_SYNC_FREQ_MIN_MS = 200;
const K_SYNC_FREQ_MAX_MS = 2 * 1000;
const K_SYNC_TOTAL_DUR_MS = 10 * 1000;

export const K_VERT_DEPTH = 'depth';

const WINDOW_DEBUG_TRACE = '__vertex_trace';

export type Edge = [key: string, fieldName: string];

export interface RefsChange {
  added: Edge[];
  removed: Edge[];
}

/**
 * Fired after a vertex has changed any of its values.
 *
 * @param changes (MutationPack): The list of mutations that'd been applied.
 */
export const EVENT_DID_CHANGE = 'did-change';

/**
 * Fired after a vertex receives a critical error, like bad request error response
 */
export const EVENT_CRITICAL_ERROR = 'critical-error';

export interface VertexBuilder {
  (
    manager: VertexManager,
    record: Record,
    prevVertex: Vertex | undefined,
    config: VertexConfig | undefined
  ): Vertex;
}

interface DynamicFieldsSnapshot {
  readonly isLoading: boolean;
  readonly hasPendingChanges: boolean;
  readonly errorCode: number | undefined;
  readonly isLocal: boolean;
}

let gVertexBuilder: VertexBuilder = vertexBuilder;

export class VertexManager<V extends Vertex = Vertex>
  extends EventEmitter
  implements Comparable<VertexManager>, Equatable<VertexManager>
{
  private readonly _graph: GraphManager;
  private readonly _key: string;
  private readonly _syncState: DiffSyncState;
  private readonly _discoveredBy: string | undefined;
  private readonly _vertexConfig: VertexConfig;
  private _syncTimer: BaseDynamicTimer;
  private _errorCode: number | undefined;
  private _vertex!: Vertex;
  private _revocableProxy?: { proxy: Vertex; revoke: () => void };
  private _syncActive: boolean;
  private _listCursor: number | undefined;
  private _inCriticalError = false;
  private _cacheLoaded = false;

  static setVertexBuilder(f: VertexBuilder): void {
    gVertexBuilder = f;
  }

  constructor(
    graph: GraphManager,
    key: string,
    initialState?: Record,
    discoveredBy?: string,
    local?: boolean
  ) {
    super();
    this._graph = graph;
    this._key = key;
    this._syncState = new DiffSyncState(true);
    this._syncTimer = new EaseInOutSineTimer(
      K_SYNC_FREQ_MIN_MS,
      K_SYNC_FREQ_MAX_MS,
      K_SYNC_TOTAL_DUR_MS,
      () => {
        this.scheduleSync();
      },
      false,
      'VertexManager: sync timer'
    );
    this._syncActive = false;
    this._discoveredBy = discoveredBy;
    this._vertexConfig = {
      isLocal: local === true,
    };
    if (initialState) {
      this._syncState.setState(initialState.clone(), Record.nullRecord());
    }
  }

  /********************************/
  /********** Public API **********/
  /********************************/

  /**
   * Returns the Client of the RecordState.
   */
  get graph(): GraphManager {
    return this._graph;
  }

  /**
   * Returns the key this RecordState manages.
   */
  get key(): string {
    return this._key;
  }

  /**
   * Returns the last error received from the server, or undefined if no error
   * had occurred.
   * See @ovvio/cfds/server/errors.js for possible error codes. The UI layer
   * is expected to handle ACCESS_DENIED and NOT_FOUND, and can safely ignore
   * other errors.
   */
  get errorCode(): number | undefined {
    return this._errorCode;
  }

  /**
   * Returns whether the vertex managed by this manager is a null record.
   * You must set a scheme for the record (using update()) before editing
   * the actual data fields.
   */
  get isNull(): boolean {
    return this._syncState.wc.isNull;
  }

  /**
   * Returns whether this manager's vertex is currently being loaded.
   */
  get isLoading(): boolean {
    if (this.isDeleted) {
      return false;
    }

    if (!this.graph.cacheLoaded) {
      return true;
    }

    if (
      this.graph.cacheStatus === CacheStatus.NoCache &&
      this.shouldList() &&
      this._listCursor === undefined
    ) {
      return true;
    }

    if (
      !this.isNull ||
      (this.errorCode !== undefined &&
        typeFromCode(this.errorCode) === ErrorType.NoAccess)
    ) {
      return false;
    }

    if (this.isRoot) {
      return true;
    }
    // If we have an in-edge while we're null, it must be what caused us to load
    // as opposed to being just created
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const edge of this.inEdges()) {
      return true;
    }

    return this._discoveredBy !== undefined;
  }

  /**
   * Returns whether this record state has local edits that have yet been saved
   * on the server.
   */
  get hasPendingChanges(): boolean {
    return this._syncState.hasUnSyncedChanges;
  }

  get inCriticalError(): boolean {
    return this._inCriticalError;
  }

  get isRoot(): boolean {
    return this.graph.rootKey === this.key;
  }

  get isLocal(): boolean {
    return this.getVertex().isLocal;
  }

  get namespace(): string {
    return this._syncState.wc.scheme.namespace;
  }

  get scheme(): Scheme {
    return this._syncState.wc.scheme;
  }

  set scheme(scheme: Scheme) {
    const wc = this._syncState.wc;
    if (scheme.isEqual(wc.scheme)) {
      return;
    }
    wc.upgradeScheme(scheme);
    this.rebuildVertex();
  }

  get displayName(): string {
    return (this.namespace ? this.namespace + '/' : '') + this.key;
  }

  get isDeleted(): boolean {
    return (
      this.scheme.hasField('isDeleted') &&
      this.record.get('isDeleted', 0) !== 0 &&
      this.getVertexProxy().isDeleted !== 0
    );
  }

  get syncActive(): boolean {
    return this._syncActive;
  }

  get cacheLoaded(): boolean {
    return this._cacheLoaded;
  }

  getVertexProxy<T extends Vertex = V>(): T {
    if (this._vertex === undefined) {
      this.rebuildVertex();
    }
    return this._revocableProxy!.proxy as T;
  }

  private getVertex(): V {
    if (this._vertex === undefined) {
      this.rebuildVertex();
    }
    return this._vertex as V;
  }

  *inEdges(fieldName?: string): Generator<[VertexManager, string]> {
    const graph = this.graph;
    for (const edge of graph.adjacencyList.inEdges(this.key, fieldName)) {
      yield [graph.getVertexManager(edge.vertex), edge.fieldName];
    }
  }

  *outEdges(fieldName?: string): Generator<[VertexManager, string]> {
    const graph = this.graph;
    for (const edge of graph.adjacencyList.outEdges(this.key, fieldName)) {
      yield [graph.getVertexManager(edge.vertex), edge.fieldName];
    }
  }

  scheduleSync(): void {
    kSharedSyncScheduler.sync(this);
  }

  async _sync(): Promise<void> {
    assert(this.cacheLoaded);
    if (this._syncActive || this._inCriticalError || this.isLocal) {
      return;
    }
    const socket = this.graph.socket;
    if (socket === undefined || !socket.isOnline) {
      new SimpleTimer(
        500,
        false,
        () => {
          this.scheduleSync();
        },
        `Vertex: ${this._key} retry sync - Socket Offline`
      ).schedule();
      return;
    }
    // Lock diff
    this._syncActive = true;
    // Build request
    const shouldList = this.shouldList();
    const syncState = this._syncState;
    const shadow = syncState.shadow;
    let req: Request;
    if (this.isNull) {
      req = {
        cmd: RequestCommand.GET,
        list: shouldList,
      };
      if (shadow.serverVersion > 0) {
        req.version = shadow.serverVersion;
        req.checksum = shadow.checksum;
      }
    } else {
      syncState.markLastEditAsRetry();
      const edits = syncState.captureDiff();
      req = {
        cmd: RequestCommand.SYNC,
        list: shouldList,
        edits: edits,
        version: shadow.serverVersion,
        checksum:
          edits.length > 0 ? edits[0].srcChecksum : syncState.shadow.checksum,
      };
    }
    if (shouldList && this._listCursor !== undefined) {
      req.cursor = this._listCursor;
    }

    this.traceLog('Sending sync request', req);
    // Send our request and process response
    try {
      const resp = await socket.send(this.key, req);
      if (resp.error && typeFromCode(resp.error.code) !== ErrorType.NoAccess) {
        this.log(Severity.WARN, 'Received sync response', resp);
      } else {
        this.traceLog('Received sync response', resp);
      }

      const dynamicFields = this.captureDynamicFields();
      let mutations = this.processSyncResponse(resp);
      this.vertexDidMutate(mutations, dynamicFields);

      this._syncActive = false;
      if (this.hasPendingChanges || this.isLoading) {
        this.scheduleSync();
      }
    } catch (err: any) {
      this.log(Severity.DEBUG, `Sync Network error: ${err}`);
      this._syncActive = false;
      // Try again as this sync will eventually need to be issued
      new NextEventLoopCycleTimer(() => this.scheduleSync()).schedule();
    }
  }

  private processSyncResponse(resp: Response): MutationPack {
    if (resp.list) {
      // Handle list response
      this.processListResponse(resp.list);
    }
    const shouldList = this.shouldList();
    this._syncTimer.continuous = shouldList;
    if (shouldList) {
      this._syncTimer.schedule();
    }
    let mutations: MutationPack = undefined;
    // Handle error
    mutations = this.updateError(resp.error, mutations);
    // Merge full remote state
    if (resp.state !== undefined) {
      mutations = this.mergeRemoteState(resp.state.wc, mutations);
    }
    // Merge remote edits
    if (resp.edits) {
      assert(resp.edits !== undefined);
      mutations = this.mergeRemoteEdits(
        resp.edits!,
        resp.serverVersion,
        mutations
      );
    }
    return mutations;
  }

  private updateError(
    err: ServerError | undefined,
    outMutations: MutationPack
  ): MutationPack {
    const errorCode = err?.code;
    if (this._errorCode !== undefined && errorCode === undefined) {
      //Error removed
      outMutations = mutationPackAppend(outMutations, [
        'errorCode',
        false,
        this._errorCode,
      ]);
      this._errorCode = undefined;
    } else if (errorCode === Code.NotFound || errorCode === Code.AccessDenied) {
      if (errorCode !== this._errorCode) {
        outMutations = mutationPackAppend(outMutations, [
          'errorCode',
          false,
          this._errorCode,
        ]);
        this._errorCode = errorCode;

        const cache = this.graph.cache;
        if (cache) {
          cache.persistError(this._key, errorCode).then(saved => {
            if (saved) {
              this.traceLog(`Cached. updated errorCode: ${errorCode}`);
            }
          });
        }
      }
    } else if (errorCode !== undefined) {
      if (errorCode === Code.BadRequest) {
        this.markInCriticalError();
      }
      // Test: Instead of polling, count on list response to trigger a sync
      // else {
      //   // Transient error. Keep quite and try again
      //   new SimpleTimer(100, false, () => {
      //     this.sync();
      //   }).schedule();
      // }
    }
    return outMutations;
  }

  private markInCriticalError() {
    if (!this._inCriticalError) {
      this._inCriticalError = true;
      this.emit(EVENT_CRITICAL_ERROR);
      this.vertexDidMutate(['inCriticalError', true, false]);
    }
  }

  private updateCache(): void {
    // Never persist local records
    if (this.isLocal) {
      return;
    }
    // If we have un-synced changes than our shadow is dirty an must not be
    // persisted. Skipping this check will throw the next run out of sync with
    // the server.
    if (this._syncState.pendingEdits.length > 0) {
      return;
    }
    const cache = this.graph.cache;
    if (undefined !== cache) {
      const didList = this._listCursor !== undefined;
      cache
        .persistVersion(
          this._key,
          this._syncState.shadow,
          didList,
          this.isDeleted
        )
        .then(saved => {
          if (saved) {
            this.traceLog(
              `Version Cached. version: ${this._syncState.shadow.serverVersion}, didList: ${didList}`
            );
          }
        });
    }
  }

  private processListResponse(resp: ListResponse): void {
    const isFirstList = this._listCursor === undefined;
    this._listCursor = resp.cursor;
    const graph = this.graph;
    for (const lr of resp.result) {
      const mgr = graph.getVertexManager(lr.key, this.key); // Ensure the vert exists
      if (lr.hotFlag) {
        mgr.onRemoteEditDetected(); // Also mark as hot if needed
      } else {
        // if (isFirstList) {
        //   // Spread out the initial sync so we don't block the UI
        //   mgr._syncOnFirstListResponse();
        // } else {
        mgr.scheduleSync(); // Single sync if the target vertex is cold
        // }
      }
    }
    if (resp.result.length > 0) {
      this.onRemoteEditDetected();
    }
  }

  private mergeRemoteEdits(
    edits: Edit[],
    serverVersion: number | undefined,
    outPack: MutationPack
  ): MutationPack {
    const fields = new Set<string>();
    for (const e of edits) {
      Utils.Set.update(fields, e.affectedKeys);
    }
    const vert = this.getVertex();
    for (const fieldName of fields) {
      outPack = mutationPackAppend(outPack, [
        fieldName,
        false,
        (vert as any)[fieldName],
      ]);
    }

    const syncState = this._syncState;
    const applyContext = `key: ${this._key}, editsLength: ${edits.length}, serverVersion: ${serverVersion}, shadowVersion: ${this._syncState.shadow.serverVersion}. `;

    const origShadow = syncState.shadow;
    syncState.applyEdits(edits, applyContext);

    // Project local pointers so remote edits won't mess them up
    if (edits.length > 0) {
      projectRichTextPointers(
        origShadow,
        syncState.wc,
        ptr => !this.graph.ptrFilterFunc(ptr.key)
      );
    }
    // Update our cache if possible with the latest copy from the server
    if (serverVersion !== undefined) {
      syncState.wc.serverVersion = serverVersion;
      syncState.shadow.serverVersion = serverVersion;
    }

    this.updateCache();

    if (edits.length > 0) {
      this.rebuildVertex();
    }

    return outPack;
  }

  private mergeRemoteState(
    remoteRecord: Record,
    outPack: MutationPack
  ): MutationPack {
    const syncState = this._syncState;
    const vert = this.getVertex();
    for (const fieldName of remoteRecord.keys) {
      outPack = mutationPackAppend(outPack, [
        fieldName,
        false,
        (vert as any)[fieldName],
      ]);
    }
    const origShadow = syncState.shadow;
    syncState.mergePeerRecord(remoteRecord);
    syncState.wc.serverVersion = remoteRecord.serverVersion;
    syncState.shadow.serverVersion = remoteRecord.serverVersion;
    // Project local pointers so remote edits won't mess them up
    projectRichTextPointers(
      origShadow,
      syncState.wc,
      ptr => !this.graph.ptrFilterFunc(ptr.key)
    );
    this.updateCache();
    this.rebuildVertex();
    return outPack;
  }

  private shouldList(): boolean {
    if (this.isLocal) {
      return false;
    }

    if (this.isRoot) {
      return true;
    }

    if (this.isDeleted) {
      return false;
    }

    if (
      this.isNull &&
      (this.errorCode === undefined ||
        typeFromCode(this.errorCode) !== ErrorType.NoAccess)
    ) {
      // Don't actively sync vertices that are stuck. Instead, wait for the
      // list response from the root vertex to re-sync them if needed.
      return false;
      // return this._discoveredBy === this.graph.rootKey;
    }

    const vert = this.getVertex();
    const parentVert = vert.parent;
    return parentVert !== undefined && parentVert.isRoot;
  }

  get record(): Record {
    return this._syncState.wc;
  }

  private rebuildVertex(): void {
    this._vertex = gVertexBuilder(
      this,
      this.record,
      this._vertex,
      this._vertexConfig
    );
    this.rebuildVertexProxy();
  }

  private rebuildVertexProxy<T extends Vertex>(): T {
    const handler: ProxyHandler<T> = {
      deleteProperty: (target: T, prop: string): boolean => {
        if (prop.startsWith('_')) {
          delete target[prop as keyof T];
          return true;
        }
        const dynamicFields = this.captureDynamicFields();

        const oldValue = target[prop as keyof T] as unknown as CoreValue;
        let success: boolean;
        const deleteMethodName = getDeleteMethodName(prop);
        if (typeof (target as any)[deleteMethodName] === 'function') {
          success = (target as any)[deleteMethodName]() !== false;
        } else if (this.scheme.hasField(prop)) {
          assert(
            this.scheme.isRequiredField(prop) === false,
            `Attempting to delete required field '${prop} of '${this.namespace}'`
          );
          success = target.record.delete(prop);
        } else {
          success = delete target[prop as keyof T];
        }
        if (success) {
          const mut = target.onUserUpdatedField([prop, true, oldValue]);
          this.vertexDidMutate(mut, dynamicFields);
          // Trigger sync on persistent prop updates
          if (this.scheme.hasField(prop)) {
            this.scheduleSync();
          }
        }
        return success;
      },

      set: (target: T, prop: string, value: any): boolean => {
        if (prop.startsWith('_')) {
          target[prop as keyof T] = value;
          return true;
        }
        const oldValue = target[prop as keyof T] as unknown as CoreValue;
        if (coreValueEquals(oldValue, value)) {
          return true;
        }

        const dynamicFields = this.captureDynamicFields();

        target[prop as keyof T] = value;

        const mut = target.onUserUpdatedField([prop, true, oldValue]);
        this.vertexDidMutate(mut, dynamicFields);
        // Trigger sync on persistent prop updates
        if (this.scheme.hasField(prop)) {
          this.scheduleSync();
        }
        return true;
      },
    };

    if (this._revocableProxy !== undefined) {
      this._revocableProxy.revoke();
    }
    this._revocableProxy = Proxy.revocable(this._vertex as T, handler);
    return this._revocableProxy.proxy as T;
  }

  /**
   * Called by our vertex's proxy on setter & delete operations (local edits)
   * and from the diff-sync loop (remote edits).
   *
   * @param mutations The applied mutations.
   */
  vertexDidMutate(
    mutations: MutationPack,
    dynamicFields?: DynamicFieldsSnapshot
  ): void {
    mutations = mutationPackOptimize(mutations);
    const vertex = this.getVertex();
    const addedEdges: Edge[] = [];
    const removedEdges: Edge[] = [];
    // Update our graph on ref changes
    for (const [prop, local, oldValue] of mutationPackIter(mutations)) {
      const newValue = vertex.valueForRefCalc(prop as keyof Vertex);
      if (newValue === kNoRefsValue) {
        continue;
      }
      const newRefs = extractFieldRefs(newValue, true);
      const oldRefs = extractFieldRefs(oldValue as any, true);
      if (oldRefs.size > 0 || newRefs.size > 0) {
        const graph = this.graph;
        const adjList = graph.adjacencyList;
        const addedRefs = Utils.Set.subtract(newRefs, oldRefs);
        const removedRefs = Utils.Set.subtract(oldRefs, newRefs);
        const srcKey = this.key;
        for (const dstKey of addedRefs) {
          adjList.addEdge(srcKey, dstKey, prop);
          addedEdges.push([dstKey, prop]);
        }
        for (const dstKey of removedRefs) {
          adjList.deleteEdge(srcKey, dstKey, prop);
          removedEdges.push([dstKey, prop]);
        }
      }
    }
    // Dynamic fields support
    if (dynamicFields) {
      mutations = this.mutationsForDynamicFields(mutations, dynamicFields);
    }
    if (mutationPackIsEmpty(mutations)) {
      return;
    }
    const refsChange: RefsChange = {
      added: addedEdges,
      removed: removedEdges,
    };
    // Broadcast the mutations of our vertex
    this.emit(EVENT_DID_CHANGE, mutations, refsChange);
    // Let our vertex a chance to apply side effects
    const sideEffects = vertex.didMutate(mutations);
    if (!mutationPackIsEmpty(sideEffects)) {
      this.vertexDidMutate(sideEffects);
    }
    if (this.hasPendingChanges) {
      this.scheduleSync();
    }
  }

  private captureDynamicFields(): DynamicFieldsSnapshot {
    return {
      isLoading: this.isLoading,
      hasPendingChanges: this.hasPendingChanges,
      errorCode: this.errorCode,
      isLocal: this.isLocal,
    };
  }

  private mutationsForDynamicFields(
    outMutations: MutationPack,
    snapshot: DynamicFieldsSnapshot
  ): MutationPack {
    if (snapshot.isLoading !== this.isLoading) {
      outMutations = mutationPackAppend(outMutations, [
        'isLoading',
        true,
        snapshot.isLoading,
      ]);
    }
    if (snapshot.hasPendingChanges !== this.hasPendingChanges) {
      outMutations = mutationPackAppend(outMutations, [
        'hasPendingChanges',
        true,
        snapshot.hasPendingChanges,
      ]);
    }
    if (snapshot.errorCode !== this.errorCode) {
      outMutations = mutationPackAppend(outMutations, [
        'errorCode',
        true,
        snapshot.errorCode,
      ]);
    }
    if (snapshot.isLocal !== this.isLocal) {
      outMutations = mutationPackAppend(outMutations, [
        'isLocal',
        true,
        snapshot.isLocal,
      ]);
    }
    return outMutations;
  }

  /*****************************************************
   ************* Methods for Graph Manager *************
   *****************************************************/

  getCurrentStateMutations(local: boolean): MutationPack {
    let pack: MutationPack;
    for (const fieldName of this._syncState.wc.keys) {
      pack = mutationPackAppend(pack, [fieldName, local, undefined]);
    }

    pack = mutationPackAppend(pack, ['isLoading', true, undefined]);
    pack = mutationPackAppend(pack, ['hasPendingChanges', true, undefined]);
    pack = mutationPackAppend(pack, ['errorCode', true, undefined]);
    pack = mutationPackAppend(pack, ['isLocal', true, this.isLocal]);
    return pack;
  }

  /**
   * Called after locally creating a vertex to report the initial values through
   * the mutations API.
   */
  private reportInitialFields(local: boolean): void {
    this.vertexDidMutate(this.getCurrentStateMutations(local));
  }

  updateBySnapshot(snapshot: VertexSnapshot) {
    let pack: MutationPack;
    const vertex = this.getVertex();
    let changed = false;

    const dynamicFields = this.captureDynamicFields();

    for (const fieldName in snapshot.data) {
      const oldValue = vertex[fieldName as keyof Vertex] as CoreValue;
      const oldRecValue = vertex.record.get(fieldName);
      let newRecValue = snapshot.data[fieldName];

      if (!coreValueEquals(oldRecValue, newRecValue)) {
        if (
          oldRecValue &&
          newRecValue &&
          vertex.record.scheme.getFieldType(fieldName) === ValueType.RICHTEXT_V3
        ) {
          newRecValue = projectPointers(
            oldRecValue,
            newRecValue as RichText,
            ptr => this.graph.ptrFilterFunc(ptr.key)
          );
        }
        vertex.record.set(fieldName, newRecValue);
        pack = mutationPackAppend(pack, [fieldName, true, oldValue]);
        changed = true;
      }
    }

    for (const fieldName in snapshot.local) {
      const oldValue = vertex[fieldName as keyof Vertex] as CoreValue;

      if (!coreValueEquals(oldValue, snapshot.local[fieldName])) {
        //@ts-ignore
        vertex[fieldName] = snapshot[fieldName];
        pack = mutationPackAppend(pack, [fieldName, true, oldValue]);
        changed = true;
      }
    }

    if (changed) {
      this.rebuildVertex();
      this.vertexDidMutate(pack, dynamicFields);
    }
  }

  getSnapshot(onlyFields?: string[]): VertexSnapshot {
    const vertex = this.getVertex();
    const data = vertex.cloneData(onlyFields);

    const local: CoreObject = {};

    for (const key of vertex.getLocalFields()) {
      if (onlyFields && !onlyFields.includes(key)) continue;
      local[key] = coreValueClone(
        vertex[key as keyof Vertex] as unknown as CoreValue
      );
    }

    return {
      data,
      local,
    };
  }

  // private fixDuplicateTitleBug(): void {
  //   if (this.namespace === NS_NOTES) {
  //     const title = this.record.get('title');
  //     if (title !== undefined) {
  //       this.record.set('title', fixDuplicateTitleBug(title));
  //     }
  //   }
  // }

  /**
   * Called after loading a cache entry for our vertex. This method won't be
   * called for vertices created after the initial cache load.
   *
   * @param entry The cache entry found for this vertex, or undefined if this
   *              vertex has no cache entry.
   */
  onCacheLoaded(cacheData: CacheData | undefined): void {
    this._cacheLoaded = true;
    const record = cacheData && cacheData.record;
    if (record !== undefined) {
      this._syncState.setState(record.clone(), record.clone());
    }
    if (cacheData) {
      if (cacheData.errorCode !== undefined) {
        this._errorCode = cacheData.errorCode;
      }
    }

    // this.fixDuplicateTitleBug();
    this.rebuildVertex();
    this.reportInitialFields(cacheData === undefined);

    // if (this.hasPendingChanges) {
    //   this.scheduleSync();
    // }

    // All list records need to synced after being loaded from cache. This
    // creates a waterfall effect where all vertices will be synced at least
    // once as a result of the initial list response. From this point on, only
    // vertices that have changed in some way will be synced.
    //
    // NOTE: We currently ignore deleted vertices as there's no way to un-delete
    // a record at the time of this writing.
    if (
      !this.isDeleted &&
      (this.errorCode === undefined ||
        typeFromCode(this.errorCode) !== ErrorType.NoAccess) &&
      (this.shouldList() || this.isNull)
    ) {
      this.scheduleSync();
    }
  }

  onGraphCacheLoaded(): void {
    if (!this.isLoading) {
      this.vertexDidMutate(['isLoading', true, undefined]);
    }
    if (this.isRoot) {
      this.scheduleSync();
    }
  }

  onRemoteEditDetected(): void {
    const syncTimer = this._syncTimer;
    syncTimer.unschedule();
    syncTimer.reset();
    syncTimer.schedule();
  }

  isEqual(other: VertexManager): boolean {
    return this._key === other.key;
  }

  compareTo(other: VertexManager): number {
    return coreValueCompare(this._key, other.key);
  }

  log(severity: Severity, message: string, extra?: any, err?: any) {
    Logger.log(severity, `${this.displayName}: ${message}`, extra, err);
  }

  /**
   * All Trace logs start with prefix of: ${this.namespace}/${this.key}
   * @param message
   * @param extra
   */
  traceLog(message: string, extra?: any) {
    if (Logger.isEnabled(Severity.DEBUG)) {
      let willLog = false;
      if (window !== undefined) {
        let traceVal: string[] | boolean | undefined = (window as any)[
          WINDOW_DEBUG_TRACE
        ];

        if (traceVal === undefined || traceVal === null) {
          const envTraceValue = EnvVars.getBool('CFDS_VERTEX_TRACE');
          if (!envTraceValue) {
            return;
          }
          traceVal = envTraceValue;
        }

        if (traceVal === undefined || traceVal === null) {
          return;
        }

        if (typeof traceVal === 'boolean') {
          if (traceVal) {
            willLog = true;
          }
        } else if (traceVal.includes(this._key)) {
          willLog = true;
        }
      }
      if (willLog) {
        this.log(Severity.DEBUG, message, extra);
      }
    }
  }
}

function getDeleteMethodName(prop: string): string {
  return 'clear' + prop[0].toUpperCase() + prop.substring(1);
}

function projectRichTextPointers(
  srcRec: Record,
  dstRec: Record,
  filter: (ptr: PointerValue) => boolean
): void {
  const srcScheme = srcRec.scheme;
  for (const [fieldName, type] of Object.entries(dstRec.scheme.getFields())) {
    if (
      type === ValueType.RICHTEXT_V3 &&
      srcScheme.hasField(fieldName) &&
      srcScheme.getFieldType(fieldName) === ValueType.RICHTEXT_V3
    ) {
      const srcRt: RichText | undefined = srcRec.get(fieldName);
      const dstRt: RichText | undefined = dstRec.get(fieldName);
      if (srcRt !== undefined && dstRt !== undefined) {
        dstRec.set(fieldName, projectPointers(srcRt, dstRt, filter, false));
      }
    }
  }
}
