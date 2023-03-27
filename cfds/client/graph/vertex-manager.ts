import EventEmitter from 'https://esm.sh/eventemitter3@4.0.7';
import { Record } from '../../base/record.ts';
import { Scheme } from '../../base/scheme.ts';
import { GraphManager } from './graph-manager.ts';
import {
  MutationPack,
  mutationPackIter,
  mutationPackAppend,
  mutationPackIsEmpty,
  mutationPackOptimize,
} from './mutations.ts';
import { RichText } from '../../richtext/tree.ts';
import {
  Comparable,
  CoreObject,
  CoreValue,
  coreValueCompare,
  coreValueEquals,
  coreValueClone,
  Equatable,
} from '../../../base/core-types/index.ts';
import vertexBuilder from './vertices/vertex-builder.ts';
import { SimpleTimer } from '../../../base/timer.ts';
import { VertexSnapshot } from './types.ts';
import { PointerValue, projectPointers } from '../../richtext/flat-rep.ts';
import { ValueType } from '../../base/types/index.ts';
import { assert } from '../../../base/error.ts';
import {
  extractFieldRefs,
  kNoRefsValue,
  Vertex,
  VertexConfig,
} from './vertex.ts';
import * as SetUtils from '../../../base/set.ts';
import { kRecordIdField } from '../../base/scheme-types.ts';
import { MemRepoStorage, Repository } from '../../../repo/repo.ts';
import { Dictionary, isDictionary } from '../../../base/collections/dict.ts';

export const K_VERT_DEPTH = 'depth';

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
  readonly hasPendingChanges: boolean;
  readonly isLocal: boolean;
}

let gVertexBuilder: VertexBuilder = vertexBuilder;

