import { useToastController } from '@ovvio/styles/lib/components/toast';
import { useEventLogger } from 'core/analytics';
import { createUseStrings } from 'core/localization';
import React, { useEffect, useState } from 'react';
import { DragAndDropContext } from 'shared/dragndrop';
import { BoardCard } from './board-card';
import { BoardColumn } from './board-column';
import localization from './board.strings.json';
import {
  InfiniteHorizontalScroll,
  InfiniteVerticalScroll,
} from '../list-view/infinite-scroll';
import { useQuery2 } from 'core/cfds/react/query';
import { FilteredNotes, useFilteredNotes } from 'core/cfds/react/filter';

const useStrings = createUseStrings(localization);
const PAGE_SIZE = 10;
export function TagBoardView({
  filteredNotes,
}: {
  filteredNotes: FilteredNotes;
}) {
  const notesQuery = useQuery2(
    (filteredNotes as FilteredNotes<string | null>)[0]
  );
  const strings = useStrings();
  const [yLimit, setYLimit] = useState(PAGE_SIZE);
  const [xLimit, setXLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    notesQuery.limit = yLimit + PAGE_SIZE;
    notesQuery.groupsLimit = xLimit + PAGE_SIZE;
  }, [notesQuery, yLimit, xLimit]);

  // const activeTagNames = useMemo(
  //   () => filters.activeTags.map(t => t.displayName),
  //   [filters]
  // );

  // const onDrop = (
  //   tag: string | null,
  //   items: VertexManager<Note>[],
  //   item: VertexManager<Note>,
  //   relativeTo: VertexManager<Note>,
  //   dragPosition: DragPosition
  // ) => {
  //   const proxy = item.getVertexProxy();
  //   eventLogger.action('DRAG_DONE', {
  //     cardId: item.key,
  //     source: DragSource.TagBoard,
  //   });

  //   if (tag === null) {
  //     const tags = proxy.tags;
  //     tags.delete(wsParent);
  //     proxy.tags = tags;
  //   } else {
  //     const wsTag = tag.managers[proxy.workspaceKey];
  //     const tags = proxy.tags;
  //     tags.set(wsParent, wsTag.getVertexProxy());
  //     proxy.tags = tags;
  //   }
  //   setDragSort(items, item, relativeTo, dragPosition);
  // };
  // const allowsDrop = (tag: TagType, card: VertexManager<Note>) => {
  //   if (tag === 'unassigned') {
  //     return true;
  //   }
  //   const proxy = card.getVertexProxy();
  //   if (tag.managers[proxy.workspaceKey]) {
  //     return true;
  //   }

  //   return {
  //     isAllowed: false,
  //     context: {
  //       tag,
  //       card,
  //     },
  //   };
  // };

  // const onDragCancelled = ({ reason }: { reason: CANCELLATION_REASONS }) => {
  // if (reason === CANCELLATION_REASONS.NOT_ALLOWED) {
  //   eventLogger.action('DRAG_CANCELLED', {
  //     cardId: context.card.key,
  //     source: DragSource.TagBoard,
  //     data: {
  //       reason: 'TAG_NOT_IN_WORKSPACE',
  //     },
  //   });
  //   toast.displayToast({
  //     text: format(strings.tagNotInWorkspace, {
  //       tag: context.tag.displayName,
  //       workspace: context.card.getVertexProxy().workspace.name,
  //     }),
  //     duration: 5000,
  //   });
  // }
  // };

  let maxColSize = 0;
  for (const gid of notesQuery.groups()) {
    maxColSize = Math.max(maxColSize, notesQuery.countForGroup(gid));
  }
  // console.log('Max col size = ' + maxColSize);

  return (
    <DragAndDropContext>
      {notesQuery
        .groups()
        .slice(0, xLimit)
        .map(col => (
          <BoardColumn
            key={col}
            items={notesQuery.group(col)}
            title={col === null ? strings.unassigned : col}
            onDrop={() => {}}
            // allowsDrop={item => allowsDrop(col.tag, item)}
          >
            {notesQuery
              .group(col)
              .slice(0, yLimit)
              .map((card, index) => (
                <BoardCard key={card.key} card={card} index={index} />
              ))}
          </BoardColumn>
        ))}
      <InfiniteVerticalScroll
        limit={yLimit}
        setLimit={setYLimit}
        pageSize={PAGE_SIZE}
        recordsLength={maxColSize}
        isVisible={false}
      />
      <InfiniteHorizontalScroll
        limit={xLimit}
        setLimit={setXLimit}
        pageSize={PAGE_SIZE}
        recordsLength={notesQuery.groupCount}
        isVisible={false}
      />
    </DragAndDropContext>
  );
}
