import { assert } from '../../../../base/error.ts';
import { MutationPack } from '../mutations.ts';
import { triggerChildren } from '../propagation-triggers.ts';
import { Vertex, FieldTriggers } from '../vertex.ts';
import { BaseVertex } from './base.ts';
import { Workspace } from './workspace.ts';

export class ContentVertex extends BaseVertex {
  get parent(): Vertex | undefined {
    return this.workspace;
  }

  get createdBy(): Vertex | undefined {
    const key = this.record.get<string>('createdBy');
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
    const key = this.record.get<string>('workspace');
    assert(typeof key === 'string');
    return this.graph.getVertex<Workspace>(key);
  }

  set workspace(ws: Workspace) {
    assert(ws.graph === this.graph);
    this.record.set('workspace', ws.key);
  }

  /** @deprecated */
  get workspaceKey(): string {
    return this.record.get('workspace') as string;
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
