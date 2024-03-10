import { VertexManager } from './vertex-manager.ts';
import { GraphManager } from './graph-manager.ts';
import {
  Mutation,
  MutationPack,
  mutationPackAppend,
  mutationPackClone,
  mutationPackDeleteFirst,
  mutationPackGetFirst,
  mutationPackIsEmpty,
  mutationPackIter,
} from './mutations.ts';
import { extractRefs as extractRefsFromRT } from '../../richtext/composer.ts';
import { isRichText, RichText } from '../../richtext/tree.ts';
import { SchemeNamespace } from '../../base/scheme-types.ts';
import { triggerChildren, triggerCompose } from './propagation-triggers.ts';
import {
  Comparable,
  CoreObject,
  CoreValue,
  CoreValueCloneOpts,
} from '../../../base/core-types/base.ts';
import { assert, notImplemented } from '../../../base/error.ts';
import { coreValueCompare } from '../../../base/core-types/comparable.ts';
import { ValueType } from '../../base/types/index.ts';
import { isGenerator } from '../../../base/comparisons.ts';
import * as SetUtils from '../../../base/set.ts';
import {
  Dictionary,
  isDictionary,
  ReadonlyDict,
} from '../../../base/collections/dict.ts';

/**
 * A marker for VertexManager indicating a specific field contains no refs by
 * definition. This enables some optimizations in the maintenance of the graph.
 */
export const kNoRefsValue = {};

/**
 * A field trigger is a generic hook for inserting custom behavior on specific
 * field changes.
 */
export type FieldChangeTrigger<T extends Vertex> = (
  src: T,
  mutation: Mutation,
) => void;

export type MutableFieldTriggers<T extends Vertex> = {
  [key in keyof T]?: FieldChangeTrigger<T>;
};

/**
 * A mapping between field name and a single trigger.
 */
export type FieldTriggers<T extends Vertex, DT extends Vertex = T> = {
  readonly [key in keyof T]?: FieldChangeTrigger<DT>;
};

type VertCls = {
  new (
    mgr: VertexManager,
    prevVertex: Vertex | undefined,
    config: VertexConfig,
  ): Vertex;
};

export interface VertexConfig {
  isLocal?: boolean;
}

export type VertexId<T extends Vertex = Vertex> = T | string | VertexManager<T>;

export function VertexIdGetKey<T extends Vertex>(id: VertexId<T>): string {
  return typeof id === 'string' ? id : id.key;
}

/**
 * WARNING: All mutable properties must be of type `CoreValue`. If you
 * use a custom class than implement the `Comparable` interface on it. If you
 * need a different, unsupported, primitive then please extend `CoreValue`
 * to support it.
 */
export class Vertex implements Comparable {
  private static readonly _fieldTriggersByClass = new Map<
    VertCls,
    FieldTriggers<Vertex>
  >();

  private static _didFinalizeFieldTriggers = false;

  private readonly _compositeFieldsCache: Map<string, CoreValue>;
  private _cachedDepth: number;

  private readonly _manager: VertexManager<typeof this>;
  private _isLocal: boolean;
  private _cachedVertSetsByField: Map<string, Set<VertexManager>>;
  public isDemoData: boolean;

  static registerFieldTriggers(
    cls: VertCls,
    triggers: FieldTriggers<any>,
  ): void {
    assert(!this._didFinalizeFieldTriggers);
    this._fieldTriggersByClass.set(cls, triggers);
  }

  /**
   * Given a subclass of Vertex, this method returns an array of super classes
   * excluding Vertex. This method is a utility for constructing a full map of
   * field triggers per class (that respects triggers installed by super
   * classes).
   *
   * @param src The class to look up.
   * @returns An array of classes in the form of [src, ...] where Vertex is
   *          excluded from the result.
   */
  private static _getVertexClasses(src: VertCls): VertCls[] {
    const result: VertCls[] = [Vertex];
    while (src !== Vertex) {
      result.push(src);
      src = Object.getPrototypeOf(src);
    }
    return result;
  }

