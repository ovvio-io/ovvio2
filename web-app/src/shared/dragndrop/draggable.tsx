import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { MutableRefObject } from 'https://esm.sh/v96/@types/react@18.0.21/index.d.ts';
import CANCELLATION_REASONS from './cancellation-reasons.tsx';
import { useDndContext } from './context.tsx';
import { DragPosition, dropZoneContext } from './droppable.tsx';
import { serializeId, throttle, useDragPositionCalculator } from './util.ts';

type TypeOf<T, K extends keyof T> = T[K];

export interface RenderDraggableProps {
  attributes: any;
  isInDrag: boolean;
  isDragActive: boolean;
  dragPosition: DragPosition;
  dropOverBefore: boolean;
  placeholderStyle: any;
  isDraggedOver: boolean;
}

export type RenderDraggableHandler<TElement extends HTMLElement> = (
  props: RenderDraggableProps,
  ref: React.MutableRefObject<TElement>
) => JSX.Element;

export interface DraggableProps<TElement extends HTMLElement> {
  children: RenderDraggableHandler<TElement>;
  data: any;
  index: number;
  effectAllowed?: TypeOf<TypeOf<DragEvent, 'dataTransfer'>, 'effectAllowed'>;
}

export function Draggable<TElement extends HTMLElement = HTMLDivElement>({
  children,
  data,
  index,
  effectAllowed = 'all',
}: DraggableProps<TElement>) {
  const { id, ctx } = useDndContext(data);
  const { disabled } = ctx.state;
  const [isInDrag, setIsInDrag] = useState(false);
  const dropZoneId = useContext(dropZoneContext);
  const calcPosition = useDragPositionCalculator(
    ctx.state.dragData?.dropZone === dropZoneId
  );
  const [dragPosition, setDragPosition] = useState<undefined | DragPosition>(
    undefined
  );
  // const isInDrag =
  //   ctx.state.dragData &&
  //   ctx.state.dragData.dropZone === dropZoneId &&
  //   ctx.state.dragData.index === index;

  useEffect(() => {
    const val =
      ctx.state.dragData?.dropZone === dropZoneId &&
      ctx.state.dragData?.index === index;
    let cancelled = false;
    requestAnimationFrame(() => {
      if (!cancelled) {
        setIsInDrag(val);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ctx, dropZoneId, index]);
  const ref = useRef<TElement>();
  const placeHolder = useRef<TElement>();

  const onDragStart = (e: DragEvent) => {
    if (placeHolder.current) {
      placeHolder.current.remove();
      placeHolder.current = undefined;
    }
    const serialized = serializeId(id);
    e.dataTransfer?.setData('text/ovvio', serialized);
    e.dataTransfer.effectAllowed = effectAllowed;
    let placeholderStyle = {};
    if (ref.current) {
      const el = ref.current.cloneNode(true) as TElement;
      placeHolder.current = el;
      el.style.position = 'absolute';
      el.style.top = '-99999px';
      const rect = ref.current.getBoundingClientRect();
      el.style.width = rect.width + 'px';
      el.style.height = rect.height + 'px';
      el.style.cursor = 'grabbing';
      el.style.display = 'grid';
      document.body.appendChild(el);
      placeholderStyle = {
        height: rect.height,
      };
      e.dataTransfer?.setDragImage(
        el,
        e.clientX - rect.left,
        e.clientY - rect.top
      );
    }

    ctx.onDragStarted(data, index, dropZoneId, placeholderStyle);
  };

  const onDragEnter = useCallback(
    (e: DragEvent) => {
      if (!ctx.state.dragData) {
        return;
      }
      const pos = calcPosition(e);
      if (pos) {
        setDragPosition(pos);
        ctx.setDragOverIndex(index, pos, dropZoneId);
      }
    },
    [ctx, calcPosition, index, dropZoneId]
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onDragOver = useCallback(
    throttle((e: DragEvent) => {
      if (!ctx.state.dragData) {
        return;
      }
      setDragPosition((current) => {
        const pos = calcPosition(e, current);
        if (pos) {
          ctx.setDragOverIndex(index, pos, dropZoneId);
          return pos;
        }
        return current;
      });
    }, 100),
    [ctx, calcPosition, index, dropZoneId]
  );

  const onDragLeave = (e: DragEvent) => {};

  const onDrop = (e: DragEvent) => {};

  const onDragEnd = (e: DragEvent) => {
    if (placeHolder.current) {
      placeHolder.current.remove();
      placeHolder.current = undefined;
    }
    // setIsInDrag(false);
    if (e.dataTransfer?.dropEffect === 'none') {
      ctx.onDragCancelled({
        reason: CANCELLATION_REASONS.USER_CANCELLED,
      });
    }
  };

  const dropOverBefore =
    ctx.state.dragOverData &&
    ctx.state.dragOverData.dropZone === dropZoneId &&
    ctx.state.dragOverData.index < index;

  const attributes = {
    onDragStart,
    draggable: !disabled,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDragEnd,
    onDrop,
    'data-drag-id': id,
    'data-drag-index': index,
  };

  return children(
    {
      attributes,
      isInDrag,
      isDragActive: ctx.state.dragData?.dropZone === dropZoneId,
      dragPosition: dragPosition!,
      dropOverBefore: dropOverBefore!,
      isDraggedOver:
        ctx.state.dragOverData?.dropZone === dropZoneId &&
        ctx.state.dragOverData?.index === index,
      placeholderStyle:
        (ctx.state.dragData && ctx.state.dragData.placeholderStyle) || {},
    },
    ref as MutableRefObject<TElement>
  );
}
