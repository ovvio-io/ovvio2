import { BaseVertex } from './base.ts';
import { FieldTriggers, Vertex } from '../vertex.ts';
import { coreValueCompare } from '../../../../base/core-types/comparable.ts';
import { Query } from '../query.ts';
import { MutationPack } from '../mutations.ts';
import { triggerChildren } from '../propagation-triggers.ts';

export class Tag extends BaseVertex {
  get name(): string {
    return this.record.get('name', '');
  }

  set name(n: string) {
    this.record.set('name', n);
  }

  get fullName(): string {
    return this.fullNameForParent(this.parentTag);
  }

  get parentTag(): Tag | undefined {
    const key = this.record.get<string>('parentTag');
    return key ? this.graph.getVertex<Tag>(key) : undefined;
  }

  set parentTag(tag: Tag | undefined) {
    if (tag) {
      this.record.set('parentTag', tag.key);
    } else {
      this.record.delete('parentTag');
    }
  }

  private fullNameForParent(parentTag: Tag | undefined): string {
    return parentTag ? `${parentTag.name}/${this.name}` : this.name;
  }

  parentTagDidMutate(local: boolean, oldValue: Tag | undefined): MutationPack {
    return [
      ['parent', local, oldValue],
      ['fullName', local, this.fullNameForParent(oldValue)],
    ];
  }

  parentNameDidMutate(local: boolean, oldValue: string): MutationPack {
    return ['fullName', local, `${oldValue}/${this.name}`];
  }

  get parent(): Vertex | undefined {
    return this.parentTag;
  }

  get childTagsQuery(): Query<Tag, Tag> {
    const queryManager = this.graph.sharedQueriesManager;
    return queryManager.getVertexQuery(
      this.key,
      'childTagsQuery',
      queryManager.tags,
      (tag) => tag.parent?.key === this.key,
      (t1, t2) => coreValueCompare(t1.sortStamp, t2.sortStamp)
    );
  }
}

const kFieldTriggersTag: FieldTriggers<Tag> = {
  name: triggerChildren('parentNameDidMutate'),
};

Vertex.registerFieldTriggers(Tag, kFieldTriggersTag);
