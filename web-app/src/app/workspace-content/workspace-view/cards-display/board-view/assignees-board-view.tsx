import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note, User } from '@ovvio/cfds/lib/client/graph/vertices';
import { useEventLogger } from 'core/analytics';
import { createUseStrings, format } from 'core/localization';
import React, { useCallback, useEffect, useState } from 'react';
import {
  CANCELLATION_REASONS,
  DragAndDropContext,
  DragSource,
} from 'shared/dragndrop';
import { DragPosition } from 'shared/dragndrop/droppable';
import { useToastController } from '@ovvio/styles/lib/components/toast';
import { setDragSort } from '../card-item/draggable-card';
import { BoardCard } from './board-card';
import { BoardColumn } from './board-column';
import localization from './board.strings.json';
import {
  InfiniteHorizontalScroll,
  InfiniteVerticalScroll,
} from '../list-view/infinite-scroll';
import { FilteredNotes, useFilteredNotes } from 'core/cfds/react/filter';
import { useQuery2 } from 'core/cfds/react/query';

const useStrings = createUseStrings(localization);

const PAGE_SIZE = 10;

export function AssigneesBoardView({
  filteredNotes,
}: {
  filteredNotes: FilteredNotes;
}) {
  const notesQuery = useQuery2(
    (filteredNotes as FilteredNotes<VertexManager<User>>)[0]
  );
  const eventLogger = useEventLogger();
  const strings = useStrings();
  const [yLimit, setYLimit] = useState(PAGE_SIZE);
  const [xLimit, setXLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    notesQuery.limit = yLimit + PAGE_SIZE;
    notesQuery.groupsLimit = xLimit + PAGE_SIZE;
  }, [notesQuery, yLimit, xLimit]);

  const toast = useToastController();

  const onDragCancelled = useCallback(
    ({
      reason,
      context,
    }: {
      reason: CANCELLATION_REASONS;
      context?: { user: VertexManager<User>; card: VertexManager<Note> };
    }) => {
      if (reason === CANCELLATION_REASONS.NOT_ALLOWED) {
        eventLogger.action('DRAG_CANCELLED', {
          source: DragSource.AssigneeBoard,
          data: {
            reason: 'USER_NOT_IN_WORKSPACE',
          },
        });
        const wsName = context.card.getVertexProxy().workspace.name;
        toast.displayToast({
          duration: 5000,
          text: format(strings.userNotInWorkspace, { workspace: wsName }),
          // action: {
          //   text: strings.invite,
          //   fn: dismiss => {
          //     dismiss();
          //   },
          // },
        });
      }
    },
    [toast, strings, eventLogger]
  );

  const onDrop = (
    user: VertexManager<User> | 'unassigned',
    items: VertexManager<Note>[],
    item: VertexManager<Note>,
    relativeTo: VertexManager<Note>,
    dragPosition: DragPosition
  ) => {
    eventLogger.action('DRAG_DONE', {
      source: DragSource.AssigneeBoard,
      cardId: item.key,
    });
    const card = item.getVertexProxy();
    if (user === 'unassigned') {
      card.assignees = new Set();
    } else {
      card.assignees = new Set([user.getVertexProxy()]);
    }
    setDragSort(items, item, relativeTo, dragPosition);
  };

  const allowsDrop = (
    user: VertexManager<User> | 'unassigned',
    card: VertexManager<Note>
  ) => {
    if (user === 'unassigned') {
      return true;
    }
    const proxy = card.getVertexProxy();
    return (
      proxy.workspace.assignees.has(user.getVertexProxy()) || {
        isAllowed: false,
        context: {
          user,
          card,
        },
      }
    );
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
        .map(column => (
          <BoardColumn
            title={
              column === null
                ? strings.unassigned
                : column.getVertexProxy().name
            }
            key={column ? column.key : 'unassigned'}
            items={notesQuery.group(column)}
            allowsDrop={item => allowsDrop(column, item)}
            onDrop={(item, relativeTo, dragPosition) =>
              onDrop(
                column,
                notesQuery.group(column),
                item,
                relativeTo,
                dragPosition
              )
            }
          >
            {notesQuery
              .group(column)
              .slice(0, yLimit)
              .map((card, index) => (
                <BoardCard
                  card={card}
                  index={index}
                  key={`${column ? column.key : 'unassigned'}/${card.key}`}
                />
              ))}
          </BoardColumn>
        ))}
      <InfiniteVerticalScroll
        limit={yLimit}
        setLimit={setYLimit}
        pageSize={10}
        recordsLength={maxColSize}
        isVisible={false}
      />
      <InfiniteHorizontalScroll
        limit={xLimit}
        setLimit={setXLimit}
        pageSize={10}
        recordsLength={notesQuery.groupCount}
        isVisible={false}
      />
    </DragAndDropContext>
  );
}
