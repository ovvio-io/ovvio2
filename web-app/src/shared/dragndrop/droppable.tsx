import React from 'react';
import CANCELLATION_REASONS from './cancellation-reasons.tsx';
import { useDndContext } from './context.tsx';

const DROP_ZONE = 'DROP_ZONE';

export const dropZoneContext = React.createContext<string>('');

// function getDragId(el) {
//   let dragId = el.dataset.dragId;
//   while (!dragId && el.parentElement) {
//     el = el.parentElement;
//     dragId = el.dataset.dragId;
//   }
//   return dragId;
// }

export type DragPosition = {
  x: 'left' | 'right';
  y: 'top' | 'bottom';
};

export interface RenderDroppableProps {
  attributes: any;
  isInDrag: boolean;
  isDragOver: boolean;
}

export type RenderDroppableHandler = (
  props: RenderDroppableProps
) => React.ReactNode;

export type AllowsDropResult = {
  isAllowed: boolean;
  context?: any;
};

function isAllowsDropResult(
  result: boolean | AllowsDropResult
): result is AllowsDropResult {
  return typeof result !== 'boolean';
}

export interface DroppableProps<T> {
  children: RenderDroppableHandler | React.ReactNode;
  allowsDrop?: (item: any) => boolean | AllowsDropResult | boolean;
  items: readonly T[];
  onDrop: (item: T, relativeTo: T, dragPosition: DragPosition) => void;
}
export function Droppable<T>({
  children,
  allowsDrop = (item) => !!item,
  items,
  onDrop,
}: DroppableProps<T>) {
  const { id, ctx } = useDndContext(DROP_ZONE);
  const onDropImpl = (e: DragEvent) => {
    const { dragOverData, disabled, dragData } = ctx.state;
    if (!dragData) {
      return ctx.onDragCancelled!({
        reason: CANCELLATION_REASONS.USER_CANCELLED,
      });
    }
    if (disabled) {
      return ctx.onDragCancelled!({
        reason: CANCELLATION_REASONS.DISABLED,
      });
    }
    if (!dragOverData || dragOverData.dropZone !== id) {
      return ctx.onDragCancelled!({
        reason: CANCELLATION_REASONS.NO_DATA,
      });
    }
    const item = ctx.state.dragData?.data;
    if (!item) {
      return ctx.onDragCancelled!({
        reason: CANCELLATION_REASONS.NO_DATA,
      });
    }
    // if (
    //   dragOverData.index === ctx.state.dragData.index ||
    //   dragOverData.index === ctx.state.dragData.index - 1
    // ) {
    //   return ctx.onDragCancelled({
    //     reason: CANCELLATION_REASONS.USER_CANCELLED,
    //   });
    // }
    let relativeTo = items[dragOverData.index];
    const { dragPosition } = dragOverData;
    const res = typeof allowsDrop === 'boolean' ? allowsDrop : allowsDrop(item);
    if ((isAllowsDropResult(res) && !res.isAllowed) || !res) {
      return ctx.onDragCancelled!({
        reason: CANCELLATION_REASONS.NOT_ALLOWED,
        context: isAllowsDropResult(res) && res.context,
      });
    }
    if (item === relativeTo) {
      return ctx.onDragCancelled!({
        reason: CANCELLATION_REASONS.USER_CANCELLED,
      });
    }
    onDrop(item, relativeTo, dragPosition);
    ctx.onDrop!(item, relativeTo, dragPosition);
  };

  const onDragOver = (e: DragEvent) => {
    if (e.dataTransfer?.types.includes('text/ovvio')) {
      if (!ctx.state.dragData) {
        return;
      }
      e.preventDefault();
      if (!items.length) {
        ctx.setDragOverIndex!(0, { x: 'left', y: 'top' }, id);
      }
    }
  };
  const onDragLeave = (e: DragEvent) => {};

  const isInDrag = !!ctx.state.dragData;
  const isDragOver =
    ctx.state.dragOverData !== null && ctx.state.dragOverData.dropZone === id;

  const attributes = {
    onDragOver,
    onDragLeave,
    onDrop: onDropImpl,
    'data-drag-id': id,
  };

  return (
    <dropZoneContext.Provider value={id}>
      {typeof children === 'function'
        ? children({ attributes, isInDrag, isDragOver })
        : children}
    </dropZoneContext.Provider>
  );
}
