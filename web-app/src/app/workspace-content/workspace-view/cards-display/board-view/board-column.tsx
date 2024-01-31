import React, { useState, useEffect } from 'react';
import { VertexManager } from '../../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../../cfds/client/graph/vertices/note.ts';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import IconCreateNew from '../../../../../../../styles/components/icons/IconCreateNew.tsx';
import Layer from '../../../../../../../styles/components/layer.tsx';
import { H4 } from '../../../../../../../styles/components/texts.tsx';
import {
  makeStyles,
  cn,
} from '../../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../../styles/layout.ts';
import { styleguide } from '../../../../../../../styles/styleguide.ts';
import { useScrollParent } from '../../../../../core/react-utils/scrolling.tsx';
import { DroppableProps } from '../../../../../shared/dragndrop/droppable.tsx';
import { Droppable } from '../../../../../shared/dragndrop/index.ts';
import { lightColorWheel } from '../../../../../../../styles/theme.tsx';

const useStyles = makeStyles((theme) => ({
  column: {
    marginTop: styleguide.gridbase,
    position: 'relative',
    maxWidth: styleguide.gridbase * 40,
    minWidth: styleguide.gridbase * 30,
    flexShrink: 0,
    flexBasis: '33%',
    boxSizing: 'border-box',
    marginRight: styleguide.gridbase * 2,
    // backgroundColor: theme.background[400],
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
}));

export interface BoardColumnProps {
  title: string;
  onCreateCard?: () => void;
}

function ColumnTitle({ title, onCreateCard }: BoardColumnProps) {
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
            <H4 className={cn(styles.titleText)}>{title}</H4>
            <div className={cn(layout.flexSpacer)} />
            <Button onClick={onCreateCard}>
              <div className={cn(styles.newTaskText)}>New Task</div>
              <img
                key="IconNewTaskBoard"
                src="/icons/board/New-Task-plus.svg"
              />
              {/* <IconCreateNew /> */}
            </Button>
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

function Column({
  children,
  title,
  onCreateCard,
  ...rest
}: React.PropsWithChildren<BoardColumnProps>) {
  const styles = useStyles();
  return (
    <div className={cn(styles.column)} {...rest}>
      <ColumnTitle title={title} onCreateCard={onCreateCard} />
      <div className={cn(styles.columnContent)}>{children}</div>
    </div>
  );
}

export function BoardColumn({
  title,
  children,
  ...props
}: React.PropsWithChildren<
  Omit<DroppableProps<VertexManager<Note>>, 'children'> & BoardColumnProps
>) {
  // const filteredNotes = useFilteredNotes('listView');

  // const pinnedQuery = useQuery2(filteredNotes[0]);
  // const unpinnedQuery = useQuery2(filteredNotes[1]);

  return (
    <Droppable {...props}>
      {(droppableProps) => (
        <Column {...droppableProps.attributes} title={title}>
          {children}
        </Column>
      )}
    </Droppable>
  );
}
