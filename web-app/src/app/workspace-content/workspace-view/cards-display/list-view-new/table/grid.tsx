import React, { useEffect, useState } from 'react';
import {
  makeStyles,
  cn,
} from '../../../../../../../../styles/css-objects/index.ts';
import { styleguide } from '../../../../../../../../styles/styleguide.ts';
import { useScrollParent } from '../../../../../../core/react-utils/scrolling.tsx';
import Layer from '../../../../../../../../styles/components/layer.tsx';
import { layout } from '../../../../../../../../styles/layout.ts';
import { H4 } from '../../../../../../../../styles/components/typography.tsx';
import { lightColorWheel } from '../../../../../../../../styles/theme.tsx';
import { Row } from './item.tsx';

const useStyles = makeStyles((theme) => ({
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
    padding: styleguide.gridbase,
    ...styleguide.transition.short,
    transitionProperty: 'box-shadow',
    zIndex: '10',
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
  titleText: {},
  columnContent: {
    boxSizing: 'border-box',
    // padding: styleguide.gridbase,
    width: '100%',
  },
  item: {
    // marginBottom: styleguide.gridbase * 2,
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
}));

export enum GridColumns {
  DragAnchor = 'dragAnchor',
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

export const useGridStyles = makeStyles(
  () => ({
    container: {
      display: 'grid',
      gridTemplateColumns: [
        // [`[${GridColumns.DragAnchor}]`, styleguide.gridbase * 3],
        [`[${GridColumns.Type}]`, styleguide.gridbase * 4],
        [`[${GridColumns.Title}]`, 'minmax(min-content, auto)'],
        [`[${GridColumns.Expander}]`, styleguide.gridbase * 4],
        [`[${GridColumns.ContentIndicator}]`, styleguide.gridbase * 4],
        [`[${GridColumns.Workspace}]`, styleguide.gridbase * 10],
        [`[${GridColumns.Assignees}]`, 'max-content'],
        [`[${GridColumns.Tags}]`, 'max-content'],
        [
          `[${GridColumns.Extra}]`,
          `minmax(max-content, ${styleguide.gridbase * 20}px)`,
        ],
        [`[${GridColumns.DueDate}]`, 'max-content'],
        [`[${GridColumns.Pin}]`, styleguide.gridbase * 3],
        [`[${GridColumns.Menu}]`, styleguide.gridbase * 4],
      ],
      gridAutoRows: 'min-content',
      alignItems: 'stretch',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      paddingBottom: styleguide.gridbase,
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
      padding: [0, 0, styleguide.gridbase, 0],
    },
  }),
  'table_01387e'
);

export type ItemsTableProps = React.PropsWithChildren<{
  className?: string;
}>;

export function _ItemsTable({ children, className }: ItemsTableProps) {
  const styles = useGridStyles();
  return <div className={cn(styles.container)}>{children}</div>;
}

export function ItemsTable({ children, className }: ItemsTableProps) {
  const styles = useGridStyles();
  return (
    <table className={cn(styles.table)}>
      <tbody>{children}</tbody>
    </table>
  );
}

export type SectionTableProps = React.PropsWithChildren<{
  groupBy: string;
  header: React.ReactNode;
  isColumnHovered?: boolean;
  onCreateCard?: () => void;
  className?: string;
}>;

function SectionTitle({ header, onCreateCard }: SectionTableProps) {
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
    <Layer>
      {(style) => (
        <Row
          className={cn(styles.columnTitle, isSticky && styles.stickyShadow)}
          style={{ position: 'sticky' }}
        >
          <div className={cn(styles.columnHeader)}>
            <H4 className={cn(styles.titleText)}>{header}</H4>
            <div className={cn(layout.flexSpacer)} />
            {/* <Button onClick={onCreateCard}>
              {isColumnHovered && (
                <div className={cn(styles.newTaskText)}>New Task</div>
              )}
              <img
                key="IconNewTaskBoard"
                src="/icons/board/New-Task-plus.svg"
              />
            </Button> */}
          </div>
          <div
            className={cn(styles.stickyNotifier)}
            ref={(ref) => setSentinel(ref!)}
          />
        </Row>
      )}
    </Layer>
  );
}

export function SectionTable({ groupBy, children, header }: SectionTableProps) {
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  // const styles = useStyles();

  const handleMouseEnter = () => {
    setIsSectionHovered(true);
  };
  const handleMouseLeave = () => {
    setIsSectionHovered(false);
  };

  const styles = useGridStyles();
  return (
    <table
      className={cn(styles.table)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SectionTitle
        header={header}
        groupBy={groupBy}
        isColumnHovered={isSectionHovered}
        onCreateCard={() => {}}
      />
      <tbody>{children}</tbody>
    </table>
  );
}
