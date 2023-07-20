import { IndexBuilder } from '@ovvio/cfds/lib/client/indexes/builder';
import { SchemeNamespace } from '@ovvio/cfds/lib/base/scheme-types';
import { Index } from './base-index';
import { Tag } from '@ovvio/cfds/lib/client/graph/vertices/tag';

export const TagsByWsIndex: Index<Tag> = {
  get name() {
    return 'tags-by-ws';
  },
  get namespaces() {
    return SchemeNamespace.TAGS;
  },
  buildIndex(ib: IndexBuilder<Tag>) {
    return ib
      .sortBy(x => x.creationDate)
      .addGroupBy(x => x.workspace)
      .invalidateByFields('workspace')
      .save();
  },
};

export const OrphanTagsIndex: Index<Tag> = {
  get name() {
    return 'tag-orphans';
  },
  get namespaces() {
    return SchemeNamespace.TAGS;
  },
  buildIndex(ib: IndexBuilder<Tag>) {
    return ib
      .filterBy(x => x.parentTag === undefined)
      .addGroupBy(x => x.workspace)
      .sortBy(x => [x.color, x.name])
      .invalidateByFields('parentTag', 'workspace', 'color', 'name')
      .save();
  },
};

export const ChildTagsIndex: Index<Tag> = {
  get name() {
    return 'tag-children';
  },
  get namespaces() {
    return SchemeNamespace.TAGS;
  },
  buildIndex(ib: IndexBuilder<Tag>) {
    return ib
      .filterBy(x => x.parentTag !== undefined)
      .sortBy(x => x.name)
      .addGroupBy(v => v.workspace)
      .addGroupBy(v => v.parentTag)
      .invalidateByFields('parentTag', 'name', 'workspace')
      .save();
  },
};

export const TagsTreeIndex: Index<Tag> = {
  get name() {
    return 'tags-tree';
  },
  get namespaces() {
    return SchemeNamespace.TAGS;
  },
  buildIndex(ib: IndexBuilder<Tag>) {
    return ib
      .sortBy(x => {
        const parent = x.parentTag;
        if (parent) {
          return [parent.key, '2', x.sortStamp];
        } else {
          return [x.key, '1'];
        }
      })
      .addGroupBy(v => v.workspace)
      .invalidateByFields('sortStamp', 'workspace', 'parentTag')
      .save();
  },
};
