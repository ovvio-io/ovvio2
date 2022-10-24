import { GraphManager } from '@ovvio/cfds/lib/client/graph/graph-manager';
import { Index } from './base-index';
import {
  ChildTagsIndex,
  OrphanTagsIndex,
  TagsByWsIndex,
  TagsTreeIndex,
} from './tags';

const indexes: Index<any>[] = [
  OrphanTagsIndex,
  ChildTagsIndex,
  TagsByWsIndex,
  TagsTreeIndex,
];

export function registerIndexes(graphManager: GraphManager) {
  for (const index of indexes) {
    const indexBuilder = graphManager.indexQueryManager.addIndex(
      index.name,
      index.namespaces
    );
    index.buildIndex(indexBuilder);
  }
}

export { OrphanTagsIndex, ChildTagsIndex, TagsByWsIndex, TagsTreeIndex };
