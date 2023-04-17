import React from 'react';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  Tag,
} from '../../../../../../../cfds/client/graph/vertices/index.ts';
import { usePartialVertices } from '../../../../../core/cfds/react/vertex.ts';
import {
  createUseStrings,
  format,
} from '../../../../../core/localization/index.tsx';
import { DragAndDropContext } from '../../../../../shared/dragndrop/index.ts';
import { DragPosition } from '../../../../../shared/dragndrop/droppable.tsx';
import { Query } from '../../../../../../../cfds/client/graph/query.ts';
import { setDragSort } from '../card-item/draggable-card.tsx';
import { BoardCard } from './board-card.tsx';
import { BoardColumn } from './board-column.tsx';
import localization from './board.strings.json' assert { type: 'json' };
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { useQuery2 } from '../../../../../core/cfds/react/query.ts';
import { usePartialFilter } from '../../../../index.tsx';
import { useGraphManager } from '../../../../../core/cfds/react/graph.tsx';
import {
  filterIterable,
  mapIterable,
} from '../../../../../../../base/common.ts';

const useStrings = createUseStrings(localization);

export interface TagBoardViewProps {
  query: Query<Note, Note>;
}

export function TagBoardView({ query }: TagBoardViewProps) {
  useQuery2(query, false);
  const logger = useLogger();
  const groups = query.groups;
  const groupBy = usePartialFilter(['groupByPivot']).groupByPivot as Tag;
  const graph = useGraphManager();
  const childTagManagers = Array.from(
    mapIterable(
      filterIterable(groups.keys(), (k) => typeof k === 'string'),
      (k) => graph.getVertexManager<Tag>(k!)
    )
  );
  const sortedChildTags = usePartialVertices(childTagManagers, ['name']).sort();
  const unassigned = groups.get(undefined);
  const strings = useStrings();

  const onDrop = (
    tag: VertexManager<Tag> | undefined,
    items: readonly VertexManager<Note>[],
    item: VertexManager<Note>,
    relativeTo: VertexManager<Note>,
    dragPosition: DragPosition
  ) => {
    const note = item.getVertexProxy();
    logger.log({
      severity: 'INFO',
      event: 'End',
      flow: 'dnd',
      vertex: item.key,
      type: 'tag',
      source: 'board',
      added: tag?.key,
      removed: tag === undefined ? note.tags.get(groupBy)?.key : undefined,
    });

    if (typeof tag === 'undefined') {
      note.tags.delete(groupBy);
    } else {
      note.tags.set(groupBy, tag.vertex);
    }
    setDragSort(items, item, relativeTo, dragPosition);
  };

  return (
    <DragAndDropContext>
      {unassigned?.length || 0 > 0 ? (
        <BoardColumn
          key={undefined}
          items={groups.get(undefined)!}
          title={strings.unassigned}
          onDrop={(...args) =>
            onDrop(undefined, groups.get(undefined)!, ...args)
          }
        >
          {groups.get(undefined)!.map((note, index) => (
            <BoardCard key={note.key} card={note} index={index} />
          ))}
        </BoardColumn>
      ) : null}
      {sortedChildTags.map((tag) => (
        <BoardColumn
          key={tag.key}
          items={groups.get(tag.key)!}
          title={tag.name}
          onDrop={(...args) =>
            onDrop(
              tag.manager as VertexManager<Tag>,
              groups.get(tag.key)!,
              ...args
            )
          }
        >
          {groups.get(tag.key)!.map((card, index) => (
            <BoardCard key={card.key} card={card} index={index} />
          ))}
        </BoardColumn>
      ))}
    </DragAndDropContext>
  );
}