  /**
   * Given a class and triggers per class, this method composes a triggers map
   * that takes into account triggers installed by super classes.
   *
   * @param rawTriggers
   * @param src
   * @returns
   */
  private static _finalizeFieldTriggersForClass(
    rawTriggers: Map<VertCls, FieldTriggers<Vertex>>,
    src: VertCls,
  ): FieldTriggers<any> {
    const classHierarchy = this._getVertexClasses(src);
    const result: MutableFieldTriggers<any> = {};
    // The class hierarchy is ordered from subclass to superclass. We scan it
    // from super to sub, and compose triggers as we go.
    for (let i = classHierarchy.length - 1; i >= 0; --i) {
      const triggers = rawTriggers.get(classHierarchy[i]);
      // Skip classes that have no triggers installed for them
      if (triggers === undefined) {
        continue;
      }
      for (const [fieldName, func] of Object.entries(triggers)) {
        // If a trigger was already installed installed by a superclass, we
        // run it before running the subclass's trigger
        if (result.hasOwnProperty(fieldName)) {
          result[fieldName] = triggerCompose(
            result[fieldName]!,
            func,
            fieldName,
          );
        } else {
          result[fieldName] = func;
        }
      }
    }
    return result;
  }

  private static _finalizeFieldTriggersIfNeeded(): void {
    if (this._didFinalizeFieldTriggers) {
      return;
    }
    const rawTriggers = this._fieldTriggersByClass;
    const finalizedTriggers = new Map<VertCls, FieldTriggers<Vertex>>();

    for (const cls of rawTriggers.keys()) {
      finalizedTriggers.set(
        cls,
        this._finalizeFieldTriggersForClass(rawTriggers, cls),
      );
    }

    // Overwrite raw triggers with our composite triggers
    for (const [cls, triggers] of finalizedTriggers) {
      rawTriggers.set(cls, triggers);
    }
    this._didFinalizeFieldTriggers = true;
  }

  constructor(
    mgr: VertexManager,
    prevVertex: Vertex | undefined,
    config: VertexConfig | undefined,
  ) {
    this._manager = mgr as VertexManager<typeof this>;
    this._compositeFieldsCache = new Map();
    this._cachedDepth = -1;
    this._isLocal =
      prevVertex !== undefined ? prevVertex._isLocal : config?.isLocal === true;
    this._cachedVertSetsByField = new Map();
    this.isDemoData = prevVertex !== undefined ? prevVertex.isDemoData : false;
  }

  get manager() {
    return this._manager;
  }

  get record() {
    return this.manager.record;
  }

  get key(): string {
    return this._manager.key;
  }

  get proxy() {
    return this.manager.getVertexProxy();
  }

  get isNull() {
    return this.manager.record.isNull;
  }

  // Static value. Does not change during the lifetime of a vertex.
  get isRoot() {
    return this.manager.isRoot;
  }

  get hasPendingChanges() {
    return this.manager.hasPendingChanges;
  }

  get namespace(): string {
    return this.record.scheme.namespace;
  }

  get graph(): GraphManager {
    return this._manager.graph;
  }

  get outRefs(): Set<string> {
    return this.record.refs;
  }

  get isDeleted(): number {
    return 0;
  }

  set isDeleted(_val: number) {
    notImplemented();
  }

  get lastModified(): Date | undefined {
    return undefined;
  }

  set lastModified(v: Date | undefined) {
    notImplemented();
  }

  get depth(): number {
    if (this._cachedDepth < 0) {
      const parent = this.parent;
      this._cachedDepth = parent === undefined ? 0 : parent.depth + 1;
    }
    return this._cachedDepth;
  }

  get isLocal(): boolean {
    return this._isLocal || this.parent?.isLocal === true;
  }

  set isLocal(flag: boolean) {
    this._isLocal = flag;
  }

  parentDidMutate(
    local: boolean,
    oldValue: Vertex | undefined,
    neighbor: Vertex,
  ): MutationPack {
    this._cachedDepth = -1;
    return ['depth', local, oldValue === undefined ? 0 : oldValue.depth + 1];
  }

  get parent(): Vertex | undefined {
    return undefined;
  }

  *getChildren<T extends Vertex>(ns?: SchemeNamespace): Generator<T> {
    for (const [vert] of this.inEdges('parent')) {
      if (ns === undefined || vert.manager.scheme.namespace === ns) {
        yield vert as T;
      }
    }
  }

  *getChildManagers<T extends Vertex>(
    ns?: SchemeNamespace,
  ): Generator<VertexManager<T>> {
    for (const [mgr] of this.inEdgesManagers('parent')) {
      if (ns === undefined || mgr.scheme.namespace === ns) {
        yield mgr as VertexManager<T>;
      }
    }
  }

  diffKeys(other: Vertex, local: boolean): string[] {
    return this.record.diffKeys(other.record, local);
  }

  cloneData(onlyFields?: string[]): CoreObject {
    return this.record.cloneData(onlyFields);
  }

  isEqual<T extends this = this>(v: T): boolean {
    if (!(v instanceof Vertex)) {
      return false;
    }
    return this.key === v.key;
  }

