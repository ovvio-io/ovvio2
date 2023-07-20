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
import {
  DueDateColumn,
  FilteredNotes,
  useFilteredNotes,
} from 'core/cfds/react/filter';
import { useQuery2 } from 'core/cfds/react/query';

const useStrings = createUseStrings(localization);
const PAGE_SIZE = 10;

export function DueDateBoardView({
  filteredNotes,
}: {
  filteredNotes: FilteredNotes;
}) {
  const eventLogger = useEventLogger();
  const toast = useToastController();
  const strings = useStrings();
  const notesQuery = useQuery2(
    (filteredNotes as FilteredNotes<DueDateColumn>)[0]
  );
  const [yLimit, setYLimit] = useState(PAGE_SIZE);
  const [xLimit, setXLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    notesQuery.limit = yLimit + PAGE_SIZE;
    notesQuery.groupsLimit = xLimit + PAGE_SIZE;
  }, [notesQuery, yLimit, xLimit]);

  const onDragCancelled = useCallback(() => {
    eventLogger.action('DRAG_CANCELLED', {
      source: DragSource.DueDateBoard,
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
    column: DueDateColumn,
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
        .slice(0, xLimit)
        .map(columnName => (
          <BoardColumn
            title={strings[columnName]}
            key={columnName}
            items={notesQuery.group(columnName)}
            allowsDrop={() => false}
            onDrop={(item, relativeTo, dragPosition) =>
              onDrop(columnName, item, relativeTo, dragPosition)
            }
          >
            {notesQuery
              .group(columnName)
              .slice(0, yLimit)
              .map((card, index) => (
                <BoardCard card={card} index={index} key={card.key} />
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
