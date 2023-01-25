import React, { useCallback, useMemo } from 'https://esm.sh/react@18.2.0';
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

export interface AssigneesBoardViewProps {
  query: Query<Note>;
}

const useStrings = createUseStrings(localization);

export function AssigneesBoardView({ query }: AssigneesBoardViewProps) {
  useQuery2(query);
  const logger = useLogger();
  const strings = useStrings();
  const toast = useToastController();
  const graph = query.graph;
  const sortedUsers = useVertices(
    filterIterable(
      query.groups.keys(),
      (id: GroupId | undefined) => typeof id !== 'undefined'
    )
  );
  const onDragCancelled = useCallback(
    ({
      reason,
      context,
    }: {
      reason: CANCELLATION_REASONS;
      context?: {
        user: VertexManager<User> | undefined;
        card: VertexManager<Note>;
      };
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
    sourceUser: VertexManager<User> | undefined,
    destinationUser: VertexManager<User> | undefined,
    items: readonly VertexManager<Note>[],
    item: VertexManager<Note>,
    relativeTo: VertexManager<Note>,
    dragPosition: DragPosition
  ) => {
    logger.log({
      severity: 'INFO',
      event: 'End',
      flow: 'dnd',
      type: 'assignee',
      vertex: item.key,
      source: 'board',
      added: destinationUser?.key,
      removed: sourceUser?.key,
    });
    const card = item.getVertexProxy();
    if (typeof destinationUser === 'undefined') {
      card.clearAssignees();
    } else {
      if (sourceUser) {
        card.assignees.delete(sourceUser.vertex);
      }
      card.assignees.add(destinationUser.vertex);
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
      proxy.workspace.users.has(user.getVertexProxy()) || {
        isAllowed: false,
        context: {
          user,
          card,
        },
      }
    );
  };

  return (
    <DragAndDropContext onDragCancelled={onDragCancelled}>
      {columns.map((column) => (
        <BoardColumn
          title={
            column.userManager === 'unassigned'
              ? strings.unassigned
              : column.userManager.getVertexProxy().name
          }
          key={column.key}
          items={column.cards}
          allowsDrop={(item) => allowsDrop(column.userManager, item)}
          onDrop={(item, relativeTo, dragPosition) =>
            onDrop(
              column.userManager,
              column.cards,
              item,
              relativeTo,
              dragPosition
            )
          }
        >
          {column.cards.map((card, index) => (
            <BoardCard card={card} index={index} key={card.key} />
          ))}
        </BoardColumn>
      ))}
    </DragAndDropContext>
  );
}
