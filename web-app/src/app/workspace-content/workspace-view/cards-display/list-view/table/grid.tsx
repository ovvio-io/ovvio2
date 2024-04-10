import React, { useCallback, useEffect, useState } from 'react';
import {
  makeStyles,
  cn,
} from '../../../../../../../../styles/css-objects/index.ts';
import { styleguide } from '../../../../../../../../styles/styleguide.ts';
import { useScrollParent } from '../../../../../../core/react-utils/scrolling.tsx';
import { layout } from '../../../../../../../../styles/layout.ts';
import { lightColorWheel } from '../../../../../../../../styles/theme.tsx';
import { Row } from './item.tsx';
import { Button } from '../../../../../../../../styles/components/buttons.tsx';
import { ExpanderIcon } from '../../../../../workspaces-bar/index.tsx';
import { QueryResults } from '../../../../../../../../cfds/client/graph/query.ts';
import { Note } from '../../../../../../../../cfds/client/graph/vertices/note.ts';
import { brandLightTheme as theme } from '../../../../../../../../styles/theme.tsx';
import { usePartialView } from '../../../../../../core/cfds/react/graph.tsx';

const useStyles = makeStyles((theme) => ({
  container: {
    display: 'grid',
  },
  table: {
    width: '100%',
    ':hover': {
      backgroundColor: '#F5ECDC',
    },
    marginTop: styleguide.gridbase,
    flexShrink: 0,
    boxSizing: 'border-box',
    marginRight: styleguide.gridbase * 2,
    backgroundColor: lightColorWheel.secondary.s1,
    borderRadius: '4px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: lightColorWheel.secondary.s2,
  },
  column: {
    marginTop: styleguide.gridbase,
    position: 'relative',
    flexShrink: 0,
    flexBasis: '33%',
    boxSizing: 'border-box',
    marginRight: styleguide.gridbase * 2,
    backgroundColor: lightColorWheel.secondary.s1,
    borderRadius: '4px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: lightColorWheel.secondary.s2,
    padding: [0, 0, styleguide.gridbase, 0],
  },
  columnHeader: {
    alignItems: 'center',
    basedOn: [layout.row],
  },
  columnTitle: {
    background: 'inherit',
    position: 'sticky',
    top: 0,
    ...styleguide.transition.short,
    transitionProperty: 'box-shadow',
    zIndex: '1',
  },
  stickyShadow: {
    boxShadow: theme.shadows.z1,
  },
  stickyNotifier: {
    backgroundColor: 'yellow',
    position: 'absolute',
    visibility: 'hidden',
    width: '100%',
    top: -styleguide.gridbase,
    height: 1,
  },
  titleText: {
    color: '#000',
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '0.087px',
    lineHeight: '21px',
    padding: styleguide.gridbase,
  },
  wsTitle: {
    paddingTop: styleguide.gridbase,
    paddingBottom: styleguide.gridbase,
    paddingLeft: 0,
  },
  columnContent: {
    boxSizing: 'border-box',
    padding: styleguide.gridbase,
    width: '100%',
  },
  newTaskText: {
    color: '#3184DD',
    fontSize: '10px',
    fontWeight: '400',
    lineHeight: '14px',
    letterSpacing: '-0.1px',
    gap: '4px',
  },
  hoverableRow: {
    ':hover': {
      backgroundColor: '#F5ECDC',
    },
  },
  expander: {
    height: styleguide.gridbase * 4,
    width: '100%',
    padding: [0, styleguide.gridbase * 2],
    boxSizing: 'border-box',
    alignItems: 'left',
    gap: '4px',
    color: 'black',
    ':disabled': {
      color: 'grey',
    },
    display: 'flex',
    justifyContent: 'flex-start',
  },
  expanderText: {
    color: 'inherit',
    textAlign: 'left',
    fontWeight: 500,
    fontSize: '14px',
  },
  expanderIcon: {
    color: 'inherit',
    marginRight: styleguide.gridbase,
    transform: 'rotate(90deg)',
  },
  expanderIconOpen: {
    transform: 'rotate(270deg)',
  },
}));

export enum GridColumns {
  Type = 'icon',
  Title = 'title',
  Expander = 'expander',
  ContentIndicator = 'contentIndicator',
  Workspace = 'workspace',
  Assignees = 'assignees',
  Tags = 'tags',
  Extra = 'extra',
  DueDate = 'dueDate',
  Pin = 'pin',
  Menu = 'menu',
}

