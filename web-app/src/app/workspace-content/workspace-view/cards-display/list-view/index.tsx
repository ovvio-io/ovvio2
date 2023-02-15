import React, { useCallback, useState } from 'https://esm.sh/react@18.2.0';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  NoteType,
} from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import { useToastController } from '../../../../../../../styles/components/toast/index.tsx';
import { LabelSm } from '../../../../../../../styles/components/typography.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { useDocumentRouter } from '../../../../../core/react-utils/index.ts';
import { Scroller } from '../../../../../core/react-utils/scrolling.tsx';
import {
  CANCELLATION_REASONS,
  DragAndDropContext,
  Draggable,
} from '../../../../../shared/dragndrop/index.ts';
import { EmptyListState } from './empty-state.tsx';
import { InfiniteScroll } from './infinite-scroll.tsx';
import { InlineTaskButton } from './inline-task-button.tsx';
import localization from './list.strings.json' assert { type: 'json' };
import { ItemRow, ItemsTable, Row } from './table/index.tsx';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { useFilter } from '../../../../index.tsx';
import { useQuery2 } from '../../../../../core/cfds/react/query.ts';
import { RenderDraggableProps } from '../../../../../shared/dragndrop/draggable.tsx';

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
  className?: string;
}

const PAGE_SIZE = 20;

interface CardsData {
  pinned: readonly VertexManager<Note>[];
  unpinned: readonly VertexManager<Note>[];
}

export function ListView({ className }: ListViewProps) {
  const filter = useFilter();
  const pinnedNotesQuery = useQuery2(filter.buildQuery('listViewPinned', true));
  const unpinnedNotesQuery = useQuery2(
    filter.buildQuery('listViewUnpinned', false)
  );
  if (pinnedNotesQuery.count + unpinnedNotesQuery.count <= 0) {
    return <EmptyListState />;
  }
  return (
    <InnerListView
      noteType={filter.noteType}
      className={className}
      cards={{
        pinned: pinnedNotesQuery.results,
        unpinned: unpinnedNotesQuery.results,
      }}
    />
  );
}

const EMPTY_ARRAY: VertexManager<Note>[] = [];

// function getCardSize(containerWidth: number) {
//   return containerWidth < 640 ? CardSize.Small : CardSize.Regular;
// }

export function InnerListView({
  cards,
  className,
  noteType,
}: {
  cards: CardsData;
  className?: string;
  noteType?: NoteType;
}) {
  const strings = useStrings();
  const styles = useStyles();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const logger = useLogger();
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

  // usePartialVertices(sortBy === SortBy.Priority ? cards.pinned : EMPTY_ARRAY, [
  //   'sortStamp',
  // ]);
  // usePartialVertices(
  //   sortBy === SortBy.Priority ? cards.unpinned : EMPTY_ARRAY,
  //   ['sortStamp']
  // );
  const [draft, setDraft] = useState<null | VertexManager<Note>>(null);

  let visibleCards = cards.unpinned;
  // if (sortBy === SortBy.Priority) {
  //   visibleCards = visibleCards.sort(sortMngStampCompare);
  // }
  visibleCards = visibleCards
    .slice(0, limit)
    .filter((x) => x.key !== draft?.key);
  // useEffect(() => {
  //   setLimit(PAGE_SIZE);
  // }, [sortBy]);
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
    logger.log({
      severity: 'INFO',
      event: 'Start',
      flow: 'dnd',
      uiSource: 'list',
    });
  };

  const onReportDrop = () => {
    logger.log({
      severity: 'INFO',
      event: 'End',
      flow: 'dnd',
      uiSource: 'list',
    });
  };

  const onDragCancelled = ({ reason }: { reason: string }) => {
    logger.log({
      severity: 'INFO',
      event: 'Cancel',
      flow: 'dnd',
      uiSource: 'list',
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
                    draggableProps: RenderDraggableProps,
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
                <InlineTaskButton draft={draft!} setDraft={setDraft} />
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
