import React, { useState, useEffect, useCallback } from 'react';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { useToastController } from '../../../../../../../styles/components/toast/index.tsx';
import {
  FilteredNotes,
  DueDateColumn,
} from '../../../../../core/cfds/react/filter.ts';
import { useQuery2 } from '../../../../../core/cfds/react/query.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { DragPosition } from '../../../../../shared/dragndrop/droppable.tsx';
import {
  DragSource,
  DragAndDropContext,
} from '../../../../../shared/dragndrop/index.ts';
import {
  InfiniteVerticalScroll,
  InfiniteHorizontalScroll,
} from '../list-view/infinite-scroll.tsx';
import { BoardCard } from './board-card.tsx';
import { BoardColumn } from './board-column.tsx';
import { Query } from '../../../../../../../cfds/client/graph/query.ts';
import { Vertex } from '../../../../../../../cfds/client/graph/vertex.ts';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import localization from './board.strings.json' assert { type: 'json' };

const useStrings = createUseStrings(localization);
const PAGE_SIZE = 10;

export function DueDateBoardView({
  filteredNotes,
}: {
  filteredNotes: FilteredNotes;
}) {
  const toast = useToastController();
  const logger = useLogger();
  const strings = useStrings();
  const notesQuery = useQuery2(
    filteredNotes[0] as Query<Vertex, Note, DueDateColumn>
  );
  const [yLimit, setYLimit] = useState(PAGE_SIZE);
  const [xLimit, setXLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    notesQuery.limit = yLimit + PAGE_SIZE;
    notesQuery.groupsLimit = xLimit + PAGE_SIZE;
  }, [notesQuery, yLimit, xLimit]);

  const onDragCancelled = useCallback(() => {
    logger.log({
      severity: 'INFO',
      event: 'Cancel',
      flow: 'dnd',
      source: 'board',
      groupBy: 'dueDate',
    });
    toast.displayToast({
      duration: 5000,
      text: strings.dragNotSupported,
    });
  }, [toast, logger, strings]);

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
        .map((columnName) => (
          <BoardColumn
            title={strings[columnName!]}
            key={columnName}
            items={notesQuery.group(columnName)}
            allowsDrop={() => false}
            onDrop={(item, relativeTo, dragPosition) =>
              onDrop(columnName!, item, relativeTo, dragPosition)
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
