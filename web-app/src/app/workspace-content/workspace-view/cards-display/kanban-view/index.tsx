import React, { useEffect, useMemo, useState } from 'react';
import * as SetUtils from '../../../../../../../base/set.ts';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../../styles/layout.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import {
  DueDateColumn,
  FilteredNotes,
  useFilteredNotes,
} from '../../../../../core/cfds/react/filter.ts';
import { usePartialView } from '../../../../../core/cfds/react/graph.tsx';
import { Scroller } from '../../../../../core/react-utils/scrolling.tsx';
import { useQuery2 } from '../../../../../core/cfds/react/query.ts';
import { useToastController } from '../../../../../../../styles/components/toast/index.tsx';
import { createUseStrings } from '../../../../../core/localization/index.tsx';
import localization from './board.strings.json' assert { type: 'json' };
import { KanbanColumn } from './kanban-column.tsx';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { DragPosition } from '../../../../../shared/dragndrop/droppable.tsx';
import { CardSize, KanbanCard } from './kanban-card.tsx';
import { Row } from '../list-view/table/item.tsx';
import {
  InfiniteHorizontalScroll,
  InfiniteVerticalScroll,
} from '../list-view/infinite-scroll.tsx';
import { WorkspaceIndicator } from '../../../../../../../components/workspace-indicator.tsx';
import { Query } from '../../../../../../../cfds/client/graph/query.ts';
import { CoreValue } from '../../../../../../../base/core-types/base.ts';
import { coreValueCompare } from '../../../../../../../base/core-types/comparable.ts';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import { User } from '../../../../../../../cfds/client/graph/vertices/index.ts';

const useStyles = makeStyles((theme) => ({
  boardRoot: {
    overflowY: 'auto',
    height: '100%',
    paddingBottom: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    alignItems: 'flex-start',
    basedOn: [layout.row], // TODO: change to display flex
  },
}));
const useStrings = createUseStrings(localization);
const PAGE_SIZE = 10;

function headerForGroupId(gid: CoreValue): React.ReactNode {
  let header = null;
  if (typeof gid === 'string') {
    header = <div> {gid}</div>;
  }
  if (gid instanceof VertexManager) {
    const vert = gid.getVertexProxy();
    if (vert instanceof Workspace) {
      header = <WorkspaceIndicator workspace={vert} />;
    }
    if (vert instanceof User) {
      header = <div>{vert.name}</div>;
    }
  }
  return header;
}

export function KanbanView({ className }: { className?: string }) {
  const styles = useStyles();
  const view = usePartialView('groupBy');

  const groupBy = view.groupBy;

  const filteredNotes = useFilteredNotes('BoardView');
  const pinnedQuery = useQuery2(filteredNotes[0]);
  const unpinnedQuery = useQuery2(filteredNotes[1]);

  const groups = useMemo(() => {
    const s = new Set<CoreValue>();
    if (pinnedQuery) {
      SetUtils.update(s, pinnedQuery.groups());
    }
    if (unpinnedQuery) {
      SetUtils.update(s, unpinnedQuery.groups());
    }
    return Array.from(s).sort(coreValueCompare);
  }, [pinnedQuery, unpinnedQuery]);

  const strings = useStrings();
  const [yLimit, setYLimit] = useState(PAGE_SIZE);
  const [xLimit, setXLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    if (unpinnedQuery) {
      unpinnedQuery.limit = yLimit + PAGE_SIZE;
      unpinnedQuery.groupsLimit = xLimit + PAGE_SIZE;
    }
  }, [unpinnedQuery, yLimit, xLimit]);

  let maxColSize = 0;
  if (unpinnedQuery) {
    //TODO: need to change to union of pinned and unpinned.
    for (const gid of unpinnedQuery.groups()) {
      maxColSize = Math.max(maxColSize, unpinnedQuery.countForGroup(gid));
    }
  }

  let showWorkspaceOnCard: boolean = true;
  if (groupBy === 'workspace') {
    showWorkspaceOnCard = false;
  }
  return (
    <Scroller>
      {(ref) => (
        <div ref={ref} className={cn(styles.boardRoot, className)}>
          {groups.slice(0, xLimit).map((group, index) => (
            <KanbanColumn
              header={headerForGroupId(group)}
              key={
                typeof group === 'string'
                  ? group + { index }
                  : group instanceof VertexManager
                  ? group.getVertexProxy().name
                  : 'Untitled'
              }
              groupBy={groupBy}
            >
              {pinnedQuery
                .group(group)
                .slice(0, yLimit)
                .map((noteMgr) => (
                  <KanbanCard
                    card={noteMgr}
                    size={CardSize.Small}
                    key={noteMgr.key}
                    showWorkspaceOnCard={showWorkspaceOnCard}
                  />
                ))}
              {pinnedQuery.group(group).length > 0 && (
                <div style={{ height: '16px' }}></div>
              )}

              {unpinnedQuery
                ?.group(group)
                .slice(0, yLimit)
                .map((noteMgr, index) => (
                  <KanbanCard
                    card={noteMgr}
                    size={CardSize.Small}
                    key={noteMgr.key + index}
                    showWorkspaceOnCard={showWorkspaceOnCard}
                  />
                ))}
            </KanbanColumn>
          ))}
          <InfiniteVerticalScroll
            limit={yLimit}
            setLimit={setYLimit}
            pageSize={PAGE_SIZE}
            recordsLength={maxColSize}
            isVisible={false}
          />
          <InfiniteHorizontalScroll
            limit={xLimit}
            setLimit={setXLimit}
            pageSize={PAGE_SIZE}
            recordsLength={unpinnedQuery.groupCount}
            isVisible={false}
          />
        </div>
      )}
    </Scroller>
  );
}
