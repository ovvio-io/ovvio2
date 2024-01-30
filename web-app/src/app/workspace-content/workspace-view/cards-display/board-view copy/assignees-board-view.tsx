import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { format } from '../../../../../core/localization/index.tsx';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { User } from '../../../../../../../cfds/client/graph/vertices/user.ts';
import { useToastController } from '../../../../../../../styles/components/toast/index.tsx';
import { FilteredNotes } from '../../../../../core/cfds/react/filter.ts';
import { useQuery2 } from '../../../../../core/cfds/react/query.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import CANCELLATION_REASONS from '../../../../../shared/dragndrop/cancellation-reasons.tsx';
import { DragPosition } from '../../../../../shared/dragndrop/droppable.tsx';
import {
  DragSource,
  DragAndDropContext,
} from '../../../../../shared/dragndrop/index.ts';
import { setDragSort } from '../card-item/draggable-card.tsx';
import {
  InfiniteVerticalScroll,
  InfiniteHorizontalScroll,
} from '../list-view/infinite-scroll.tsx';
import { BoardCard } from './board-card.tsx';
import { BoardColumn } from './board-column.tsx';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { CoreValue } from '../../../../../../../base/core-types/base.ts';
import {
  Query,
  QueryOptions,
} from '../../../../../../../cfds/client/graph/query.ts';
import { Vertex } from '../../../../../../../cfds/client/graph/vertex.ts';
import localization from './board.strings.json' assert { type: 'json' };

const useStrings = createUseStrings(localization);

const PAGE_SIZE = 10;

export function AssigneesBoardView({
  filteredNotes,
}: {
  filteredNotes: FilteredNotes<VertexManager<User>>;
}) {
  const notesQuery = useQuery2(filteredNotes[0]);
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
        const wsName = context!.card.getVertexProxy().workspace.name;
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
    [toast, strings],
  );

  const onDrop = (
    user: VertexManager<User> | 'unassigned',
    items: VertexManager<Note>[],
    item: VertexManager<Note>,
    relativeTo: VertexManager<Note>,
    dragPosition: DragPosition,
  ) => {
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
    card: VertexManager<Note>,
  ) => {
    if (user === 'unassigned') {
      return true;
    }
    const proxy = card.getVertexProxy();
    return (
      proxy.workspace.users.has(user.getVertexProxy()) || {
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
    <DragAndDropContext>
      {notesQuery
        .groups()
        .slice(0, xLimit)
        .map((column) => (
          <BoardColumn
            title={
              column === null
                ? strings.unassigned
                : column.getVertexProxy().name
            }
            key={column ? column.key : 'unassigned'}
            items={notesQuery.group(column)}
            onDrop={() => {}}
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
