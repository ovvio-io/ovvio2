import { MutationPack, mutationPackAppend } from '../mutations.ts';
import { FieldTriggers, Vertex, VertexConfig } from '../vertex.ts';
import { VertexManager } from '../vertex-manager.ts';
import { ContentVertex } from './base.ts';
import { Workspace } from './workspace.ts';
import { Record } from '../../../base/record.ts';
import { triggerParent } from '../propagation-triggers.ts';
import { SchemeNamespace } from '../../../base/scheme-types.ts';
import { Query } from '../query.ts';

export class Tag extends ContentVertex {
  private _cachedTagFamily: Tag[] | undefined;
  private _cachedChildTags?: Tag[]; // TODO: Remove this cache. No longer needed

  constructor(
    mgr: VertexManager,
    record: Record,
    prevVertex: Vertex | undefined,
    config: VertexConfig | undefined
  ) {
    super(mgr, record, prevVertex, config);
    if (prevVertex && prevVertex instanceof Tag) {
      this.selected = prevVertex.selected;
    }
  }

  get parent(): Vertex | undefined {
    return this.parentTag || super.parent;
  }

  get childTags(): Tag[] {
    return Query.blocking(
      this.graph.sharedQueriesManager.tagsQuery,
      (tag) => tag.parentTag === this
    ).map((mgr) => mgr.getVertexProxy());
  }

  private _invalidateChildTags(local: boolean): MutationPack {
    const res: MutationPack = ['childTags', local, this._cachedChildTags];
    this._cachedChildTags = undefined;
    return res;
  }

  childParentTagDidMutate(
    local: boolean,
    oldValue: Tag | undefined,
    child: Tag
  ): MutationPack {
    return this._invalidateChildTags(local);
  }

  childTagIsDeletedDidMutate(
    local: boolean,
    oldValue: number,
    child: Tag
  ): MutationPack {
    return this._invalidateChildTags(local);
  }

  parentTagDidMutate(local: boolean, oldValue: Tag | undefined): MutationPack {
    return ['parent', local, oldValue];
  }

  get color(): string {
    return this.record.get('color') as string;
  }

  set color(color: string) {
    this.record.set('color', color);
  }

  get name(): string {
    return this.record.get('name', '');
  }

  set name(n: string) {
    this.record.set('name', n);
  }

  selected: boolean = false;
  clearSelected() {
    this.selected = false;
  }

  get parentTag(): Tag | undefined {
    const key: string | undefined = this.record.get<string>('parentTag');
    if (key !== undefined && key.length > 0) {
      return this.graph.getVertex<Tag>(key);
    }
    return undefined;
  }

  get parentTagKey(): string | undefined {
    const parentTag = this.parentTag;
    return parentTag ? parentTag.key : undefined;
  }

  set parentTag(parent: Tag | undefined) {
    if (parent === undefined) {
      this.record.delete('parentTag');
    } else {
      this.record.set('parentTag', parent.key);
    }
  }

  clearParentTag(): void {
    this.parentTag = undefined;
  }

  get tagFamily(): Tag[] {
    if (this._cachedTagFamily === undefined) {
      const family: Tag[] = [];
      for (const [neighbor] of this.inEdges('parentTag')) {
        if (neighbor instanceof Tag && neighbor.isDeleted === 0) {
          family.push(neighbor);
        }
      }
      family.sort((t1, t2) =>
        (t1.name || t1.key).localeCompare(t2.name || t2.key)
      );
      this._cachedTagFamily = family;
    }
    return this._cachedTagFamily;
  }

  // Invalidate our tagFamily when a sub tag joins/leaves our children
  childTagParentDidMutate(
    local: boolean,
    oldValue: Tag | undefined,
    child: Tag
  ): MutationPack {
    return mutationPackAppend(
      this._invalidateTagFamily(local),
      this._invalidateChildTags(local)
    );
  }

  // Invalidate our tagFamily when a sub tag changes its name
  childNameDidMutate(
    local: boolean,
    oldValue: string | undefined,
    child: Tag
  ): MutationPack {
    return this._invalidateTagFamily(local);
  }

  // Invalidate our tagFamily when a sub tag's deleted marker changes
  childIsDeletedDidMutate(
    local: boolean,
    oldValue: number,
    child: Tag
  ): MutationPack {
    return mutationPackAppend(
      this._invalidateTagFamily(local),
      this._invalidateChildTags(local)
    );
  }

  workspaceSelectedDidMutate(
    local: boolean,
    oldValue: boolean,
    ws: Workspace
  ): MutationPack {
    if (oldValue === true && this.selected) {
      //Workspace has been un-selected > Tag should be un-selected
      this.selected = false;
      return ['selected', local, true];
    }
  }

  private _invalidateTagFamily(local: boolean): MutationPack {
    const oldFamily = this.tagFamily;
    this._cachedTagFamily = undefined;
    return ['tagFamily', local, oldFamily];
  }
}

const kFieldTriggersTag: FieldTriggers<Tag> = {
  parent: triggerParent('childTagParentDidMutate', SchemeNamespace.TAGS),
  name: triggerParent('childNameDidMutate', SchemeNamespace.TAGS),
  isDeleted: triggerParent('childIsDeletedDidMutate', SchemeNamespace.TAGS),
};

Vertex.registerFieldTriggers(Tag, kFieldTriggersTag);
