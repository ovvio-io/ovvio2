import React, { useCallback, useMemo } from 'react';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  User,
} from '../../../../../../../cfds/client/graph/vertices/index.ts';
import { sortMngStampCompare } from '../../../../../../../cfds/client/sorting.ts';
import {
  usePartialVertices,
  useVertices,
} from '../../../../../core/cfds/react/vertex.ts';
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
import { useToastController } from '../../../../../../../styles/components/toast/index.tsx';
import { setDragSort } from '../card-item/draggable-card.tsx';
import { BoardCard } from './board-card.tsx';
import { BoardColumn } from './board-column.tsx';
import localization from './board.strings.json' assert { type: 'json' };
import {
  GroupId,
  Query,
} from '../../../../../../../cfds/client/graph/query.ts';
import { useQuery2 } from '../../../../../core/cfds/react/query.ts';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import {
  mapIterable,
  filterIterable,
} from '../../../../../../../base/common.ts';
import { coreValueCompare } from '../../../../../../../base/core-types/comparable.ts';

export interface AssigneesBoardViewProps {
  query: Query<Note>;
}

interface AssigneesDnDContext {
  user: VertexManager<User> | undefined;
  card: VertexManager<Note>;
}

const useStrings = createUseStrings(localization);

export function AssigneesBoardView({ query }: AssigneesBoardViewProps) {
  useQuery2(query);
  const logger = useLogger();
  const strings = useStrings();
  const toast = useToastController();
  const sortedUsers = usePartialVertices<User>(
    filterIterable(
      query.groups.keys(),
      (id: GroupId | undefined) => typeof id !== 'undefined'
    ),
    ['name']
  ).sort(coreValueCompare);
  const onDragCancelled = useCallback(
    ({
      reason,
      context,
    }: {
      reason: CANCELLATION_REASONS;
      context?: AssigneesDnDContext;
    }) => {
      if (reason === CANCELLATION_REASONS.NOT_ALLOWED) {
        logger.log({
          severity: 'INFO',
          event: 'Cancel',
          flow: 'dnd',
          type: 'assignee',
          reason: 'denied',
          source: 'board',
          added: context?.user?.key,
          vertex: context?.card.key,
        });
        const wsName = context?.card.vertex.workspace.name;
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
    [toast, strings, logger]
  );

  const onDrop = (
    // sourceUser: VertexManager<User> | undefined,
    destinationUser: VertexManager<User>, // | undefined,
    items: readonly VertexManager<Note>[],
    item: VertexManager<Note>,
    relativeTo: VertexManager<Note>,
    dragPosition: DragPosition
  ) => {
    const card = item.getVertexProxy();
    logger.log({
      severity: 'INFO',
      event: 'End',
      flow: 'dnd',
      type: 'assignee',
      vertex: item.key,
      source: 'board',
      added: destinationUser?.key,
      removed: Array.from(card.assignees).map((u) => u.key),
    });
    // if (typeof destinationUser === 'undefined') {
    card.clearAssignees();
    // } else {
    // if (sourceUser) {
    // card.assignees.delete(sourceUser.vertex);
    // }
    card.assignees.add(destinationUser.vertex);
    // }
    setDragSort(items, item, relativeTo, dragPosition);
  };

  const allowsDrop = (user: User | undefined, note: Note) => {
    if (typeof user === 'undefined') {
      return true;
    }
    return (
      note.workspace.users.has(user) || {
        isAllowed: false,
        context: {
          user: user?.manager,
          card: note.manager,
        } as AssigneesDnDContext,
      }
    );
  };

  return (
    <DragAndDropContext onDragCancelled={onDragCancelled}>
      {sortedUsers.map((user) => (
        <BoardColumn
          title={user ? user.name : strings.unassigned}
          key={user?.key}
          items={query.groups.get(user?.key)!}
          allowsDrop={(item) => allowsDrop(user as User, item)}
          onDrop={(item, relativeTo, dragPosition) =>
            onDrop(
              user!.manager,
              query.groups.get(user?.key)!,
              item,
              relativeTo,
              dragPosition
            )
          }
        >
          {query.groups.get(user?.key)!.map((card, index) => (
            <BoardCard card={card} index={index} key={card.key} />
          ))}
        </BoardColumn>
      ))}
    </DragAndDropContext>
  );
}
