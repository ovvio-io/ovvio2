import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useContext,
} from 'react';
import * as SetUtils from '../../../../../../../base/set.ts';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { useFilteredNotes } from '../../../../../core/cfds/react/filter.ts';
import { usePartialView } from '../../../../../core/cfds/react/graph.tsx';
import { useQuery2 } from '../../../../../core/cfds/react/query.ts';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import { useDocumentRouter } from '../../../../../core/react-utils/index.ts';
import { Scroller } from '../../../../../core/react-utils/scrolling.tsx';
import { InfiniteVerticalScroll } from './infinite-scroll.tsx';
import { ItemsTable, SectionTable } from './table/grid.tsx';
import { Row, ItemRow } from './table/item.tsx';
import localization from './list.strings.json' assert { type: 'json' };
import { coreValueCompare } from '../../../../../../../base/core-types/comparable.ts';
import { CoreValue } from '../../../../../../../base/core-types/base.ts';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import { WorkspaceIndicatorCard } from '../kanban-view/index.tsx';
import { User } from '../../../../../../../cfds/client/graph/vertices/user.ts';
import { useDisable } from '../../../../index.tsx';
import { usePendingAction } from '../index.tsx';

const useStyles = makeStyles((theme) => ({
  item: {
    position: 'relative',
    marginBottom: '1px',
  },
  listRoot: {
    position: 'relative',
    height: '100%',
    overflowY: 'scroll',
    overflowX: 'clip',
  },
  multiSelectActive: {
    zIndex: 9,
  },
}));

const useStrings = createUseStrings(localization);

export interface ListViewNewProps {
  className?: string;
  selectedCards: Set<VertexManager<Note>>;
  setSelectedCards: (card: Set<VertexManager<Note>>) => void;
  handleSelectClick: (card: Note) => void;
}

const PAGE_SIZE = 10;

function headerForGroupId(gid: CoreValue): React.ReactNode {
  let header = null;
  const strings = useStrings();
  if (gid == null) {
    header = strings.unassigned;
  } else {
    if (typeof gid === 'string') {
      // deno-lint-ignore no-prototype-builtins
      if (strings.hasOwnProperty(gid)) {
        header = <div> {strings[gid as keyof typeof strings]}</div>;
      } else {
        header = <div> {gid}</div>;
      }
    }
    if (gid instanceof VertexManager) {
      const vert = gid.getVertexProxy();
      if (vert instanceof Workspace) {
        header = <WorkspaceIndicatorCard workspace={vert.manager} />;
      }
      if (vert instanceof User) {
        header = <div>{vert.name}</div>;
      }
    }
  }
  return header;
}

export function ListViewNew({
  className,
  handleSelectClick,
  selectedCards,
}: ListViewNewProps) {
  const styles = useStyles();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const filteredNotes = useFilteredNotes('listView');
  const docRouter = useDocumentRouter();
  const view = usePartialView(
    'groupBy',
    'noteType',
    'expandedGroupIds',
    'notesExpandOverride',
    'notesExpandBase',
  );
  const groupBy = view.groupBy;
  const expandedSection = view.expandedGroupIds;
  const pinnedQuery = useQuery2(filteredNotes[0]);
  const unpinnedQuery = useQuery2(filteredNotes[1]);

  const { isDisabled } = useDisable()!;
  const { pendingAction, setPendingAction } = usePendingAction();

  const onNoteSelected = useCallback(
    (note: VertexManager<Note>) => {
      docRouter.goTo(note);
    },
    [docRouter],
  );

  const groups = useMemo(() => {
    const s = new Set<CoreValue>();
    if (pinnedQuery) {
      SetUtils.update(s, pinnedQuery.groups());
    }
    if (unpinnedQuery) {
      SetUtils.update(s, unpinnedQuery.groups());
    }
    return Array.from(s).sort(
      (pinnedQuery || unpinnedQuery)?.groupComparator || coreValueCompare,
    );
  }, [pinnedQuery, unpinnedQuery]);

  let groupKey = '';
  const getGroupStringKey = (group: CoreValue, index: number): string => {
    return typeof group === 'string'
      ? group + { index }
      : group instanceof VertexManager
      ? group.getVertexProxy().name
      : 'Untitled';
  };

  return (
    <Scroller>
      {(ref) => (
        <div
          ref={ref}
          className={cn(
            styles.listRoot,
            isDisabled && styles.multiSelectActive,
            className,
          )}
        >
          {groups.slice(0, limit).map(
            (group, index) => (
              (groupKey = getGroupStringKey(group, index)),
              (
                <SectionTable
                  header={headerForGroupId(group)}
                  groupBy={groupBy}
                  key={groupKey}
                  allUnpinned={unpinnedQuery?.group(group)}
                  expandKey={groupKey}
                >
                  {pinnedQuery?.group(group).map((noteMgr) => (
                    <ItemRow
                      index={index}
                      note={noteMgr}
                      key={`list/pinned/row/${noteMgr.key}`}
                      onClick={onNoteSelected}
                      groupBy={groupBy}
                      nestingLevel={0}
                      handleSelectClick={handleSelectClick}
                      isSelected={selectedCards.has(noteMgr)}
                      multiIsActive={selectedCards.size > 0}
                      isInAction={pendingAction}
                    />
                  ))}

                  {pinnedQuery &&
                  pinnedQuery.group(group).length > 0 &&
                  unpinnedQuery &&
                  unpinnedQuery.group(group).length > 0 ? (
                    <div style={{ height: '8px' }}></div>
                  ) : undefined}
                  {unpinnedQuery
                    ?.group(group)
                    .slice(
                      0,
                      expandedSection.has(groupKey)
                        ? 100
                        : Math.max(
                            3 - (pinnedQuery?.group(group).length || 0),
                            0,
                          ),
                    )
                    .map((noteMgr) => (
                      <ItemRow
                        note={noteMgr}
                        key={`list/unpinned/row/${noteMgr.key}`}
                        onClick={onNoteSelected}
                        groupBy={groupBy}
                        nestingLevel={0}
                        handleSelectClick={handleSelectClick}
                        isSelected={selectedCards.has(noteMgr)}
                        multiIsActive={selectedCards.size > 0}
                        isInAction={pendingAction}
                      />
                    ))}
                </SectionTable>
              )
            ),
          )}
          <InfiniteVerticalScroll
            limit={limit}
            setLimit={setLimit}
            pageSize={PAGE_SIZE}
            recordsLength={unpinnedQuery?.count || 0}
            isVisible={false}
          />
        </div>
      )}
    </Scroller>
  );
}
