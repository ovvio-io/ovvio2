import { assert } from '../../../../base/error.ts';
import { Vertex, VertexConfig } from '../vertex.ts';
import * as OrderStamp from '../../../base/orderstamp.ts';
import {
  MutationPack,
  mutationPackAppend,
  mutationPackIter,
} from '../mutations.ts';
import { VertexManager } from '../vertex-manager.ts';
import { Record } from '../../../base/record.ts';
import { IVertex } from '../types.ts';
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';

export class BaseVertex extends Vertex {
  constructor(
    mgr: VertexManager,
    record: Record,
    prevVertex: Vertex | undefined,
    config: VertexConfig | undefined
  ) {
    super(mgr, record, prevVertex, config);
    if (prevVertex && prevVertex.namespace === this.namespace) {
      this.selected = (prevVertex as typeof this).selected;
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
    const d = this.record.get<Date>('lastModified');
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
    const v = this.record.get<number>('isDeleted');
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

  selected = false;

  clearSelected() {
    this.selected = false;
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

  compare(other: IVertex): number {
    if (other instanceof BaseVertex) {
      // Default order is descending which places newer items first. This
      // enables us to show intermediate results of queries and still make
      // sense
      return coreValueCompare(other.sortStamp, this.sortStamp);
    }
    return super.compare(other);
  }
}
