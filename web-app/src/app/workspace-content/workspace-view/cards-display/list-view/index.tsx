import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'https://esm.sh/react@18.2.0';
import {
  Query,
  SortDescriptor,
  UnionQuery,
} from '../../../../../../../cfds/client/graph/query.ts';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import {
  Note,
  NoteType,
} from '../../../../../../../cfds/client/graph/vertices/note.ts';
import {
  sortMngStampCompare,
  sortStampCompare,
} from '../../../../../../../cfds/client/sorting.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import { useToastController } from '../../../../../../../styles/components/toast/index.tsx';
import { LabelSm } from '../../../../../../../styles/components/typography.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import {
  useExistingQuery,
  useQuery,
} from '../../../../../core/cfds/react/query.ts';
import { usePartialVertices } from '../../../../../core/cfds/react/vertex.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { useDocumentRouter } from '../../../../../core/react-utils/index.ts';
import { Scroller } from '../../../../../core/react-utils/scrolling.tsx';
import {
  CANCELLATION_REASONS,
  DragAndDropContext,
  Draggable,
  DragSource,
} from '../../../../../shared/dragndrop/index.ts';
import { EmptyListState } from './empty-state.tsx';
import { InfiniteScroll } from './infinite-scroll.tsx';
import { InlineTaskButton } from './inline-task-button.tsx';
import localization from './list.strings.json' assert { type: 'json' };
import { SortBy } from './sort-by.ts';
import { ItemRow, ItemsTable, Row } from './table/index.tsx';
import { useGraphManager } from '../../../../../core/cfds/react/graph.tsx';
import { Tag } from '../../../../../../../cfds/client/graph/vertices/tag.ts';

export { SortBy };

const useStyles = makeStyles((theme) => ({
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
  className?: string;
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

function noteInFilter(note: Note): boolean {
  if (!note.workspace.selected) {
    return false;
  }
  let hasSelectedTag;
}

function noteInFilter(
  note: Note,
  selectedWorkspacesQuery: Query,
  selectedTagsQuery: Query,
  selectedUsersQuery: Query
): boolean {
  if (
    selectedWorkspacesQuery.count === 0 ||
    !selectedWorkspacesQuery.hasVertex(note.workspace)
  ) {
    return false;
  }
}

export function ListView({ noteType, sortBy, className }: ListViewProps) {
  const graph = useGraphManager();
  const selectedWorkspacesQuery = useExistingQuery(
    graph.sharedQueriesManager.selectedWorkspacesQuery
  );
  const selectedTagsQuery = useExistingQuery(
    graph.sharedQueriesManager.selectedTagsQuery
  );
  const selectedUsersQuery = useExistingQuery(
    graph.sharedQueriesManager.selectedUsersQuery
  );
  const q = usePartialVertices(selectedWorkspacesQuery.results, [
    'notesQuery',
    'pinnedNotesQuery',
  ]);
  const unpinnedSource = useMemo(
    () => new UnionQuery(q.map((x) => x.notesQuery, 'notesUnion')),
    [q]
  );
  const unpinnedCardsQuery = useQuery(
    (x: Note) =>
      x.type === noteType &&
      x.parentType !== NoteType.Task &&
      !x.isPinned &&
      noteInFilter(
        x,
        selectedWorkspacesQuery.query,
        selectedTagsQuery.query,
        selectedUsersQuery.query
      )[(noteType, selectedWorkspacesQuery, selectedTagsQuery)],
    {
      sort: SORT_BY[sortBy],
      name: 'listViewUnpinned',
      source: unpinnedSource,
    }
  );

  const pinnedSource = useMemo(
    () => new UnionQuery(q.map((x) => x.pinnedNotesQuery, 'pinnedNotesUnion')),
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
  visibleCards = visibleCards
    .slice(0, limit)
    .filter((x) => x.key !== draft?.key);
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
        {(ref) => (
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
              {visibleCards.map((c) => (
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
