import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { useToastController } from '@ovvio/styles/lib/components/toast';
import { useEventLogger } from 'core/analytics';
import { createUseStrings } from 'core/localization';
import { useCallback, useEffect, useState } from 'react';
import { DragAndDropContext, DragSource } from 'shared/dragndrop';
import { DragPosition } from 'shared/dragndrop/droppable';
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

export function NoteBoardView({
  filteredNotes,
}: {
  filteredNotes: FilteredNotes;
}) {
  const eventLogger = useEventLogger();
  const toast = useToastController();
  const strings = useStrings();
  const notesQuery = useQuery2((filteredNotes as FilteredNotes<string>)[0]);
  const [yLimit, setYLimit] = useState(PAGE_SIZE);
  const [xLimit, setXLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    notesQuery.limit = yLimit + PAGE_SIZE;
    notesQuery.groupsLimit = xLimit + PAGE_SIZE;
  }, [notesQuery, yLimit, xLimit]);

  const onDragCancelled = useCallback(() => {
    eventLogger.action('DRAG_CANCELLED', {
      source: DragSource.NoteBoard,
      data: {
        reason: 'NOT_SUPPORTED',
      },
    });
    toast.displayToast({
      duration: 5000,
      text: strings.dragNotSupported,
    });
  }, [toast, eventLogger, strings]);

  const onDrop = (
    title: string,
    items: VertexManager<Note>[],
    item: VertexManager<Note>,
    relativeTo: VertexManager<Note>,
    dragPosition: DragPosition
  ) => {
    // eventLogger.cardAction('DRAG_DONE', item, {
    //   source: DragSource.WorkspaceBoard,
    // });
    // moveCard(item, workspace, graph, eventLogger, CARD_SOURCE.BOARD);
    // setDragSort(items, item, relativeTo, dragPosition);
  };

  let maxColSize = 0;
  for (const gid of notesQuery.groups()) {
    maxColSize = Math.max(maxColSize, notesQuery.countForGroup(gid));
  }

  return (
    <DragAndDropContext onDragCancelled={onDragCancelled}>
      {notesQuery
        .groups()
        .splice(0, xLimit)
        // .slice(xLimit)
        .map(title => (
          <BoardColumn
            title={title || strings.standaloneTask}
            key={title}
            items={notesQuery.group(title)}
            allowsDrop={() => false}
            onDrop={(item, relativeTo, dragPosition) =>
              onDrop(
                title,
                notesQuery.group(title),
                item,
                relativeTo,
                dragPosition
              )
            }
          >
            {notesQuery
              .group(title)
              .slice(yLimit)
              .map((noteMgr, index) => (
                <BoardCard card={noteMgr} index={index} key={noteMgr.key} />
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