export type ItemsTableProps = React.PropsWithChildren<{
  className?: string;
}>;

export function _ItemsTable({ children, className }: ItemsTableProps) {
  const styles = useStyles();
  return <div className={cn(styles.container)}>{children}</div>;
}

export function ItemsTable({ children, className }: ItemsTableProps) {
  const styles = useStyles();
  return (
    <div className={cn(styles.table)}>
      <div>{children}</div>
    </div>
  );
}

function SectionTitle({
  header,
  onCreateCard,
  isHovered,
  groupBy,
}: SectionTableProps) {
  const styles = useStyles();
  const [sentinel, setSentinel] = useState<HTMLDivElement>();
  const scrollParent = useScrollParent();
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          const targetInfo = record.boundingClientRect;
          const rootBoundsInfo = record.rootBounds;
          if (targetInfo.bottom < rootBoundsInfo!.top) {
            setIsSticky(true);
          }

          if (
            targetInfo.bottom > rootBoundsInfo!.top &&
            targetInfo.bottom < rootBoundsInfo!.bottom
          ) {
            setIsSticky(false);
          }
        }
      },
      { threshold: [0], root: scrollParent }
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [sentinel, scrollParent]);

  return (
    <div
      className={cn(styles.columnTitle, isSticky && styles.stickyShadow)}
      style={{ position: 'sticky' }}
    >
      <div className={cn(styles.columnHeader)}>
        <div
          className={cn(
            styles.titleText,
            groupBy === 'workspace' && styles.wsTitle
          )}
        >
          {header}
        </div>
        <div className={cn(layout.flexSpacer)} />
        {/* <Button onClick={onCreateCard}>
          {isHovered && <div className={cn(styles.newTaskText)}>New Task</div>}
          <img key="IconNewTaskBoard" src="/icons/board/New-Task-plus.svg" />
        </Button> */}
      </div>
    </div>
  );
}
interface ShowMoreButtonProps {
  allUnpinned: QueryResults<Note> | undefined;
  expandKey: string;
  show?: boolean;
}

const ShowMoreButton: React.FC<ShowMoreButtonProps> = ({
  allUnpinned,
  expandKey,
  show,
}) => {
  const styles = useStyles();
  const view = usePartialView('expandedGroupIds');

  const toggleExpandedShowMore = useCallback(
    (section: string) => {
      const expandedGroupIds = view.expandedGroupIds;
      if (expandedGroupIds.has(section)) {
        expandedGroupIds.delete(section);
      } else if (section) {
        expandedGroupIds.add(section);
      }
    },
    [view]
  );

  const expanded = view.expandedGroupIds.has(expandKey);

  return (
    <Button
      className={cn(styles.expander)}
      disabled={allUnpinned && allUnpinned.length - 3 > 0 ? false : true}
      onClick={() => toggleExpandedShowMore(expandKey)}
    >
      {show ? (
        <>
          <div className={cn(styles.expanderText)}>
            {expanded ? 'Show Less' : !expanded ? 'Show More ' : undefined}
            {expanded
              ? undefined
              : ` [${
                  allUnpinned && (allUnpinned.length - 3).toLocaleString()
                }]`}
          </div>
          <ExpanderIcon
            className={cn(
              styles.expanderIcon,
              expanded && styles.expanderIconOpen
            )}
          />
        </>
      ) : undefined}
    </Button>
  );
};

export type SectionTableProps = React.PropsWithChildren<{
  groupBy: string;
  header: React.ReactNode;
  isHovered?: boolean;
  onCreateCard?: () => void;
  className?: string;
  allUnpinned?: QueryResults<Note> | undefined;
  groupString?: string;
  expandKey: string;
}>;

export function SectionTable({
  groupBy,
  children,
  header,
  allUnpinned,
  expandKey,
}: SectionTableProps) {
  const styles = useStyles();
  const [isSectionHovered, setIsSectionHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsSectionHovered(true);
  };
  const handleMouseLeave = () => {
    setIsSectionHovered(false);
  };

  return (
    <div
      className={cn(styles.table)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SectionTitle
        header={header}
        groupBy={groupBy}
        isHovered={isSectionHovered}
        onCreateCard={() => {}}
        expandKey={''}
      />
      <div>{children}</div>
      <ShowMoreButton
        allUnpinned={allUnpinned}
        expandKey={expandKey}
        show={allUnpinned && allUnpinned.length - 3 > 0}
      />
    </div>
  );
}
