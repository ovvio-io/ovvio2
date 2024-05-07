import { MutationPack, mutationPackAppend } from '../mutations.ts';
import { FieldTriggers, Vertex, VertexConfig } from '../vertex.ts';
import { VertexManager } from '../vertex-manager.ts';
import { ContentVertex } from './base.ts';
import { Workspace } from './workspace.ts';
import { Record } from '../../../base/record.ts';
import {
  triggerChildren,
  triggerParent,
  triggerCompose,
} from '../propagation-triggers.ts';
import { SchemeNamespace } from '../../../base/scheme-types.ts';
import { Query } from '../query.ts';
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';
import { SimpleTimer } from '../../../../base/timer.ts';
import { useSharedQuery } from '../../../../web-app/src/core/cfds/react/query.ts';
import { encodeTagId } from '../../../base/scheme-types.ts';
import { useVertex } from '../../../../web-app/src/core/cfds/react/vertex.ts';

export class Tag extends ContentVertex {
  private _cachedTagFamily: Tag[] | undefined;
  private _cachedChildTags?: VertexManager<Tag>[];

  constructor(
    mgr: VertexManager,
    prevVertex: Vertex | undefined,
    config: VertexConfig | undefined
  ) {
    super(mgr, prevVertex, config);
    if (prevVertex && prevVertex instanceof Tag) {
      this.selected = prevVertex.selected;
      this._cachedChildTags = prevVertex._cachedChildTags;
    }
  }

  get parent(): Vertex | undefined {
    return this.parentTag || super.parent;
  }

  /**
   * @param wsManager A VertexManager of type Workspace.
   * @returns boolean indicating if the tag exists in the workspace.
   */
  isTagInWorkspace(wsManager: VertexManager<Workspace>): Tag | undefined {
    const tagFullName = encodeTagId(this.parentTag?.name, this.name);
    const wsCategories: Tag[] = this.graph
      .sharedQuery('parentTagsByWorkspace')
      .group(wsManager)
      .map((mgr) => mgr.getVertexProxy());
    for (const category of wsCategories) {
      const childTags: Tag[] = category.childTags;

      for (const tag of childTags) {
        const tagFullNameWs = encodeTagId(category.name, tag.name);
        if (tagFullNameWs === tagFullName) return tag;
      }
    }
    return undefined;
  }

  // get childTags(): Tag[] {
  //   // if (!this._cachedChildTags) {
  //   //   this._cachedChildTags = Query.blocking(
  //   //     this.graph.sharedQueriesManager.tagsQuery,
  //   //     tag => tag.parentTag === this
  //   //   );
  //   // }
  //   // return this._cachedChildTags.map(mgr => mgr.getVertexProxy());
  //   return Array.from(this.inEdgesManagers<Tag>('parentTag'))
  //     .map(([mgr]) => mgr.getVertexProxy())
  //     .filter((tag) => tag.isDeleted !== 1);
  // }

  get childTags(): Tag[] {
    return this.graph
      .sharedQuery('childTags')
      .group(this.workspace.key)
      .filter((mgr) => {
        const child = mgr.getVertexProxy();
        return child.parentTag?.key === this.key && !child.isDeleted;
      })
      .map((mgr) => mgr.getVertexProxy());
    // return Array.from(this.inEdgesManagers<Tag>('parentTag'))
    //   .map(([mgr]) => mgr.getVertexProxy())
    //   .filter((tag) => tag.isDeleted !== 1)
    //   .sort(coreValueCompare);
  }

  private _invalidateChildTags(local: boolean): MutationPack {
    new SimpleTimer(50, false, () =>
      this.manager.vertexDidMutate(this._invalidateChildTagsImpl(local))
    ).schedule();
    return this._invalidateChildTagsImpl(local);
  }

  private _invalidateChildTagsImpl(local: boolean): MutationPack {
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

  get isChildTag(): boolean {
    return this.record.has('parentTag');
  }

  get parentTag(): Tag | undefined {
    const key: string | undefined = this.record.get('parentTag');
    const graph = this.graph;
    if (key !== undefined && key.length > 0 && graph.hasVertex(key)) {
      return this.graph.getVertex<Tag>(key);
    }
    return undefined;
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

  get parentTagKey(): string | undefined {
    const parentTag = this.parentTag;
    return parentTag ? parentTag.key : undefined;
  }

  // Invalidate our tagFamily when a sub tag joins/leaves our children
  childTagParentDidMutate(
    local: boolean,
    oldValue: Tag | undefined,
    child: Tag
  ): MutationPack {
    return mutationPackAppend(this._invalidateChildTags(local));
  }

  childSortStampDidMutate(
    local: boolean,
    oldValue: Tag | undefined,
    child: Tag
  ): MutationPack {
    return mutationPackAppend(this._invalidateChildTags(local));
  }

  // Invalidate our tagFamily when a sub tag's deleted marker changes
  childIsDeletedDidMutate(
    local: boolean,
    oldValue: number,
    child: Tag
  ): MutationPack {
    return mutationPackAppend(this._invalidateChildTags(local));
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

  parentTagIsDeletedDidMutate(
    local: boolean,
    oldValue: boolean | undefined,
    parent: Tag
  ): MutationPack {
    return ['parentTag', local, undefined];
  }
}

const kFieldTriggersTag: FieldTriggers<Tag> = {
  parent: triggerParent(
    'childTagParentDidMutate',
    'Tag_parent',
    SchemeNamespace.TAGS
  ),
  isDeleted: triggerCompose(
    triggerParent(
      'childIsDeletedDidMutate',
      'Tag_isDeleted_fromChild',
      SchemeNamespace.TAGS
    ),
    triggerChildren(
      'parentTagIsDeletedDidMutate',
      'Tag_isDeleted_fromParent',
      SchemeNamespace.TAGS
    ),
    'Tag_isDeleted'
  ),
  sortStamp: triggerParent(
    'childSortStampDidMutate',
    'Tag_sortStamp',
    SchemeNamespace.TAGS
  ),
};

Vertex.registerFieldTriggers(Tag, kFieldTriggersTag);
