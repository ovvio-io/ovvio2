import React, { useState, useCallback, useEffect, useMemo } from 'react';
import * as SetUtils from '../../../../../../../base/set.ts';
import { Query } from '../../../../../../../cfds/client/graph/query.ts';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Vertex } from '../../../../../../../cfds/client/graph/vertex.ts';
import {
  Note,
  NoteType,
} from '../../../../../../../cfds/client/graph/vertices/note.ts';
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
import { InfiniteVerticalScroll } from './infinite-scroll.tsx';
import { ItemsTable, SectionTable } from './table/grid.tsx';
import { Row, ItemRow } from './table/item.tsx';
import localization from './list.strings.json' assert { type: 'json' };
import { coreValueCompare } from '../../../../../../../base/core-types/comparable.ts';
import { CoreValue } from '../../../../../../../base/core-types/base.ts';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import { WorkspaceIndicatorCard } from '../kanban-view/index.tsx';
import { User } from '../../../../../../../cfds/client/graph/vertices/user.ts';

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

export interface ListViewNewProps {
  className?: string;
}

const PAGE_SIZE = 5;

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
        header = <WorkspaceIndicatorCard workspace={vert} />;
      }
      if (vert instanceof User) {
        header = <div>{vert.name}</div>;
      }
    }
  }
  return header;
}
export function ListViewNew({ className }: ListViewNewProps) {
  const styles = useStyles();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const filteredNotes = useFilteredNotes('listView');
  const docRouter = useDocumentRouter();
  const view = usePartialView('noteType', 'expandedGroupIds');
  const groupBy = view.groupBy;
  const expandedSection = view.expandedGroupIds;
  const pinnedQuery = useQuery2(filteredNotes[0]);
  const unpinnedQuery = useQuery2(filteredNotes[1]);

  const onNoteSelected = useCallback(
    (note: VertexManager<Note>) => {
      docRouter.goTo(note);
    },
    [docRouter]
  );
  const [yLimit, setYLimit] = useState(3);

  useEffect(() => {
    if (unpinnedQuery) {
      unpinnedQuery.limit = limit + PAGE_SIZE;
    }
  }, [unpinnedQuery, limit]);

  const groups = useMemo(() => {
    const s = new Set<CoreValue>();
    if (pinnedQuery) {
      SetUtils.update(s, pinnedQuery.groups());
    }
    if (unpinnedQuery) {
      SetUtils.update(s, unpinnedQuery.groups());
    }
    return Array.from(s).sort(
      (pinnedQuery || unpinnedQuery)?.groupComparator || coreValueCompare
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
        <div ref={ref} className={cn(styles.listRoot, className)}>
          {groups.map(
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
                    />
                  ))}
                  {unpinnedQuery && pinnedQuery && (
                    <div style={{ height: '8px' }}></div>
                  )}
                  {unpinnedQuery
                    ?.group(group)
                    .slice(0, expandedSection.has(groupKey) ? 100 : 3)
                    .map((noteMgr) => (
                      <ItemRow
                        note={noteMgr}
                        key={`list/unpinned/row/${noteMgr.key}`}
                        onClick={onNoteSelected}
                        groupBy={groupBy}
                      />
                    ))}
                </SectionTable>
              )
            )
          )}
          <InfiniteVerticalScroll
            limit={limit}
            setLimit={setLimit}
            pageSize={PAGE_SIZE}
            recordsLength={unpinnedQuery?.count || 0}
            isVisible={true}
          />
        </div>
      )}
    </Scroller>
  );
}