  isRecordEqual(v: Vertex, local?: boolean): boolean {
    return this.record.isEqual(v.record, local);
  }

  compare<T extends Vertex>(other: T): number {
    if (!(other instanceof Vertex)) {
      return 0;
    }
    return coreValueCompare(this.key, other.key);
  }

  *inEdges<T extends Vertex>(
    fieldName?: string,
  ): Generator<[vertex: T, fieldName: string]> {
    for (const [mgr, f] of this.inEdgesManagers(fieldName)) {
      yield [mgr.getVertexProxy(), f];
    }
  }

  *inEdgesManagers<T extends Vertex>(
    fieldName?: string,
  ): Generator<[vertex: VertexManager<T>, fieldName: string]> {
    const graph = this.graph;
    for (const edge of graph.adjacencyList.inEdges(this.key, fieldName)) {
      yield [graph.getVertexManager(edge.vertex), edge.fieldName];
    }
  }

  *outEdges(
    fieldName?: string,
    graphLayer?: string,
  ): Generator<[vertex: Vertex, fieldName: string]> {
    const graph = this.graph;
    for (const edge of graph.adjacencyList.outEdges(this.key, fieldName)) {
      yield [graph.getVertex(edge.vertex), edge.fieldName];
    }
  }

  onVertexChanged(callback: (mutations: MutationPack) => void): () => void {
    return this.manager.onVertexChanged(callback);
  }

  /******************************************************************
   ******************* Methods for VertexManager *******************
   ******************************************************************/

  // WARNING: Never change a vertex manager's scheme inside this callback.
  didMutate(pack: MutationPack): MutationPack {
    const result = this._dispatchMutationCallback(pack);
    // if (this.isLocal || !this.graph.sharedQueriesManager.notDeleted.isLoading) {
    this._runFieldTriggers(pack);

    for (const [fieldName] of mutationPackIter(pack)) {
      this._cachedVertSetsByField.delete(fieldName);
    }
    // }
    return result;
  }

  private _dispatchMutationCallback(pack: MutationPack): MutationPack {
    let result: MutationPack;
    let remainingMutations = mutationPackClone(pack);

    while (!mutationPackIsEmpty(remainingMutations)) {
      const [fieldName, local, oldValue] =
        mutationPackGetFirst(remainingMutations)!;
      const handlerName = getDidMutateMethodName(fieldName);
      if (typeof (this as any)[handlerName] === 'function') {
        result = mutationPackAppend(
          result,
          (this as any)[handlerName](local, oldValue),
        );
      }
      remainingMutations = mutationPackDeleteFirst(remainingMutations);
    }
    return result;
  }

  private _runFieldTriggers(pack: MutationPack): void {
    Vertex._finalizeFieldTriggersIfNeeded();
    const triggers = Vertex._fieldTriggersByClass.get(
      this.constructor as VertCls,
    );
    if (triggers === undefined) {
      return;
    }
    const graph = this.graph;
    const key = this.key;
    for (const mutation of mutationPackIter(pack)) {
      const fieldName = mutation[0];
      const callback = triggers[fieldName as keyof Vertex];
      if (
        typeof callback === 'function' &&
        !graph.fieldTriggerHasExecuted(key, fieldName)
      ) {
        callback(this, mutation);
        graph.markFieldTriggerExecuted(key, fieldName);
      }
    }
  }

  clone(opts?: CoreValueCloneOpts): this {
    return this;
  }

