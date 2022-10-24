import { SortDescriptor, UnionQuery } from '@ovvio/cfds/lib/client/graph/query';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';
import {
  sortMngStampCompare,
  sortStampCompare,
} from '@ovvio/cfds/lib/client/sorting';
import { styleguide } from '@ovvio/styles/lib';
import { useToastController } from '@ovvio/styles/lib/components/toast';
import { LabelSm } from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { EventCategory, useEventLogger } from 'core/analytics';
import { isNote, useQuery } from 'core/cfds/react/query';
import { usePartialVertices } from 'core/cfds/react/vertex';
import { createUseStrings } from 'core/localization';
import { useDocumentRouter } from 'core/react-utils';
import { Scroller } from 'core/react-utils/scrolling';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CANCELLATION_REASONS,
  DragAndDropContext,
  Draggable,
  DragSource,
} from 'shared/dragndrop';
import {
  FiltersStateController,
  isCardInFilter,
} from '../display-bar/filters/state';
import { EmptyListState } from './empty-state';
import { InfiniteScroll } from './infinite-scroll';
import { InlineTaskButton } from './inline-task-button';
import localization from './list.strings.json';
import { SortBy } from './sort-by';
import { ItemRow, ItemsTable, Row } from './table';

export { SortBy };

const useStyles = makeStyles(theme => ({
  item: {
    position: 'relative',
    marginBottom: styleguide.gridbase * 2,
  },
  listRoot: {
    height: '100%',
    overflowY: 'auto',
  },
}));

const useStrings = createUseStrings(localization);

export interface ListViewProps {
  sortBy: SortBy;
  noteType: NoteType;
  selectedWorkspaces: VertexManager<Workspace>[];
  className?: string;
  filters: FiltersStateController;
}

const PAGE_SIZE = 20;

const SORT_BY: Record<SortBy, SortDescriptor<Note>> = {
  [SortBy.Created]: (a, b) =>
    b.creationDate.getTime() - a.creationDate.getTime(),
  [SortBy.DueDate]: (a, b) => {
    if (!a.dueDate && !b.dueDate) {
      return 0;
    }
    if (!a.dueDate) {
      return 1;
    }
    if (!b.dueDate) {
      return -1;
    }

    return a.dueDate.getTime() - b.dueDate.getTime();
  },
  [SortBy.LastModified]: (a, b) =>
    b.lastModified.getTime() - a.lastModified.getTime(),
  [SortBy.Priority]: sortStampCompare,
};

interface CardsData {
  pinned: VertexManager<Note>[];
  unpinned: VertexManager<Note>[];
}

function splitCards(notes: Pick<Note, 'isPinned' | 'manager'>[]): CardsData {
  const result = {
    pinned: [],
    unpinned: [],
  };

  for (const note of notes) {
    const proxy = note;
    if (proxy.isPinned) {
      result.pinned.push(note.manager as VertexManager<Note>);
    } else {
      result.unpinned.push(note.manager as VertexManager<Note>);
    }
  }

  return result;
}

export function ListView({
  noteType,
  sortBy,
  selectedWorkspaces,
  className,
  filters,
}: ListViewProps) {
  const q = usePartialVertices(selectedWorkspaces, [
    'notesQuery',
    'pinnedNotesQuery',
  ]);
  const unpinnedSource = useMemo(
    () => new UnionQuery(q.map(x => x.notesQuery, 'notesUnion')),
    [q]
  );
  const unpinnedCardsQuery = useQuery(
    (x: Note) =>
      x.type === noteType &&
      x.parentType !== NoteType.Task &&
      !x.isPinned &&
      isCardInFilter(filters, x),
    [noteType, filters],
    {
      sort: SORT_BY[sortBy],
      name: 'listViewUnpinned',
      source: unpinnedSource,
    }
  );

  const pinnedSource = useMemo(
    () => new UnionQuery(q.map(x => x.pinnedNotesQuery, 'pinnedNotesUnion')),
    [q]
  );
  const pinnedCardsQuery = useQuery(
    (x: Note) =>
      x.type === noteType &&
      x.parentType !== NoteType.Task &&
      x.isPinned &&
      isCardInFilter(filters, x),
    [noteType, filters],
    {
      sort: SORT_BY[sortBy],
      name: 'listViewPinned',
      source: pinnedSource,
    }
  );

  if (unpinnedCardsQuery.loading || pinnedCardsQuery.loading) {
    return null;
  }

  // const cardsQuery = useQuery(
  //   x =>
  //     isNote(x) &&
  //     x.type === noteType &&
  //     (x.parentNote === undefined || x.parentNote.type === NoteType.Note) &&
  //     selectedWorkspaces.some(ws => ws.key === x.workspaceKey) &&
  //     isCardInFilter(filters, x),
  //   [noteType, selectedWorkspaces, filters],
  //   {
  //     sort: SORT_BY[sortBy],
  //     name: 'listView',
  //     graphLayer: GraphLayer.NotDeleted,
  //   }
  // );
  // const partials = usePartialVertices(cardsQuery.results, ['isPinned']);
  // const mapped = useMemo(() => splitCards(partials), [partials]);
  const mapped = {
    pinned: pinnedCardsQuery.results,
    unpinned: unpinnedCardsQuery.results,
  };
  // const cards = useQueryProvider(ListCardsQueryProvider, {
  //   selectedWorkspaces: selectedWorkspaces.map(x => x.key),
  //   noteType,
  //   textSearch: '',
  //   sortBy,
  // });
  // if (cardsQuery.loading) {
  //   return null;
  // }

  if (!(mapped.pinned.length + mapped.unpinned.length)) {
    return <EmptyListState />;
  }
  return (
    <InnerListView
      noteType={noteType}
      className={className}
      sortBy={sortBy}
      cards={mapped}
    />
  );
}

