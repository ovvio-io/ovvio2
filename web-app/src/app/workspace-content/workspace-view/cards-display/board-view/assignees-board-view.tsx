import React, { useCallback, useMemo } from 'https://esm.sh/react@18.2.0';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  User,
  Workspace,
} from '../../../../../../../cfds/client/graph/vertices/index.ts';
import { sortMngStampCompare } from '../../../../../../../cfds/client/sorting.ts';
import { usePartialVertices } from '../../../../../core/cfds/react/vertex.ts';
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

export interface AssigneesBoardViewProps {
  cardManagers: VertexManager<Note>[];
}

const useStrings = createUseStrings(localization);

type UserColumn =
  | {
      key: string;
      user: User;
      userManager: VertexManager<User>;
      cards: VertexManager<Note>[];
    }
  | {
      key: string;
      userManager: 'unassigned';
      cards: VertexManager<Note>[];
    };

export function AssigneesBoardView({ cardManagers }: AssigneesBoardViewProps) {
  const cards = usePartialVertices(cardManagers, ['assignees', 'sortStamp']);
  const workspaces = usePartialVertices(selectedWorkspaces, ['users']);
  const eventLogger = useEventLogger();
  const strings = useStrings();

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

  const columns = useMemo<UserColumn[]>(() => {
    const users = new Set(
      workspaces.reduce((current, x) => {
        return current.concat(
          ...Array.from(x.users).map((x) => x.manager as VertexManager<User>)
        );
      }, [] as VertexManager<User>[])
    );
    const cols = Array.from(users)
      .map((x) => ({
        user: x.getVertexProxy(),
        key: x.key,
        userManager: x,
        cards: cards
          .filter((card) => card.assignees.has(x.getVertexProxy()))
          .map((card) => card.manager as VertexManager<Note>)
          .sort(sortMngStampCompare),
      }))
      .sort((a, b) => a.user.name.localeCompare(b.user.name));
    const selected = cols.filter(
      (x) =>
        !filters.activeAssignees?.length ||
        filters.activeAssignees.some((u) => u.key === x.key)
    );
    const res = selected.length ? selected : cols;
    return [
      {
        key: 'unassigned',
        userManager: 'unassigned',
        cards: cards
          .filter((card) => card.assignees.size === 0)
          .map((card) => card.manager as VertexManager<Note>)
          .sort(sortMngStampCompare),
      },
      ...res,
    ];
  }, [cards, workspaces, filters.activeAssignees]);

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
