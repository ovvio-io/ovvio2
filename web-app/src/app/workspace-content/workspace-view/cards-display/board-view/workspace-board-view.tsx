import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { sortMngStampCompare } from '@ovvio/cfds/lib/client/sorting';
import { useToastController } from '@ovvio/styles/lib/components/toast';
import { useEventLogger } from 'core/analytics';
import { usePartialVertices } from 'core/cfds/react/vertex';
import { createUseStrings } from 'core/localization';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { BoardViewInternalProps } from '.';
import { usePartialView } from 'core/cfds/react/graph';
import { coreValueCompare } from '@ovvio/cfds/lib/core-types';

const useStrings = createUseStrings(localization);
const PAGE_SIZE = 10;

export function WorkspaceBoardView({
  filteredNotes,
}: {
  filteredNotes: FilteredNotes;
}) {
  const view = usePartialView('selectedWorkspaces');
  const selectedWorkspaces = usePartialVertices(view.selectedWorkspaces, [
    'name',
  ]);
  const notesQuery = useQuery2(
    (filteredNotes as FilteredNotes<VertexManager<Workspace>>)[0]
  );
  const eventLogger = useEventLogger();
  const toast = useToastController();
  const strings = useStrings();
  const [yLimit, setYLimit] = useState(PAGE_SIZE);
  const [xLimit, setXLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    notesQuery.limit = yLimit + PAGE_SIZE;
    notesQuery.groupsLimit = xLimit + PAGE_SIZE;
  }, [notesQuery, yLimit, xLimit]);

  const onDragCancelled = useCallback(() => {
    eventLogger.action('DRAG_CANCELLED', {
      source: DragSource.WorkspaceBoard,
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
        .map(column => (
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
