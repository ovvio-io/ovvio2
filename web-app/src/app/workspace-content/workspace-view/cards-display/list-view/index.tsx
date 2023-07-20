import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { NoteType } from '@ovvio/cfds/lib/client/graph/vertices/note';
import { styleguide } from '@ovvio/styles/lib';
import { useToastController } from '@ovvio/styles/lib/components/toast';
import { LabelSm } from '@ovvio/styles/lib/components/typography';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { EventCategory, useEventLogger } from 'core/analytics';
import { useQuery2 } from 'core/cfds/react/query';
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
import { EmptyListState } from './empty-state';
import { InfiniteVerticalScroll } from './infinite-scroll';
import { InlineTaskButton } from './inline-task-button';
import localization from './list.strings.json';
import { ItemRow, ItemsTable, Row } from './table';
import { usePartialView } from 'core/cfds/react/graph';
import { FilteredNotes, useFilteredNotes } from 'core/cfds/react/filter';
import { Query } from '@ovvio/cfds/lib/client/graph/query';
import { Vertex } from '@ovvio/cfds/lib/client/graph/vertex';

// export { SortBy };

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
  className?: string;
}

const PAGE_SIZE = 20;

export function ListView({ className }: ListViewProps) {
  const filteredNotes = useFilteredNotes('listView');
  return (
    <ListViewInternal className={className} filteredNotes={filteredNotes} />
  );
}

interface ListViewInternalProps extends ListViewProps {
  filteredNotes: FilteredNotes;
}

function ListViewInternal({ className, filteredNotes }: ListViewInternalProps) {
  const strings = useStrings();
  const styles = useStyles();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const eventLogger = useEventLogger();
  const toastController = useToastController();
  // const containerRef = useRef();
  const docRouter = useDocumentRouter();
  const view = usePartialView('noteType');

  const pinnedQuery = useQuery2(filteredNotes[0]);
  const unpinnedQuery: Query<Vertex, Note> | undefined = useQuery2(
    filteredNotes[1]
  );

  const onNoteSelected = useCallback(
    (note: VertexManager<Note>) => {
      docRouter.goTo(note);
    },
    [docRouter]
  );

  useEffect(() => {
    if (unpinnedQuery) {
      unpinnedQuery.limit = limit + PAGE_SIZE;
    }
  }, [unpinnedQuery, limit]);

  console.log('==== Unpinned count: ' + (unpinnedQuery?.count || 0));

  const [draft, setDraft] = useState<VertexManager<Note>>(null);

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

  // if (unpinnedQuery.isLoading || pinnedQuery.isLoading) {
  //   return null;
  // }

  let headerText = '';
  if (view.noteType === NoteType.Note) {
    headerText =
      pinnedQuery.count > 0 ? strings.pinnedNotes : strings.pinNotesCta;
  } else if (view.noteType === NoteType.Task) {
    headerText =
      pinnedQuery.count > 0 ? strings.pinnedTasks : strings.pinTaskCta;
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
              {pinnedQuery?.map((c, index) => (
                <Draggable
                  key={`list/pinned/draggable/${c.key}`}
                  index={index}
                  data={c}
                >
                  {(
                    draggableProps,
                    ref: React.MutableRefObject<HTMLTableRowElement>
                  ) => (
                    <ItemRow
                      index={index}
                      note={c.manager}
                      ref={ref}
                      key={`list/pinned/row/${c.key}`}
                      onClick={onNoteSelected}
                      {...draggableProps}
                    />
                  )}
                </Draggable>
              ))}

              <Row>{/* <RaisedButton>Bla</RaisedButton> */}</Row>
              {view.noteType === NoteType.Task && (
                <InlineTaskButton
                  key={`list/inline-task`}
                  draft={draft}
                  setDraft={setDraft}
                />
              )}
              {unpinnedQuery?.results.slice(0, limit).map(c => (
                <ItemRow
                  note={c}
                  key={`list/unpinned/row/${c.key}`}
                  onClick={onNoteSelected}
                />
              ))}
            </ItemsTable>
            <InfiniteVerticalScroll
              limit={limit}
              setLimit={setLimit}
              pageSize={PAGE_SIZE}
              recordsLength={unpinnedQuery?.count || 0}
              isVisible={false}
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
