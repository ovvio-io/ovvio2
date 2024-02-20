import React, { useCallback, useEffect, useState } from 'react';
import {
  makeStyles,
  cn,
} from '../../../../../../../../styles/css-objects/index.ts';
import { styleguide } from '../../../../../../../../styles/styleguide.ts';
import { useScrollParent } from '../../../../../../core/react-utils/scrolling.tsx';
import Layer from '../../../../../../../../styles/components/layer.tsx';
import { layout } from '../../../../../../../../styles/layout.ts';
import {
  H4,
  useTypographyStyles,
} from '../../../../../../../../styles/components/typography.tsx';
import { lightColorWheel } from '../../../../../../../../styles/theme.tsx';
import { Row } from './item.tsx';
import { Button } from '../../../../../../../../styles/components/buttons.tsx';
import { ExpanderIcon } from '../../../../../workspaces-bar/index.tsx';
import { QueryResults } from '../../../../../../../../cfds/client/graph/query.ts';
import { Note } from '../../../../../../../../cfds/client/graph/vertices/note.ts';
import { brandLightTheme as theme } from '../../../../../../../../styles/theme.tsx';
import { treeIsSubtree } from '../../../../../../../../cfds/richtext/tree.ts';
import { usePartialView } from '../../../../../../core/cfds/react/graph.tsx';
import { Workspace } from '../../../../../../../../cfds/client/graph/vertices/workspace.ts';

