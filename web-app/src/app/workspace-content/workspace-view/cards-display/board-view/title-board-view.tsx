import React, { useState, useEffect, useCallback } from 'react';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { useToastController } from '../../../../../../../styles/components/toast/index.tsx';
import { FilteredNotes } from '../../../../../core/cfds/react/filter.ts';
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
import localization from './board.strings.json' assert { type: 'json' };

const useStrings = createUseStrings(localization);
const PAGE_SIZE = 10;

export function TitleBoardView({
  filteredNotes,
}: {
  filteredNotes: FilteredNotes<string>;
}) {
  const toast = useToastController();
  const strings = useStrings();
  const notesQuery = useQuery2(filteredNotes[0]);
  const [yLimit, setYLimit] = useState(PAGE_SIZE);
  const [xLimit, setXLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    notesQuery.limit = yLimit + PAGE_SIZE;
    notesQuery.groupsLimit = xLimit + PAGE_SIZE;
  }, [notesQuery, yLimit, xLimit]);

  const onDragCancelled = useCallback(() => {
    toast.displayToast({
      duration: 5000,
      text: strings.dragNotSupported,
    });
  }, [toast, strings]);

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
        .map((title) => (
          <BoardColumn
            title={title || strings.standaloneTask}
            key={title}
            items={notesQuery.group(title)}
            allowsDrop={() => false}
            onDrop={(item, relativeTo, dragPosition) =>
              onDrop(
                title!,
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

//the solution that i think will work, but i dont know how to implement is:
//check inside the KanbanColumn what groupBy is it and then deal with it accordingly.

//most important is to understand how the Query works and that is the type- CoreValue
// maybe doing something like this - card={pinnedQuery.group(group)[0]}
