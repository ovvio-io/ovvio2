import { between, past, present } from '@ovvio/cfds/lib/base/orderstamp';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { useAnimateHeight } from 'core/react-utils/animate';
import React, { useMemo, useRef } from 'react';
import { RenderDraggableProps } from 'shared/dragndrop/draggable';
import { DragPosition } from 'shared/dragndrop/droppable';
import { styleguide } from '@ovvio/styles/lib';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { CardItem, CardItemProps } from '.';

const useStyles = makeStyles(theme => ({
  noMargin: {
    margin: 0,
  },
  draggableCard: {
    position: 'relative',
  },
  draggedIndicator: {
    position: 'absolute',
    width: '100%',
    height: styleguide.gridbase * 0.5,
    backgroundColor: theme.primary[400],
  },
  'drag-top': {
    top: 0,
  },
  'drag-bottom': {
    bottom: 0,
  },
  dragAnimator: {
    ...styleguide.transition.short,
    transitionProperty: 'height',
  },
  hide: {
    height: 0,
    overflow: 'hidden',
  },
}));

export function setDragSort(
  items: VertexManager<Note>[],
  item: VertexManager<Note>,
  relativeTo: VertexManager<Note>,
  dragPosition: DragPosition
) {
  if (!items.length) {
    return;
  }
  const index = items.indexOf(relativeTo);
  const nextIndex = dragPosition.y === 'top' ? index - 1 : index + 1;
  let nextStamp: string;
  if (nextIndex < 0) {
    nextStamp = present();
  } else if (nextIndex >= items.length) {
    nextStamp = past();
  } else {
    const x = items[nextIndex].getVertexProxy();
    nextStamp = x.sortStamp;
  }
  const relativeStamp = relativeTo.getVertexProxy().sortStamp;
  const newSortStamp = between(relativeStamp, nextStamp);
  item.getVertexProxy().sortStamp = newSortStamp;
}

export const DraggableCard = React.forwardRef(function (
  {
    attributes,
    isInDrag,
    isDragActive,
    dragPosition,
    dropOverBefore,
    placeholderStyle,
    isDraggedOver,
    className,
    ...cardProps
  }: CardItemProps & RenderDraggableProps,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const styles = useStyles();
  const dragRef = useRef();
  const { height } = useAnimateHeight(dragRef, isInDrag);
  const style = useMemo(
    () => (isDragActive ? { height: isInDrag ? 0 : height } : {}),
    [isInDrag, height, isDragActive]
  );
  return (
    <div
      ref={ref}
      className={cn(
        className,
        styles.draggableCard,
        isInDrag && styles.noMargin
      )}
      {...attributes}
    >
      <div
        ref={dragRef}
        style={style}
        className={cn(styles.dragAnimator, isInDrag && styles.hide)}
      >
        <CardItem {...cardProps} />
        {isDraggedOver && (
          <div
            className={cn(
              styles.draggedIndicator,
              dragPosition && styles[`drag-${dragPosition.y}`]
            )}
          />
        )}
      </div>
    </div>
  );
});
