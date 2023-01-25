import React, { useCallback, useMemo } from 'https://esm.sh/react@18.2.0';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  Workspace,
} from '../../../../../../../cfds/client/graph/vertices/index.ts';
import { sortMngStampCompare } from '../../../../../../../cfds/client/sorting.ts';
import { useToastController } from '../../../../../../../styles/components/toast/index.tsx';
import { usePartialVertices } from '../../../../../core/cfds/react/vertex.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import {
  DragAndDropContext,
  DragSource,
} from '../../../../../shared/dragndrop/index.ts';
import { DragPosition } from '../../../../../shared/dragndrop/droppable.tsx';
import { BoardCard } from './board-card.tsx';
import { BoardColumn } from './board-column.tsx';
import localization from './board.strings.json' assert { type: 'json' };
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import {
  GroupId,
  Query,
} from '../../../../../../../cfds/client/graph/query.ts';
import { Dictionary } from '../../../../../../../base/collections/dict.ts';
import { mapIterable } from '../../../../../../../base/common.ts';
import { useGraphManager } from '../../../../../core/cfds/react/graph.tsx';
import { coreValueCompare } from '../../../../../../../base/core-types/comparable.ts';
import { useQuery2 } from '../../../../../core/cfds/react/query.ts';

const useStrings = createUseStrings(localization);

export interface WorkspaceBoardViewProps {
  query: Query<Note, Note>;
}

export function WorkspaceBoardView({ query }: WorkspaceBoardViewProps) {
  useQuery2(query, false);
  const cardManagers = query.groups;
  const graph = useGraphManager();
  const workspaces = usePartialVertices(
    Array.from(
      mapIterable(cardManagers.keys(), (k) =>
        graph.getVertexManager<Workspace>(k!)
      )
    ),
    ['name', 'sortStamp']
  );
  const logger = useLogger();
  const toast = useToastController();
  const strings = useStrings();
  const columns = workspaces.sort(coreValueCompare);

  const onDragCancelled = useCallback(() => {
    logger.log({
      severity: 'INFO',
      event: 'Cancel',
      flow: 'dnd',
      source: 'board',
      type: 'workspace',
      status: 'cancelled',
      reason: 'not-supported',
    });
    toast.displayToast({
      duration: 5000,
      text: strings.dragNotSupported,
    });
  }, [toast, logger, strings]);

  const onDrop = (
    workspace: VertexManager<Workspace>,
    items: readonly VertexManager<Note>[],
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
      {columns.map((column) => (
        <BoardColumn
          title={column.name}
          key={column.key}
          items={cardManagers.get(column.key)!}
          allowsDrop={() => false}
          onDrop={(
            item: VertexManager<Note>,
            relativeTo: VertexManager<Note>,
            dragPosition: DragPosition
          ) =>
            onDrop(
              column.manager as VertexManager<Workspace>,
              cardManagers.get(column.key)!,
              item,
              relativeTo,
              dragPosition
            )
          }
        >
          {cardManagers.get(column.key)!.map((card, index) => (
            <BoardCard card={card} index={index} key={card.key} />
          ))}
        </BoardColumn>
      ))}
    </DragAndDropContext>
  );
}