  getLocalFields() {
    const fields: string[] = [];

    let proto = Object.getPrototypeOf(this);
    while (proto.__proto__.constructor !== Object) {
      const descriptors = Object.getOwnPropertyDescriptors(proto);
      for (const key in descriptors) {
        const desc = descriptors[key];
        if (desc.get && desc.set && !this.record.scheme.hasField(key)) {
          fields.push(key);
        }
      }
      proto = Object.getPrototypeOf(proto);
    }

    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        if (!key.startsWith('_') && !this.record.scheme.hasField(key)) {
          fields.push(key);
        }
      }
    }

    return fields;
  }

  onUserUpdatedField(mut: MutationPack): MutationPack {
    return mut;
  }

  /******************************************************************
   ********************* Methods for Subclasses *********************
   ******************************************************************/

  /**
   * Called by this vertex's manager to ge the current value of a field for
   * the purpose of ref calculation. This hook allows subclasses to include
   * computed fields in ref calculations, as well as provide an alternative raw
   * value to avoid unneeded computations.
   *
   * Example use cases:
   * - `Note` uses this hook to avoid slow composition on the `body` field.
   * - `BaseVertex` uses this hook to include the computed `parent` field in
   *   ref computations.
   *
   * @param fieldName The field's name.
   * @returns The field's current value.
   */
  valueForRefCalc(fieldName: keyof this): any {
    const scheme = this.manager.scheme;
    if (scheme.hasField(fieldName as string)) {
      if (scheme.getFieldType(fieldName as string) === ValueType.RICHTEXT_V3) {
        return this.record.get(fieldName as string);
      }
      return this[fieldName as keyof this];
    }
    return kNoRefsValue;
  }

  /**
   * An override point for subclasses to customize mutation behaviors.
   * Subclasses should return a (constant) map from field name to trigger
   * functions.
   * @returns A set of triggers for this instance
   */
  protected getFieldTriggers(): FieldTriggers<any> {
    return {};
  }

  protected volatileDataFields(): string[] {
    return [];
  }

  parentIsLocalChanged(
    local: boolean,
    oldValue: boolean,
    parent: Vertex,
  ): MutationPack {
    if (!this._isLocal) {
      return ['isLocal', local, oldValue];
    }
  }

  protected vertSetForField<T extends Vertex>(fieldName: string): Set<T> {
    let result: Set<VertexManager> | undefined =
      this._cachedVertSetsByField.get(fieldName);
    if (!result) {
      const keys = this.record.get(fieldName);
      if (!keys?.size) {
        result = new Set();
      } else {
        const graph = this.graph;
        result = new Set<VertexManager>();
        for (const k of keys) {
          const vert = graph.getVertex<T>(k);
          if (vert && !vert.isDeleted && !vert.isNull) {
            result.add(vert.manager);
          }
        }
      }
      this._cachedVertSetsByField.set(fieldName, result);
    }
    return SetUtils.map(result, (mgr) => mgr.getVertexProxy<T>());
  }
}

const kFieldTriggersBase: FieldTriggers<Vertex> = {
  isLocal: triggerChildren<Vertex>('parentIsLocalChanged', 'Vertex_isLocal'),
};

Vertex.registerFieldTriggers(Vertex, kFieldTriggersBase);

const gCachedDidMutateNames = new Map<string, string>();

function getDidMutateMethodName(fieldName: string): string {
  let result = gCachedDidMutateNames.get(fieldName);
  if (result === undefined) {
    result = fieldName + 'DidMutate';
    gCachedDidMutateNames.set(fieldName, result);
  }
  return result;
}

export function keyDictToVertDict<K extends Vertex, V extends Vertex>(
  graph: GraphManager,
  keyDict: ReadonlyDict<string, string>,
): Dictionary<K, V> {
  const result = new Map<K, V>();
  for (const [k, v] of keyDict) {
    const keyVert = graph.getVertex<K>(k);
    const valVert = graph.getVertex<V>(v);
    if (keyVert.isDeleted || valVert.isDeleted) {
      continue;
    }
    result.set(keyVert, valVert);
  }
  return result;
}

export function vertDictToKeyDict(
  vertDict: ReadonlyDict<Vertex, Vertex>,
): Dictionary<string, string> {
  const result = new Map<string, string>();
  for (const [k, v] of vertDict) {
    if (k.isDeleted || v.isDeleted) {
      continue;
    }
    result.set(k.key, v.key);
  }
  return result;
}

/**
 * Given a value, this function extracts any references from it. Currently it
 * handles Vertex instances, containers of Vertices as well as references
 * inside RichText. Other values are treated as have no refs in them.
 *
 * @param value The value to extract refs from.
 * @param local Whether to include or ignore local refs (in rich text).
 * @returns A set of string keys referencing other vertices.
 */
export function extractFieldRefs(
  value:
    | Vertex
    | Iterable<Vertex>
    | Dictionary<Vertex, Vertex>
    | Set<Vertex>
    | RichText
    | CoreValue,
  local: boolean,
): Set<string> {
  const result = new Set<string>();
  if (value === undefined) {
    return result;
  }
  if (value instanceof Vertex) {
    result.add(value.key);
    return result;
  }
  if (isDictionary(value)) {
    for (const [k, v] of value) {
      if (k instanceof Vertex && v instanceof Vertex) {
        result.add(k.key);
        result.add(v.key);
      }
    }
    return result;
  }
  if (isRichText(value as CoreValue)) {
    return extractRefsFromRT((value as RichText).root, local, result);
  }
  assert(!isGenerator(value)); // Sanity check
  if ((value as any)[Symbol.iterator] !== undefined) {
    for (const vert of value as Iterable<Vertex>) {
      if (vert instanceof Vertex) {
        result.add(vert.key);
      }
    }
    return result;
  }
  return result;
}
