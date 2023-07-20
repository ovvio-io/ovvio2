import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note, Tag, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { sortStampCompare } from '@ovvio/cfds/lib/client/sorting';
import { useQuery } from 'core/cfds/react/query';
import { usePartialVertex } from 'core/cfds/react/vertex';

export type ChildTag = [VertexManager<Tag>, VertexManager<Tag>];

export interface StatusTags {
  done: ChildTag;
  notDone: ChildTag;
}

const EMPTY_RESULT = {
  done: null,
  notDone: null,
};

export function useStatusTags(workspace: Workspace): StatusTags {
  const { loading, results: childTagManagers } = useQuery(
    (tag: Tag) =>
      tag.workspace === workspace &&
      tag.parentTag?.name.toLocaleLowerCase() === 'status',
    [workspace],
    {
      source: workspace.graph.sharedQueriesManager.tags,
    }
  );

  if (loading || !childTagManagers.length) {
    return EMPTY_RESULT;
  }

  const childTags = childTagManagers.map(mgr => mgr.getVertexProxy());
  const doneTag = childTags.find(x => x.name.toLocaleLowerCase() === 'done');
  if (!doneTag) {
    return EMPTY_RESULT;
  }
  const notDone = childTags
    .filter(x => x.key !== doneTag.key)
    .sort(sortStampCompare)[0];
  if (!notDone) {
    return EMPTY_RESULT;
  }

  const statusTag = childTags[0].parentTag.manager as VertexManager<Tag>;
  return {
    done: [statusTag, doneTag.manager as VertexManager<Tag>],
    notDone: [statusTag, notDone.manager as VertexManager<Tag>],
  };
}

export function useCardStatus(card: VertexManager<Note>) {
  const cardProxy = usePartialVertex(card, [
    'tags',
    'workspace',
    'childCards',
    'type',
    'isChecked',
  ]);

  const isDone = cardProxy.isChecked;

  return {
    isDone,
    toggleStatus(done?: boolean) {
      cardProxy.isChecked = done;
    },
  };
}
