import React, { useEffect, useMemo, useState } from 'react';
import * as SetUtils from '../../../../../../../base/set.ts';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../../styles/layout.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import { useFilteredNotes } from '../../../../../core/cfds/react/filter.ts';
import { usePartialView } from '../../../../../core/cfds/react/graph.tsx';
import { Scroller } from '../../../../../core/react-utils/scrolling.tsx';
import { useQuery2 } from '../../../../../core/cfds/react/query.ts';

import { createUseStrings } from '../../../../../core/localization/index.tsx';
import localization from './board.strings.json' assert { type: 'json' };
import { KanbanColumn } from './kanban-column.tsx';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { CardSize, KanbanCard } from './kanban-card.tsx';
import {
  InfiniteHorizontalScroll,
  InfiniteVerticalScroll,
} from '../list-view/infinite-scroll.tsx';
import { CoreValue } from '../../../../../../../base/core-types/base.ts';
import { coreValueCompare } from '../../../../../../../base/core-types/comparable.ts';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import {
  Note,
  User,
} from '../../../../../../../cfds/client/graph/vertices/index.ts';
import { VertexId } from '../../../../../../../cfds/client/graph/vertex.ts';
import Tooltip from '../../../../../../../styles/components/tooltip/index.tsx';
import { usePartialVertex } from '../../../../../core/cfds/react/vertex.ts';
import { CheckIcon } from '../../../../workspaces-bar/index.tsx';
import { useWorkspaceColor } from '../../../../../shared/workspace-icon/index.tsx';
import { resolveWritingDirection } from '../../../../../../../base/string.ts';
import { usePendingAction } from '../index.tsx';
import { useDisable } from '../../../../index.tsx';

const useStyles = makeStyles((theme) => ({
  boardRoot: {
    position: 'relative',
    overflowY: 'auto',
    height: '100%',
    paddingBottom: styleguide.gridbase * 2,
    boxSizing: 'border-box',
    alignItems: 'flex-start',
    basedOn: [layout.row],
  },
  listItem: {
    height: styleguide.gridbase * 4,
    flexShrink: 0,
    basedOn: [layout.row],
  },
  listItemSelected: {
    itemTab: {
      backgroundColor: 'var(--ws-background)',
    },
  },
  itemTab: {
    cursor: 'pointer',
    userSelect: 'none',
    height: '100%',
    width: '100%',
    minWidth: styleguide.gridbase * 18.5,
    borderBottomRightRadius: styleguide.gridbase * 2,
    borderTopRightRadius: styleguide.gridbase * 2,
    // maxWidth: styleguide.gridbase * 20.5,
    maxWidth: 'fit-content',
    paddingLeft: styleguide.gridbase,
    paddingRight: styleguide.gridbase,
    boxSizing: 'border-box',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    basedOn: [layout.row],
  },
  itemText: {
    overflowX: 'hidden',
    flexGrow: 1,
    flexShrink: 1,
    textOverflow: 'ellipsis',
    fontSize: '13px',
    fontWeight: '400',
    width: '100%',
  },
  itemToggle: {
    marginLeft: styleguide.gridbase * 0.5,
    height: styleguide.gridbase * 2,
    width: styleguide.gridbase * 2,
    borderRadius: styleguide.gridbase,
    flexShrink: 0,
    background: 'var(--ws-active)',
    basedOn: [layout.column, layout.centerCenter],
  },
  rtl: {
    direction: 'rtl',
    textAlign: 'left',
  },
  multiSelectActive: {
    zIndex: 9,
  },
}));
const useStrings = createUseStrings(localization);
const PAGE_SIZE = 10;
export interface WorkspaceIndicatorCardProps {
  workspace: VertexManager<Workspace>;
}
export function WorkspaceIndicatorCard({
  workspace,
}: WorkspaceIndicatorCardProps) {
  const styles = useStyles();
  const { name } = usePartialVertex(workspace, ['name']);
  const color = useWorkspaceColor(workspace);
  const internalStyle = useMemo<any>(
    () => ({
      '--ws-background': color.background,
      '--ws-inactive': color.inactive,
      '--ws-active': color.active,
    }),
    [color],
  );
  const dir = resolveWritingDirection(name);
  return (
    <div
      className={cn(styles.listItem, styles.listItemSelected)}
      style={internalStyle}
    >
      <Tooltip text={name} disabled={true} position="right">
        <div className={cn(styles.itemTab)}>
          <div className={cn(styles.itemText, dir === 'rtl' && styles.rtl)}>
            {name}
          </div>
          <div className={cn(styles.itemToggle)}>
            <CheckIcon />
          </div>
        </div>
      </Tooltip>
    </div>
  );
}

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

interface KanbanViewProps {
  className?: string;
  selectedCards: Set<VertexManager<Note>>;
  setSelectedCards: (card: Set<VertexManager<Note>>) => void;
  handleSelectClick: (card: Note) => void;
}
export function KanbanView({
  className,
  handleSelectClick,
  selectedCards,
}: KanbanViewProps) {
  const styles = useStyles();
  const view = usePartialView('groupBy');
  const groupBy = view.groupBy;
  const filteredNotes = useFilteredNotes('BoardView');
  const pinnedQuery = useQuery2(filteredNotes[0]);
  const unpinnedQuery = useQuery2(filteredNotes[1]);
  const { isDisabled } = useDisable()!;
  const { pendingAction, setPendingAction } = usePendingAction();

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
        <div
          ref={ref}
          className={cn(
            styles.boardRoot,
            isDisabled && styles.multiSelectActive,
            className,
          )}
        >
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
                ?.group(group)
                .slice(0, yLimit)
                .map((noteMgr) => (
                  <KanbanCard
                    card={noteMgr}
                    size={CardSize.Small}
                    key={noteMgr.key}
                    showWorkspaceOnCard={showWorkspaceOnCard}
                    handleSelectClick={handleSelectClick}
                    isSelected={selectedCards.has(noteMgr)}
                    multiIsActive={selectedCards.size > 0}
                    isInAction={pendingAction}
                  />
                ))}
              {pinnedQuery && pinnedQuery.group(group).length > 0 && (
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
                    handleSelectClick={handleSelectClick}
                    isSelected={selectedCards.has(noteMgr)}
                    multiIsActive={selectedCards.size > 0}
                    isInAction={pendingAction}
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
            recordsLength={unpinnedQuery?.groupCount || 0}
            isVisible={false}
          />
        </div>
      )}
    </Scroller>
  );
}
