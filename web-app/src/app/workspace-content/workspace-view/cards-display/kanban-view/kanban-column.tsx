import React, { useState, useEffect } from 'react';
import Layer from '../../../../../../../styles/components/layer.tsx';
import { H4 } from '../../../../../../../styles/components/texts.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../../styles/layout.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import { useScrollParent } from '../../../../../core/react-utils/scrolling.tsx';
import { lightColorWheel } from '../../../../../../../styles/theme.tsx';

const useStyles = makeStyles((theme) => ({
  column: {
    marginTop: styleguide.gridbase,
    position: 'relative',
    maxWidth: styleguide.gridbase * 34,
    minWidth: styleguide.gridbase * 30,
    flexShrink: 0,
    flexBasis: '33%',
    boxSizing: 'border-box',
    marginRight: styleguide.gridbase * 3 + 1,
    backgroundColor: lightColorWheel.secondary.s1,
    borderRadius: '4px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: lightColorWheel.secondary.s2,
    padding: [0, 0, styleguide.gridbase, 0],
    hoverableRow: {
      ':hover': {
        backgroundColor: '#F5ECDC',
      },
    },
  },
  columnHeader: {
    alignItems: 'center',
    basedOn: [layout.row],
  },
  columnTitle: {
    background: 'inherit',
    position: 'sticky',
    top: 0,
    padding: [styleguide.gridbase, 0, styleguide.gridbase, 0],
    ...styleguide.transition.short,
    transitionProperty: 'box-shadow',
  },
  TextTitle: {
    padding: '0px 0px 0px 8px',
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
  newTaskText: {
    color: '#3184DD',
    fontSize: '10px',
    fontWeight: '400',
    lineHeight: '14px',
    letterSpacing: '-0.1px',
    gap: '4px',
  },
}));

export interface KanbanColumnProps {
  groupBy: string;
  header: React.ReactNode;
  isColumnHovered?: boolean;
  onCreateCard?: () => void;
}

function ColumnTitle({ header, onCreateCard, groupBy }: KanbanColumnProps) {
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
        <div
          className={cn(styles.columnTitle, isSticky && styles.stickyShadow)}
          style={style}
        >
          <div className={cn(styles.columnHeader)}>
            <H4
              className={cn(
                styles.titleText,
                groupBy !== 'workspace' && styles.TextTitle
              )}
            >
              {header}
            </H4>
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
        </div>
      )}
    </Layer>
  );
}

export function KanbanColumn({
  groupBy,
  children,
  header,
}: React.PropsWithChildren<KanbanColumnProps>) {
  const styles = useStyles();
  const [isColumnHovered, setIsColumnHovered] = useState(false);
  const handleMouseEnter = () => {
    setIsColumnHovered(true);
  };
  const handleMouseLeave = () => {
    setIsColumnHovered(false);
  };
  return (
    <div
      className={cn(styles.column)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ColumnTitle
        header={header}
        groupBy={groupBy}
        isColumnHovered={isColumnHovered}
        onCreateCard={() => {}}
      />
      <div>{children}</div>
    </div>
  );
}