export class VertexManager<V extends Vertex = Vertex>
  extends EventEmitter
  implements Comparable<VertexManager>, Equatable<VertexManager>
{
  private readonly _graph: GraphManager;
  private readonly _key: string;
  private readonly _vertexConfig: VertexConfig;
  private readonly _commitDelayTimer: SimpleTimer;
  private _record: Record;
  private _vertex!: Vertex;
  private _revocableProxy?: { proxy: Vertex; revoke: () => void };

  static setVertexBuilder(f: VertexBuilder): void {
    gVertexBuilder = f;
  }

  constructor(
    graph: GraphManager,
    key: string,
    initialState?: Record,
    local?: boolean
  ) {
    super();
    this._graph = graph;
    this._key = key;
    this._vertexConfig = {
      isLocal: local === true,
    };
    this._commitDelayTimer = new SimpleTimer(300, false, () => this.commit());
    const repo = this.repository;
    this._record =
      initialState ||
      repo?.valueForKey(this.key, graph.session) ||
      Record.nullRecord();
    this.rebuildVertex();
    this.reportInitialFields(true);
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

  get record(): Record {
    return this._record;
  }

  get repositoryId(): string | undefined {
    if (this.key === this.graph.rootKey) {
      return '/sys/dir';
    }
    if (!this.record) {
      return undefined;
    }
    const id = this.record.repositoryId;
    const res = id === kRecordIdField ? this.key : id;
    assert(
      undefined !== res,
      `Failed inferring repository id for ${this._key}`
    );
    return '/data/' + res!;
  }

  get repository(): Repository<MemRepoStorage> | undefined {
    const repoId = this.repositoryId;
    return repoId ? this.graph.repository(repoId) : undefined;
  }

  /**
   * Returns whether this record state has local edits that have yet been saved
   * on the server.
   */
  get hasPendingChanges(): boolean {
    if (this.isLocal) {
      return false;
    }
    const repo = this.repository;
    if (!repo) {
      return false;
    }
    return this.record.isEqual(repo.valueForKey(this.key, this.graph.session));
  }

  get isRoot(): boolean {
    return this.graph.rootKey === this.key;
  }

  get isLocal(): boolean {
    return this.getVertex().isLocal;
  }

  get namespace(): string {
    return this.record.scheme.namespace;
  }

  get scheme(): Scheme {
    return this.record.scheme;
  }

  set scheme(scheme: Scheme) {
    const record = this.record;
    if (scheme.isEqual(record.scheme)) {
      return;
    }
    record.upgradeScheme(scheme);
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

  get vertex(): V {
    return this.getVertexProxy();
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

  /**
   * This method commits any pending local edits, and merges any pending remote
   * edits. NOP if nothing needs to be done.
   */
  commit(): void {
    if (this.isLocal) {
      return;
    }
    const repo = this.repository;
    if (!repo) {
      return;
    }
    const graph = this.graph;
    const prevRecord = this.record;
    if (repo.setValueForKey(this.key, graph.session, this.record)) {
      const newRecord = repo.valueForKey(this.key, graph.session);
      const vert = this.getVertexProxy();
      let pack: MutationPack;
      for (const fieldName of Object.keys(prevRecord.diff(newRecord, true))) {
        pack = mutationPackAppend(pack, [
          fieldName,
          (vert as any)[fieldName],
          false,
        ]);
      }
      const dynamicFields = this.captureDynamicFields();
      this._record = newRecord;
      this.rebuildVertex();
      if (!mutationPackIsEmpty(pack)) {
        this.vertexDidMutate(pack, dynamicFields);
      }
    }
  }

  scheduleCommitIfNeeded(): void {
    this._commitDelayTimer.schedule();
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
        // deno-lint-ignore no-explicit-any
        if (typeof (target as any)[deleteMethodName] === 'function') {
          // deno-lint-ignore no-explicit-any
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
            this.scheduleCommitIfNeeded();
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
        // if (this.scheme.hasField(prop)) {
        //   this.scheduleSync();
        // }
        return true;
      },

      // deno-lint-ignore no-explicit-any
      get: (target: T, prop: string | symbol): any => {
        const value = target[prop as keyof T];
        // Enable direct mutations of Set and Dictionary instances which saves
        // tons of boilerplate on the client's side.
        // TODO: Cache proxies if needed
        if (value instanceof Set) {
          const setProxy = new SetProxy(value, (oldValue) => {
            target[prop as keyof T] = setProxy._target as T[keyof T];
            this.vertexDidMutate([prop as string, true, oldValue]);
          });
          return setProxy;
        } else if (isDictionary(value)) {
          const dictProxy = new DictionaryProxy(value, (oldValue) => {
            target[prop as keyof T] = dictProxy._target as T[keyof T];
            this.vertexDidMutate([prop as string, true, oldValue as CoreValue]);
          });
          return dictProxy;
        }
        return value;
      },
    };

    if (this._revocableProxy !== undefined) {
      this._revocableProxy.revoke();
    }
    this._revocableProxy = Proxy.revocable(this._vertex as T, handler);
    return this._revocableProxy.proxy as T;
  }

  /**
   * Called whenever our vertex has been mutated for whatever reason. This
   * method is the entry point which propagates mutations information.
   *
   * @param mutations The changes that have been applied to the vertex.
   * @param dynamicFields If available, a snapshot of the dynamic fields before
   *                      the mutations where applied.
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
        const addedRefs = SetUtils.subtract(newRefs, oldRefs);
        const removedRefs = SetUtils.subtract(oldRefs, newRefs);
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
      this.scheduleCommitIfNeeded();
    }
  }

  private captureDynamicFields(): DynamicFieldsSnapshot {
    return {
      hasPendingChanges: this.hasPendingChanges,
      isLocal: this.isLocal,
    };
  }

  private mutationsForDynamicFields(
    outMutations: MutationPack,
    snapshot: DynamicFieldsSnapshot
  ): MutationPack {
    if (snapshot.hasPendingChanges !== this.hasPendingChanges) {
      outMutations = mutationPackAppend(outMutations, [
        'hasPendingChanges',
        true,
        snapshot.hasPendingChanges,
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
    for (const fieldName of this.record.keys) {
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
      const oldRecValue = vertex.record.get<RichText>(fieldName);
      let newRecValue = snapshot.data[fieldName] as RichText | undefined;

      if (!coreValueEquals(oldRecValue, newRecValue)) {
        if (
          oldRecValue &&
          newRecValue &&
          vertex.record.scheme.getFieldType(fieldName) === ValueType.RICHTEXT_V3
        ) {
          newRecValue = projectPointers(oldRecValue, newRecValue, (ptr) =>
            this.graph.ptrFilterFunc(ptr.key)
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
        //@ts-ignore // shut the f*** up
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

  isEqual(other: VertexManager): boolean {
    return this._key === other.key;
  }

  compare(other: VertexManager): number {
    return this.vertex.compare(other.vertex);
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
      const srcRt: RichText | undefined = srcRec.get<RichText>(fieldName);
      const dstRt: RichText | undefined = dstRec.get<RichText>(fieldName);
      if (srcRt !== undefined && dstRt !== undefined) {
        dstRec.set(fieldName, projectPointers(srcRt, dstRt, filter, false));
      }
    }
  }
}

type DidMutateCallback<T> = (oldValue: T) => void;

class SetProxy<T> {
  _target: Set<T>;
  private readonly _didMutateCallback: DidMutateCallback<Set<T>>;

  constructor(target: Set<T>, didMutateCallback: DidMutateCallback<Set<T>>) {
    this._target = target;
    this._didMutateCallback = didMutateCallback;
  }

  get size() {
    return this._target.size;
  }

  [Symbol.iterator]() {
    return this._target[Symbol.iterator];
  }

  add(v: T): Set<T> {
    if (!this._target.has(v)) {
      const oldValue = new Set(this._target);
      this._target.add(v);
      this._didMutateCallback(oldValue);
    }
    return this as unknown as Set<T>;
  }

  clear(): void {
    if (this._target.size > 0) {
      const oldValue = this._target;
      this._target = new Set();
      this._didMutateCallback(oldValue);
    }
  }

  delete(v: T): boolean {
    if (this._target.has(v)) {
      const oldValue = new Set(this._target);
      this._target.delete(v);
      this._didMutateCallback(oldValue);
      return true;
    }
    return false;
  }

  entries() {
    return this._target.entries();
  }

  forEach() {
    return this._target.forEach.apply(this._target, arguments as any);
  }

  has(v: T) {
    return this._target.has(v);
  }

  keys() {
    return this._target.keys();
  }

  values() {
    return this._target.values();
  }
}

class DictionaryProxy<K, V> {
  readonly _target: Dictionary<K, V>;
  private readonly _didMutateCallback: DidMutateCallback<Dictionary<K, V>>;

  constructor(
    target: Dictionary<K, V>,
    callback: DidMutateCallback<Dictionary<K, V>>
  ) {
    this._target = target;
    this._didMutateCallback = callback;
  }

  get size() {
    return this._target.size;
  }

  get(key: K) {
    return this._target.get(key);
  }

  has(key: K) {
    return this._target.has(key);
  }

  entries() {
    return this._target.entries();
  }

  keys() {
    return this._target.keys();
  }

  values() {
    return this._target.values();
  }

  set(key: K, value: V): void {
    const target = this._target;
    if (!coreValueEquals(target.get(key) as CoreValue, value as CoreValue)) {
      const oldValue = new Map(target);
      target.set(key, value);
      this._didMutateCallback(oldValue);
    }
  }

  delete(key: K): boolean {
    if (this._target.has(key)) {
      const oldValue = new Map(this._target);
      this._target.delete(key);
      this._didMutateCallback(oldValue);
      return true;
    }
    return false;
  }

  clear(): void {
    if (this._target.size > 0) {
      const oldValue = new Map(this._target);
      this._target.clear();
      this._didMutateCallback(oldValue);
    }
  }
}
