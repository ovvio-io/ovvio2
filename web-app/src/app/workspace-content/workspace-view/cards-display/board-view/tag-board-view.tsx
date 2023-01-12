import React, { useMemo } from 'https://esm.sh/react@18.2.0';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  Workspace,
} from '../../../../../../../cfds/client/graph/vertices/index.ts';
import { sortStampCompare } from '../../../../../../../cfds/client/sorting.ts';
import { useToastController } from '../../../../../../../styles/components/toast/index.tsx';
import { usePartialVertices } from '../../../../../core/cfds/react/vertex.ts';
import {
  createUseStrings,
  format,
} from '../../../../../core/localization/index.tsx';
import {
  CANCELLATION_REASONS,
  DragAndDropContext,
  DragSource,
} from '../../../../../shared/dragndrop/index.ts';
import { DragPosition } from '../../../../../shared/dragndrop/droppable.tsx';
import { Dictionary } from '../../../../../../../base/collections/dict.ts';
import { GroupId } from '../../../../../../../cfds/client/graph/query.ts';
import { setDragSort } from '../card-item/draggable-card.tsx';
import { BoardCard } from './board-card.tsx';
import { BoardColumn } from './board-column.tsx';
import localization from './board.strings.json' assert { type: 'json' };
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';

const useStrings = createUseStrings(localization);

export interface TagBoardViewProps {
  cardManagers: Dictionary<GroupId, VertexManager<Note>>[];
}

export function TagBoardView({ cardManagers }: TagBoardViewProps) {
  const logger = useLogger();
  const toast = useToastController();
  const cards = usePartialVertices(cardManagers, [
    'tags',
    'workspaceKey',
    'sortStamp',
  ]);
  const childTags = useMemo(
    () => Object.values(parentTag.childTags),
    [parentTag.childTags]
  );

  const strings = useStrings();

  let activeTags = childTags.filter((x) => x.selected);
  activeTags = activeTags.length ? activeTags : childTags;
  const unassigned = cards
    .filter(
      (x) =>
        parentTag.managers[x.workspaceKey] &&
        !x.tags.has(parentTag.managers[x.workspaceKey].getVertexProxy())
    )
    .map((x) => x.manager as VertexManager<Note>);
  const columns: TagColumn[] = activeTags.sort(sortStampCompare).map((tag) => ({
    key: tag.key,
    tag,
    cards: cards
      .filter(
        (x) =>
          tag.managers[x.workspaceKey] &&
          parentTag.managers[x.workspaceKey] &&
          x.tags.get(parentTag.managers[x.workspaceKey].getVertexProxy()) ===
            tag.managers[x.workspaceKey].getVertexProxy()
      )
      .map((x) => x.manager as VertexManager<Note>),
  }));

  if (unassigned.length) {
    columns.unshift({
      key: 'unassigned',
      tag: 'unassigned',
      cards: unassigned,
    });
  }

  const onDrop = (
    tag: TagType,
    items: VertexManager<Note>[],
    item: VertexManager<Note>,
    relativeTo: VertexManager<Note>,
    dragPosition: DragPosition
  ) => {
    const proxy = item.getVertexProxy();
    eventLogger.action('DRAG_DONE', {
      cardId: item.key,
      source: DragSource.TagBoard,
    });

    const wsParent = parentTag.managers[proxy.workspaceKey]?.getVertexProxy();
    if (!wsParent) {
      return;
    }
    if (tag === 'unassigned') {
      const tags = proxy.tags;
      tags.delete(wsParent);
      proxy.tags = tags;
    } else {
      const wsTag = tag.managers[proxy.workspaceKey];
      const tags = proxy.tags;
      tags.set(wsParent, wsTag.getVertexProxy());
      proxy.tags = tags;
    }
    setDragSort(items, item, relativeTo, dragPosition);
  };
  const allowsDrop = (tag: TagType, card: VertexManager<Note>) => {
    if (tag === 'unassigned') {
      return true;
    }
    const proxy = card.getVertexProxy();
    if (tag.managers[proxy.workspaceKey]) {
      return true;
    }

    return {
      isAllowed: false,
      context: {
        tag,
        card,
      },
    };
  };

  const onDragCancelled = ({
    reason,
    context,
  }: {
    reason: CANCELLATION_REASONS;
    context: { tag: SharedChildTag; card: VertexManager<Note> };
  }) => {
    if (reason === CANCELLATION_REASONS.NOT_ALLOWED) {
      eventLogger.action('DRAG_CANCELLED', {
        cardId: context.card.key,
        source: DragSource.TagBoard,
        data: {
          reason: 'TAG_NOT_IN_WORKSPACE',
        },
      });
      toast.displayToast({
        text: format(strings.tagNotInWorkspace, {
          tag: context.tag.displayName,
          workspace: context.card.getVertexProxy().workspace.name,
        }),
        duration: 5000,
      });
    }
  };

  return (
    <DragAndDropContext onDragCancelled={onDragCancelled}>
      {columns.map((col) => (
        <BoardColumn
          key={col.key}
          items={col.cards}
          title={
            col.tag === 'unassigned' ? strings.unassigned : col.tag.displayName
          }
          onDrop={(...args) => onDrop(col.tag, col.cards, ...args)}
          allowsDrop={(item) => allowsDrop(col.tag, item)}
        >
          {col.cards.map((card, index) => (
            <BoardCard key={card.key} card={card} index={index} />
          ))}
        </BoardColumn>
      ))}
    </DragAndDropContext>
  );
}
