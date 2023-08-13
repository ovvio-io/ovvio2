import React, { useState, useEffect, useCallback } from 'react';
import { coreValueCompare } from '../../../../../../../base/core-types/index.ts';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import { useToastController } from '../../../../../../../styles/components/toast/index.tsx';
import { FilteredNotes } from '../../../../../core/cfds/react/filter.ts';
import { usePartialView } from '../../../../../core/cfds/react/graph.tsx';
import { useQuery2 } from '../../../../../core/cfds/react/query.ts';
import { usePartialVertices } from '../../../../../core/cfds/react/vertex.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { DragAndDropContext } from '../../../../../shared/dragndrop/context.tsx';
import { DragPosition } from '../../../../../shared/dragndrop/droppable.tsx';
import { DragSource } from '../../../../../shared/dragndrop/index.ts';
import {
  InfiniteVerticalScroll,
  InfiniteHorizontalScroll,
} from '../list-view/infinite-scroll.tsx';
import { BoardCard } from './board-card.tsx';
import { BoardColumn } from './board-column.tsx';
import localization from './board.strings.json' assert { type: 'json' };

const useStrings = createUseStrings(localization);
const PAGE_SIZE = 10;

export function WorkspaceBoardView({
  filteredNotes,
}: {
  filteredNotes: FilteredNotes<VertexManager<Workspace>>;
}) {
  const view = usePartialView('selectedWorkspaces');
  const selectedWorkspaces = usePartialVertices(view.selectedWorkspaces, [
    'name',
  ]);
  const notesQuery = useQuery2(filteredNotes[0]);
  const toast = useToastController();
  const strings = useStrings();
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
    workspace: VertexManager<Workspace>,
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

  // console.log('Max col size = ' + maxColSize);

  return (
    <DragAndDropContext onDragCancelled={onDragCancelled}>
      {Array.from(selectedWorkspaces)
        .sort(coreValueCompare)
        .slice(0, xLimit)
        .map((column) => (
          <BoardColumn
            title={column.name}
            key={column.key}
            items={notesQuery.group(column.manager as VertexManager<Workspace>)}
            allowsDrop={() => false}
            onDrop={(item, relativeTo, dragPosition) =>
              onDrop(
                column.manager as VertexManager<Workspace>,
                notesQuery.group(column.manager as VertexManager<Workspace>),
                item,
                relativeTo,
                dragPosition
              )
            }
          >
            {notesQuery
              .group(column.manager as VertexManager<Workspace>)
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
