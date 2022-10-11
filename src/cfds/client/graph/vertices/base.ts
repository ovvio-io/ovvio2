import { assert } from '@ovvio/base/lib/utils';
import { FieldTriggers, Vertex } from '../vertex';
import * as OrderStamp from '../../../base/orderstamp';
import {
  MutationPack,
  mutationPackAppend,
  mutationPackIter,
} from '../mutations';
import { Workspace } from './workspace';
import { triggerChildren } from '../propagation-triggers';

export class BaseVertex extends Vertex {
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
    const d = this.record.get('lastModified');
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
    return this.record.get(
      'sortStamp',
      OrderStamp.fromTimestamp(this.creationDate, this.key)
    );
  }

  set sortStamp(v: string) {
    this.record.set('sortStamp', v);
  }

  clearSortStamp() {
    this.record.delete('sortStamp');
  }

  // Override by subclasses
  get parent(): Vertex | undefined {
    return undefined;
  }

  // isDeleted is affected by parent changes
  parentDidMutate(
    local: boolean,
    oldValue: Vertex | undefined,
    parent: Vertex
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
    parent: Vertex
  ): MutationPack {
    // Our parent's isDeleted affects us only when we're not explicitly deleted
    if (!this.record.get('isDeleted')) {
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

  get workspace(): Workspace {
    const key = this.record.get('workspace');
    assert(typeof key === 'string');
    return this.graph.getVertex<Workspace>(key);
  }

  get workspaceKey(): string {
    return this.record.get('workspace') as string;
  }

  set workspace(ws: Workspace) {
    assert(ws.graph === this.graph);
    this.record.set('workspace', ws.key);
  }

  workspaceDidMutate(
    local: boolean,
    oldValue: Workspace | undefined
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
  isDeleted: triggerChildren('parentIsDeletedChanged'),
};

Vertex.registerFieldTriggers(BaseVertex, kFieldTriggersBase);

const kFieldTriggersContent: FieldTriggers<ContentVertex> = {
  workspace: triggerChildren('parentWorkspaceDidMutate'),
};

Vertex.registerFieldTriggers(ContentVertex, kFieldTriggersContent);
