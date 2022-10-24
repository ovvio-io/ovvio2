import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { sortMngStampCompare } from '@ovvio/cfds/lib/client/sorting';
import { useToastController } from '@ovvio/styles/lib/components/toast';
import { useEventLogger } from 'core/analytics';
import { usePartialVertices } from 'core/cfds/react/vertex';
import { createUseStrings } from 'core/localization';
import { useCallback, useMemo } from 'react';
import { DragAndDropContext, DragSource } from 'shared/dragndrop';
import { DragPosition } from 'shared/dragndrop/droppable';
import { BoardCard } from './board-card';
import { BoardColumn } from './board-column';
import localization from './board.strings.json';

const useStrings = createUseStrings(localization);

export interface WorkspaceBoardViewProps {
  cardManagers: VertexManager<Note>[];
  selectedWorkspaces: VertexManager<Workspace>[];
}

export function WorkspaceBoardView({
  cardManagers,
  selectedWorkspaces,
}: WorkspaceBoardViewProps) {
  const cards = usePartialVertices(cardManagers, ['workspaceKey', 'sortStamp']);
  const workspaces = usePartialVertices(selectedWorkspaces, ['name']);
  const eventLogger = useEventLogger();
  const toast = useToastController();
  const strings = useStrings();

  const columns = useMemo(
    () =>
      workspaces.map(x => ({
        workspace: x,
        cards: cards
          .filter(card => card.workspaceKey === x.key)
          .map(card => card.manager as VertexManager<Note>)
          .sort(sortMngStampCompare),
      })),
    [cards, workspaces]
  );

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

  return (
    <DragAndDropContext onDragCancelled={onDragCancelled}>
      {columns.map(column => (
        <BoardColumn
          title={column.workspace.name}
          key={column.workspace.key}
          items={column.cards}
          allowsDrop={() => false}
          onDrop={(item, relativeTo, dragPosition) =>
            onDrop(
              column.workspace.manager as VertexManager<Workspace>,
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
