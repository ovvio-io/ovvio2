import React, { useEffect, useState } from 'https://esm.sh/react@18.2.0';
import { layout, styleguide } from '../../../../../../../styles/index.ts';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import { IconCreateNew } from '../../../../../../../styles/components/icons/index.ts';
import Layer from '../../../../../../../styles/components/layer.tsx';
import { H4 } from '../../../../../../../styles/components/texts.tsx';
import {
  cn,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { useScrollParent } from '../../../../../core/react-utils/scrolling.tsx';
import {
  Droppable,
  DroppableProps,
} from '../../../../../shared/dragndrop/droppable.tsx';

const useStyles = makeStyles((theme) => ({
  column: {
    marginTop: styleguide.gridbase,
    position: 'relative',
    maxWidth: styleguide.gridbase * 40,
    minWidth: styleguide.gridbase * 30,
    flexShrink: 0,
    flexBasis: '33%',
    boxSizing: 'border-box',
    marginRight: styleguide.gridbase,
    backgroundColor: theme.background[400],
    borderRadius: 4,
  },
  columnHeader: {
    paddingBottom: styleguide.gridbase,
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
    padding: styleguide.gridbase,
    width: '100%',
  },
  item: {
    marginBottom: styleguide.gridbase * 2,
  },
}));

export interface BoardColumnProps<T> extends DroppableProps<T> {
  title: string;
  onCreateCard?: () => void;
  children: React.ReactNode;
}

export interface ColumnTitleProps {
  title: string;
  onCreateCard?: () => void;
}

function ColumnTitle({ title, onCreateCard }: ColumnTitleProps) {
  const styles = useStyles();
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
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
          if (targetInfo.bottom < (rootBoundsInfo?.top || 0)) {
            setIsSticky(true);
          }

          if (
            targetInfo.bottom > (rootBoundsInfo?.top || 0) &&
            targetInfo.bottom < (rootBoundsInfo?.bottom || 0)
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
            {onCreateCard && (
              <Button onClick={onCreateCard}>
                <IconCreateNew />
              </Button>
            )}
          </div>
          <div
            className={cn(styles.stickyNotifier)}
            ref={(ref) => setSentinel(ref)}
          />
        </div>
      )}
    </Layer>
  );
}

export function Column<T>({
  children,
  title,
  onCreateCard,
  ...rest
}: BoardColumnProps<T>) {
  const styles = useStyles();
  return (
    <div className={cn(styles.column)} /*{...rest}*/>
      <ColumnTitle title={title} onCreateCard={onCreateCard} {...rest} />
      <div className={cn(styles.columnContent)}>{children}</div>
    </div>
  );
}

// export const BoardColumn: React.FC<
//   Omit<DroppableProps<VertexManager<Note>>, 'children'> & BoardColumnProps
// > = ({ title, children, ...props }) => {
export function BoardColumn<T>({
  title,
  children,
  ...props
}: BoardColumnProps<T>) {
  return (
    <Droppable<T> {...props}>
      {(droppableProps) => (
        <Column {...droppableProps.attributes} title={title}>
          {children}
        </Column>
      )}
    </Droppable>
  );
}
