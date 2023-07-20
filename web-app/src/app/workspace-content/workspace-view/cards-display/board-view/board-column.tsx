import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { layout, styleguide } from '@ovvio/styles/lib';
import { Button } from '@ovvio/styles/lib/components/buttons';
import { IconCreateNew } from '@ovvio/styles/lib/components/icons';
import Layer from '@ovvio/styles/lib/components/layer';
import { H4 } from '@ovvio/styles/lib/components/texts';
import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { useScrollParent } from 'core/react-utils/scrolling';
import { useEffect, useState } from 'react';
import { Droppable, DroppableProps } from 'shared/dragndrop/droppable';

const useStyles = makeStyles(theme => ({
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
      records => {
        for (const record of records) {
          const targetInfo = record.boundingClientRect;
          const rootBoundsInfo = record.rootBounds;
          if (targetInfo.bottom < rootBoundsInfo.top) {
            setIsSticky(true);
          }

          if (
            targetInfo.bottom > rootBoundsInfo.top &&
            targetInfo.bottom < rootBoundsInfo.bottom
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
      {style => (
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
            ref={ref => setSentinel(ref)}
          />
        </div>
      )}
    </Layer>
  );
}

const Column: React.FC<BoardColumnProps> = ({
  children,
  title,
  onCreateCard,
  ...rest
}) => {
  const styles = useStyles();
  return (
    <div className={cn(styles.column)} {...rest}>
      <ColumnTitle title={title} onCreateCard={onCreateCard} />
      <div className={cn(styles.columnContent)}>{children}</div>
    </div>
  );
};

export const BoardColumn: React.FC<
  Omit<DroppableProps<VertexManager<Note>>, 'children'> & BoardColumnProps
> = ({ title, children, ...props }) => {
  return (
    <Droppable {...props}>
      {droppableProps => (
        <Column {...droppableProps.attributes} title={title}>
          {children}
        </Column>
      )}
    </Droppable>
  );
};