const useStyles = makeStyles((theme) => ({
  container: {
    display: 'grid',
  },
  table: {
    width: '100%',
    // borderCollapse: 'collapse',
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
    // padding: styleguide.gridbase,
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
    padding: [0, styleguide.gridbase * 2],
    boxSizing: 'border-box',
    alignItems: 'left',
    gap: '4px',
    basedOn: [layout.row],
    color: 'black',
    ':disabled': {
      color: 'grey',
    },
  },
  expanderText: {
    color: 'inherit',
    basedOn: [layout.flexSpacer, useTypographyStyles.bold],
    textAlign: 'left',
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

function SectionTitle({ header, onCreateCard, isHovered }: SectionTableProps) {
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
        <div className={cn(styles.titleText)}>{header}</div>
        <div className={cn(layout.flexSpacer)} />
        <Button onClick={onCreateCard}>
          {isHovered && <div className={cn(styles.newTaskText)}>New Task</div>}
          <img key="IconNewTaskBoard" src="/icons/board/New-Task-plus.svg" />
        </Button>
      </div>
    </div>
  );
}

export function SectionTable({
  groupBy,
  children,
  header,
  allUnpinned,
  expandKey,
}: SectionTableProps) {
  const styles = useStyles();
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const view = usePartialView('expandedGroupIds');

  const handleMouseEnter = () => {
    setIsSectionHovered(true);
  };
  const handleMouseLeave = () => {
    setIsSectionHovered(false);
  };

  const toggleExpanded = useCallback(
    (section: string) => {
      console.log(typeof section);

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
      <Button
        className={cn(styles.expander)}
        disabled={allUnpinned && allUnpinned.length - 3 > 0 ? false : true}
        onClick={() => toggleExpanded(expandKey)}
      >
        <div className={cn(styles.expanderText)}>
          Show More
          {allUnpinned && allUnpinned.length - 3 > 0
            ? ` [${allUnpinned.length}]`
            : ' 0'}
        </div>
        <ExpanderIcon
          className={cn(
            styles.expanderIcon,
            expanded && styles.expanderIconOpen
          )}
        />
      </Button>{' '}
    </div>
  );
}

// import React, { useEffect, useState } from 'react';
// import {
//   makeStyles,
//   cn,
// } from '../../../../../../../../styles/css-objects/index.ts';
// import { styleguide } from '../../../../../../../../styles/styleguide.ts';
// import { useScrollParent } from '../../../../../../core/react-utils/scrolling.tsx';
// import Layer from '../../../../../../../../styles/components/layer.tsx';
// import { layout } from '../../../../../../../../styles/layout.ts';
// import { H4 } from '../../../../../../../../styles/components/typography.tsx';
// import { lightColorWheel } from '../../../../../../../../styles/theme.tsx';
// import { Row } from './item.tsx';
// import { Button } from '../../../../../../../../styles/components/buttons.tsx';

// const useStyles = makeStyles((theme) => ({
//   column: {
//     marginTop: styleguide.gridbase,
//     position: 'relative',
//     flexShrink: 0,
//     flexBasis: '33%',
//     boxSizing: 'border-box',
//     marginRight: styleguide.gridbase * 2,
//     backgroundColor: lightColorWheel.secondary.s1,
//     borderRadius: '4px',
//     borderStyle: 'solid',
//     borderWidth: '1px',
//     borderColor: lightColorWheel.secondary.s2,
//     padding: [0, 0, styleguide.gridbase, 0],
//   },
//   columnHeader: {
//     alignItems: 'center',
//     basedOn: [layout.row],
//   },
//   columnTitle: {
//     background: 'inherit',
//     position: 'sticky',
//     top: 0,
//     padding: styleguide.gridbase,
//     ...styleguide.transition.short,
//     transitionProperty: 'box-shadow',
//     zIndex: '10',
//   },
//   stickyShadow: {
//     boxShadow: theme.shadows.z1,
//   },
//   stickyNotifier: {
//     backgroundColor: 'yellow',
//     position: 'absolute',
//     visibility: 'hidden',
//     width: '100%',
//     top: -styleguide.gridbase,
//     height: 1,
//   },
//   titleText: {
//     color: '#000',
//     fontSize: '14px',
//     fontWeight: '600',
//     letterSpacing: '0.087px',
//     lineHeight: '21px',
//     padding: styleguide.gridbase,
//   },
//   columnContent: {
//     boxSizing: 'border-box',
//     padding: styleguide.gridbase,
//     width: '100%',
//   },

//   newTaskText: {
//     color: '#3184DD',
//     fontSize: '10px',
//     fontWeight: '400',
//     lineHeight: '14px',
//     letterSpacing: '-0.1px',
//     gap: '4px',
//   },
//   hoverableRow: {
//     ':hover': {
//       backgroundColor: '#F5ECDC',
//     },
//   },
// }));

// export enum GridColumns {
//   Type = 'icon',
//   Title = 'title',
//   Expander = 'expander',
//   ContentIndicator = 'contentIndicator',
//   Workspace = 'workspace',
//   Assignees = 'assignees',
//   Tags = 'tags',
//   Extra = 'extra',
//   DueDate = 'dueDate',
//   Pin = 'pin',
//   Menu = 'menu',
// }

// export const useGridStyles = makeStyles(
//   () => ({
//     container: {
//       display: 'grid',
//     },
//     table: {
//       width: '100%',
//       // borderCollapse: 'collapse',
//       paddingBottom: styleguide.gridbase,
//       ':hover': {
//         backgroundColor: '#F5ECDC',
//       },
//       marginTop: styleguide.gridbase,
//       flexShrink: 0,
//       boxSizing: 'border-box',
//       marginRight: styleguide.gridbase * 2,
//       backgroundColor: lightColorWheel.secondary.s1,
//       borderRadius: '4px',
//       borderStyle: 'solid',
//       borderWidth: '2px',
//       borderColor: lightColorWheel.secondary.s2,
//       padding: [0, 0, styleguide.gridbase, 0],
//     },
//   }),
//   'table_01387e'
// );

// export type ItemsTableProps = React.PropsWithChildren<{
//   className?: string;
// }>;

// export function _ItemsTable({ children, className }: ItemsTableProps) {
//   const styles = useGridStyles();
//   return <div className={cn(styles.container)}>{children}</div>;
// }

// export function ItemsTable({ children, className }: ItemsTableProps) {
//   const styles = useGridStyles();
//   return (
//     <table className={cn(styles.table)}>
//       <tbody>{children}</tbody>
//     </table>
//   );
// }

// export type SectionTableProps = React.PropsWithChildren<{
//   groupBy: string;
//   header: React.ReactNode;
//   isColumnHovered?: boolean;
//   onCreateCard?: () => void;
//   className?: string;
// }>;

// function SectionTitle({ header, onCreateCard }: SectionTableProps) {
//   const styles = useStyles();
//   const [sentinel, setSentinel] = useState<HTMLDivElement>();
//   const scrollParent = useScrollParent();
//   const [isSticky, setIsSticky] = useState(false);
//   const [isColumnHovered, setIsColumnHovered] = useState(false);
//   const handleMouseEnter = () => {
//     setIsColumnHovered(true);
//   };
//   const handleMouseLeave = () => {
//     setIsColumnHovered(false);
//   };
//   useEffect(() => {
//     if (!sentinel) {
//       return;
//     }

//     const observer = new IntersectionObserver(
//       (records) => {
//         for (const record of records) {
//           const targetInfo = record.boundingClientRect;
//           const rootBoundsInfo = record.rootBounds;
//           if (targetInfo.bottom < rootBoundsInfo!.top) {
//             setIsSticky(true);
//           }

//           if (
//             targetInfo.bottom > rootBoundsInfo!.top &&
//             targetInfo.bottom < rootBoundsInfo!.bottom
//           ) {
//             setIsSticky(false);
//           }
//         }
//       },
//       { threshold: [0], root: scrollParent }
//     );
//     observer.observe(sentinel);
//     return () => {
//       observer.disconnect();
//     };
//   }, [sentinel, scrollParent]);

//   return (
//     <Row
//       className={cn(styles.columnTitle, isSticky && styles.stickyShadow)}
//       style={{ position: 'sticky' }}
//       onMouseEnter={handleMouseEnter}
//       onMouseLeave={handleMouseLeave}
//     >
//       <div className={cn(styles.columnHeader)}>
//         <div className={cn(styles.titleText)}>{header}</div>
//         <div className={cn(layout.flexSpacer)} />
//         <Button onClick={onCreateCard}>
//           {isColumnHovered && (
//             <div className={cn(styles.newTaskText)}>New Task</div>
//           )}
//           <img key="IconNewTaskBoard" src="/icons/board/New-Task-plus.svg" />
//         </Button>
//       </div>
//     </Row>
//   );
// }

// export function SectionTable({ groupBy, children, header }: SectionTableProps) {
//   const [isSectionHovered, setIsSectionHovered] = useState(false);

//   const handleMouseEnter = () => {
//     setIsSectionHovered(true);
//   };
//   const handleMouseLeave = () => {
//     setIsSectionHovered(false);
//   };

//   const styles = useGridStyles();
//   return (
//     <table
//       className={cn(styles.table)}
//       onMouseEnter={handleMouseEnter}
//       onMouseLeave={handleMouseLeave}
//     >
//       <SectionTitle
//         header={header}
//         groupBy={groupBy}
//         isColumnHovered={isSectionHovered}
//         onCreateCard={() => {}}
//       />
//       <tbody>{children}</tbody>
//     </table>
//   );
// }
