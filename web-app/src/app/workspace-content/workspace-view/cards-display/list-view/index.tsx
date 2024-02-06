import React, { useState, useCallback, useEffect } from 'react';
import { Query } from '../../../../../../../cfds/client/graph/query.ts';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Vertex } from '../../../../../../../cfds/client/graph/vertex.ts';
import {
  Note,
  NoteType,
} from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { useToastController } from '../../../../../../../styles/components/toast/index.tsx';
import { LabelSm } from '../../../../../../../styles/components/typography.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import {
  useFilteredNotes,
  FilteredNotes,
} from '../../../../../core/cfds/react/filter.ts';
import { usePartialView } from '../../../../../core/cfds/react/graph.tsx';
import { useQuery2 } from '../../../../../core/cfds/react/query.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { useDocumentRouter } from '../../../../../core/react-utils/index.ts';
import { Scroller } from '../../../../../core/react-utils/scrolling.tsx';
import CANCELLATION_REASONS from '../../../../../shared/dragndrop/cancellation-reasons.tsx';
import { Draggable } from '../../../../../shared/dragndrop/draggable.tsx';
import {
  DragSource,
  DragAndDropContext,
} from '../../../../../shared/dragndrop/index.ts';
import { InfiniteVerticalScroll } from './infinite-scroll.tsx';
import { InlineTaskButton } from './inline-task-button.tsx';
import { ItemsTable } from './table/grid.tsx';
import { Row, ItemRow } from './table/item.tsx';
import localization from './list.strings.json' assert { type: 'json' };
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';

const useStyles = makeStyles((theme) => ({
  item: {
    position: 'relative',
    marginBottom: '1px',
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
  const logger = useLogger();
  const toastController = useToastController();
  // const containerRef = useRef();
  const docRouter = useDocumentRouter();
  const view = usePartialView('noteType');

  const pinnedQuery = useQuery2(filteredNotes[0]);
  const unpinnedQuery = useQuery2(filteredNotes[1]);
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

  const [draft, setDraft] = useState<VertexManager<Note> | null>(null);

  const onDragStarted = () => {};

  const onReportDrop = () => {};

  const onDragCancelled = ({ reason }: { reason: string }) => {
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
              {/* {view.noteType === NoteType.Task && (
                <InlineTaskButton
                  key={`list/inline-task`}
                  draft={draft}
                  setDraft={setDraft}
                />
              )} */}
              {unpinnedQuery?.results.slice(0, limit).map((c) => (
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