const EMPTY_ARRAY: VertexManager<Note>[] = [];

// function getCardSize(containerWidth: number) {
//   return containerWidth < 640 ? CardSize.Small : CardSize.Regular;
// }

export function InnerListView({
  cards,
  sortBy,
  className,
  noteType,
}: {
  cards: CardsData;
  sortBy: SortBy;
  className?: string;
  noteType?: NoteType;
}) {
  const strings = useStrings();
  const styles = useStyles();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const eventLogger = useEventLogger();
  const toastController = useToastController();
  // const containerRef = useRef();
  const docRouter = useDocumentRouter();

  // const size = useElementSize(containerRef.current);
  // const cardSize = getCardSize(size.width);

  const onNoteSelected = useCallback(
    (note: VertexManager<Note>) => {
      docRouter.goTo(note);
    },
    [docRouter]
  );

  usePartialVertices(sortBy === SortBy.Priority ? cards.pinned : EMPTY_ARRAY, [
    'sortStamp',
  ]);
  usePartialVertices(
    sortBy === SortBy.Priority ? cards.unpinned : EMPTY_ARRAY,
    ['sortStamp']
  );
  const [draft, setDraft] = useState<VertexManager<Note>>(null);

  let visibleCards = cards.unpinned;
  if (sortBy === SortBy.Priority) {
    visibleCards = visibleCards.sort(sortMngStampCompare);
  }
  visibleCards = visibleCards.slice(0, limit).filter(x => x.key !== draft?.key);
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [sortBy]);
  // const onDrop = (
  //   item: VertexManager<Note>,
  //   relativeTo: VertexManager<Note>,
  //   dragPosition: DragPosition
  // ) => {
  //   console.log(`DROP`, item);
  //   return;
  //   setDragSort(visibleCards, item, relativeTo, dragPosition);
  // };
  const onDragStarted = () => {
    eventLogger.action('DRAG_STARTED', {
      category: EventCategory.CARD_LIST,
      source: DragSource.List,
    });
  };

  const onReportDrop = () => {
    eventLogger.action('DRAG_DONE', {
      category: EventCategory.CARD_LIST,
      source: DragSource.List,
    });
  };

  const onDragCancelled = ({ reason }) => {
    eventLogger.action('DRAG_CANCELLED', {
      category: EventCategory.CARD_LIST,
      source: DragSource.List,
      data: {
        reason,
      },
    });
    if (reason === CANCELLATION_REASONS.DISABLED) {
      toastController.displayToast({
        text: `Drag and drop is not supported in the selected sort mode`,
        duration: 5000,
      });
    }
  };
  let headerText = '';
  if (noteType === NoteType.Note) {
    headerText = cards.pinned.length
      ? strings.pinnedNotes
      : strings.pinNotesCta;
  } else if (noteType === NoteType.Task) {
    headerText = cards.pinned.length ? strings.pinnedTasks : strings.pinTaskCta;
  }
  return (
    <DragAndDropContext
      disabled={true}
      onDragStarted={onDragStarted}
      onDrop={onReportDrop}
      onDragCancelled={onDragCancelled}
    >
      <Scroller>
        {ref => (
          <div ref={ref} className={cn(styles.listRoot, className)}>
            <ItemsTable>
              {!!headerText && (
                <Row>
                  <LabelSm>{headerText}</LabelSm>
                </Row>
              )}

              {/* <Droppable items={cards.pinned} onDrop={onDrop}>
                    {({ attributes }) => (
                      <div {...attributes} style={{ display: 'contents' }}> */}
              {cards.pinned.map((c, index) => (
                <Draggable key={c.key} index={index} data={c}>
                  {(
                    draggableProps,
                    ref: React.MutableRefObject<HTMLTableRowElement>
                  ) => (
                    <ItemRow
                      index={index}
                      note={c}
                      key={c.key}
                      ref={ref}
                      onClick={onNoteSelected}
                      {...draggableProps}
                    />
                  )}
                </Draggable>
              ))}

              <Row>{/* <RaisedButton>Bla</RaisedButton> */}</Row>
              {noteType === NoteType.Task && (
                <InlineTaskButton draft={draft} setDraft={setDraft} />
              )}
              {visibleCards.map(c => (
                <ItemRow note={c} key={c.key} onClick={onNoteSelected} />
              ))}
            </ItemsTable>
            <InfiniteScroll
              limit={limit}
              setLimit={setLimit}
              pageSize={PAGE_SIZE}
              recordsLength={cards.unpinned.length}
              isVisible={true}
            />
            {/* <Droppable items={visibleCards} onDrop={onDrop}>
              {({ attributes }) => (
                <div {...attributes} ref={containerRef}>
                  {visibleCards.map((c, index) => (
                    <Draggable key={c.key} data={c} index={index}>
                      {(
                        draggableProps,
                        ref: React.MutableRefObject<HTMLDivElement>
                      ) => (
                        <DraggableCard
                          className={cn(styles.item)}
                          card={c}
                          size={cardSize}
                          ref={ref}
                          showChildCards={true}
                          {...draggableProps}
                        />
                      )}
                    </Draggable>
                  ))}
                </div>
              )}
            </Droppable>
            <InfiniteScroll
              limit={limit}
              setLimit={setLimit}
              pageSize={PAGE_SIZE}
              recordsLength={cards.length}
              isVisible={true}
            /> */}
          </div>
        )}
      </Scroller>
    </DragAndDropContext>
  );
}
