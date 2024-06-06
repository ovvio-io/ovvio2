import { FieldTriggers, Vertex, VertexConfig } from '../vertex.ts';
import * as OrderStamp from '../../../base/orderstamp.ts';
import {
  MutationPack,
  mutationPackAppend,
  mutationPackIter,
} from '../mutations.ts';
import { Workspace } from './workspace.ts';
import { triggerChildren } from '../propagation-triggers.ts';
import { VertexManager } from '../vertex-manager.ts';
import { assert } from '../../../../base/error.ts';
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';

export class BaseVertex extends Vertex {
  private _cachedSortStamp?: string;

  constructor(
    mgr: VertexManager,
    prevVertex: Vertex | undefined,
    config: VertexConfig | undefined,
  ) {
    super(mgr, prevVertex, config);
    if (prevVertex instanceof BaseVertex) {
      this._cachedSortStamp = prevVertex._cachedSortStamp;
    }
  }

  // ============================= //
  // =========== Dates =========== //
  // ============================= //

  get creationDate(): Date {
    return this.record.get('creationDate') as Date;
  }

  // set creationDate(d: Date) {
  //   this.record.set('creationDate', d);
  // }

  get lastModified(): Date {
    const d = this.record.get('lastModified', this.creationDate);
    assert(d instanceof Date);
    return d;
  }

  // set lastModified(d: Date) {
  //   this.record.set('lastModified', d);
  // }

  // ============================= //
  // ======== Other Basics ======= //
  // ============================= //

  private calcIsDeleted(parentDeleted: number | undefined): number {
    if (parentDeleted) {
      return parentDeleted;
    }
    const v = this.record.get('isDeleted');
    assert(typeof v === 'number');
    return v;
  }

  get isDeleted(): number {
    return this.calcIsDeleted(this.parent?.isDeleted);
  }

  set isDeleted(v: number) {
    this.record.set('isDeleted', v);
  }

  get sortStamp(): string {
    if (!this._cachedSortStamp) {
      this._cachedSortStamp = this.record.get(
        'sortStamp',
        OrderStamp.fromTimestamp(this.creationDate, this.key),
      );
    }
    return this._cachedSortStamp!;
  }

  set sortStamp(v: string) {
    this.record.set('sortStamp', v);
  }

  clearSortStamp() {
    this.record.delete('sortStamp');
  }

  sortStampDidMutate(): void {
    this._cachedSortStamp = undefined;
  }

  // Override by subclasses
  get parent(): Vertex | undefined {
    return undefined;
  }

  // isDeleted is affected by parent changes
  parentDidMutate(
    local: boolean,
    oldValue: Vertex | undefined,
    parent: Vertex,
  ): MutationPack {
    const prevIsDeleted = this.calcIsDeleted(oldValue?.isDeleted);
    if (prevIsDeleted !== this.isDeleted) {
      return ['isDeleted', local, prevIsDeleted];
    }
  }

  // If our parent's isDeleted has changed, our isDeleted may need to be updated
  parentIsDeletedChanged(
    local: boolean,
    oldValue: number,
    parent: Vertex,
  ): MutationPack {
    // Our parent's isDeleted affects us only when we're not explicitly deleted
    if (
      !this.record.get('isDeleted') &&
      (oldValue === 1) !== (parent.isDeleted === 1)
    ) {
      return ['isDeleted', local, this.calcIsDeleted(oldValue)];
    }
  }

  onUserUpdatedField(mut: MutationPack): MutationPack {
    let result = mut;
    for (const [field] of mutationPackIter(mut)) {
      if (this.record.scheme.hasField(field)) {
        const prevLastMod = this.lastModified;
        this.record.set('lastModified', new Date());

        result = mutationPackAppend(mut, ['lastModified', true, prevLastMod]);
        break;
      }
    }
    return result;
  }

  valueForRefCalc(fieldName: keyof this): any {
    if (fieldName === 'parent') {
      return this.parent;
    }
    return super.valueForRefCalc(fieldName);
  }

  compare<T extends Vertex>(other: T): number {
    if (other instanceof BaseVertex) {
      // Default order is descending which places newer items first. This
      // enables us to show intermediate results of queries and still make
      // sense
      return coreValueCompare(other.sortStamp, this.sortStamp);
    }
    return super.compare(other);
  }
}

export class ContentVertex extends BaseVertex {
  get parent(): Vertex | undefined {
    return this.workspace;
  }

  get createdBy(): Vertex | undefined {
    const key = this.record.get<string | undefined>('createdBy');
    return key ? this.graph.getVertex(key) : undefined;
  }

  set createdBy(v: Vertex | undefined) {
    if (v) {
      assert(v.graph === this.graph);
      this.record.set('createdBy', v.key);
    } else {
      this.record.delete('createdBy');
    }
  }
  get workspaceKey(): string {
    return this.record.get('workspace') as string;
  }

  get workspace(): Workspace {
    const key = this.record.get('workspace');
    assert(typeof key === 'string');
    return this.graph.getVertex<Workspace>(key);
  }

  set workspace(ws: Workspace) {
    assert(ws.graph === this.graph);
    this.record.set('workspace', ws.key);
  }

  workspaceDidMutate(
    local: boolean,
    oldValue: Workspace | undefined,
  ): MutationPack {
    if (this.parent?.isEqual(this.workspace)) {
      return ['parent', local, oldValue];
    }
  }

  parentWorkspaceDidMutate(): void {
    this.workspace = (this.parent as ContentVertex).workspace;
  }
}

const kFieldTriggersBase: FieldTriggers<BaseVertex> = {
  isDeleted: triggerChildren('parentIsDeletedChanged', 'BaseVertex_isDeleted'),
};

Vertex.registerFieldTriggers(BaseVertex, kFieldTriggersBase);

const kFieldTriggersContent: FieldTriggers<ContentVertex> = {
  workspace: triggerChildren(
    'parentWorkspaceDidMutate',
    'ContentVertex_workspace',
  ),
};

Vertex.registerFieldTriggers(ContentVertex, kFieldTriggersContent);
