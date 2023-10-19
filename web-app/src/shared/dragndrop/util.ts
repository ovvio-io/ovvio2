import React, { useCallback, useEffect, useRef } from 'react';
import { DragPosition } from './droppable.tsx';

export function serializeId(id) {
  return id;
}

export const DragPositions = {
  TopLeft: {
    x: 'left',
    y: 'top',
  } as DragPosition,
  TopRight: {
    x: 'right',
    y: 'top',
  } as DragPosition,
  BottomLeft: {
    x: 'left',
    y: 'bottom',
  } as DragPosition,
  BottomRight: {
    x: 'right',
    y: 'bottom',
  } as DragPosition,
};

const PosMap: {
  [pos in 'top' | 'bottom']: { [x in 'left' | 'right']: DragPosition };
} = {
  top: {
    left: DragPositions.TopLeft,
    right: DragPositions.TopRight,
  },
  bottom: {
    left: DragPositions.BottomLeft,
    right: DragPositions.BottomRight,
  },
};

export function deserializeId(id: string): string | undefined {
  if (!id || !id.startsWith('ovvdnd:')) {
    return;
  }

  return id.substring('ovvdnd:'.length);
}

// function parsePx(val) {
//   if (!val) {
//     return 0;
//   }
//   if (val.endsWith('px')) {
//     return parseFloat(val.substring(0, val.length - 2));
//   }
//   throw new Error(`unsupported css value ${val}`);
// }

function getBoundingBoxes(el) {
  const rect = el.getBoundingClientRect();
  return rect;
  // const style = window.getComputedStyle(el);

  // const outside = ['Top', 'Bottom', 'Left', 'Right']
  //   .map(dir => {
  //     const padding = parsePx(style[`padding${dir}`]);
  //     const margin = parsePx(style[`margin${dir}`]);
  //     const border = parsePx(style[`border${dir}Width`]);

  //     return {
  //       [`padding${dir}`]: padding,
  //       [`margin${dir}`]: margin,
  //       [`border${dir}`]: border,
  //     };
  //   })
  //   .reduce((accum, val) => ({
  //     ...accum,
  //     ...val,
  //   }));

  // const marginHeight = rect.height + outside.marginTop + outside.marginBottom;
  // const marginWidth = rect.width + outside.marginLeft + outside.marginRight;

  // const marginX = rect.x - outside.marginLeft;
  // const marginY = rect.y - outside.marginTop;

  // return {
  //   top: rect.top,
  //   left: rect.left,
  //   right: rect.right,
  //   bottom: rect.bottom,
  //   x: rect.x,
  //   y: rect.y,
  //   height: rect.height,
  //   width: rect.width,
  //   ...outside,
  //   marginHeight,
  //   marginWidth,
  //   marginX,
  //   marginY,
  //   topSpace: outside.marginTop + outside.borderTop + outside.paddingTop,
  //   bottomSpace:
  //     outside.marginBottom + outside.borderBottom + outside.paddingBottom,
  // };
}

export function useDragPositionCalculator(isDragActive: boolean) {
  const boundingBoxCache = useRef<WeakMap<EventTarget, any>>(new WeakMap());

  useEffect(() => {
    boundingBoxCache.current = new WeakMap();
  }, [isDragActive]);

  const calcPosition = useCallback((e: DragEvent, prevPos?: DragPosition) => {
    const { target } = e;
    if (!target) {
      return;
    }
    let rect = boundingBoxCache.current.get(e.target);
    if (!rect) {
      rect = getBoundingBoxes(target);
      boundingBoxCache.current.set(target, rect);
    }
    return calcDragPosition(e, rect, prevPos);
  }, []);

  return calcPosition;
}

function calcDragPosition(
  e: DragEvent,
  rect: any,
  prevPos?: DragPosition
): DragPosition {
  const y = e.clientY;
  const relativeY = y - rect.y;
  const pos = relativeY / rect.height;
  let yPos: 'top' | 'bottom' = 'top';
  if (pos < 0.9 && pos > 0.5) {
    yPos = 'bottom';
  }
  const x = e.clientX;
  const relativeX = x - rect.x;
  const p = relativeX / rect.width;
  let xPos: 'left' | 'right' = 'left';
  if (p > 0.5) {
    xPos = 'right';
  }
  return PosMap[yPos][xPos];
  // const relativeY = y - rect.marginY;
  // if (relativeY < rect.topSpace) {
  //   return 'before';
  // }
  // if (relativeY > rect.marginHeight - rect.bottomSpace) {
  //   return 'after';
  // }
  // const pos =
  //   (relativeY - rect.topSpace) /
  //   (rect.marginHeight - rect.topSpace - rect.bottomSpace);
  // if (pos < 0.5) {
  //   return 'after';
  //   if (pos > 0.6) {
  //     return 'after';
  //   }
  //   return prevPos || 'after';
  // }
  // return 'before';
  // if (pos < 0.4) {
  //   return 'before';
  // }
  // return prevPos || 'before';
}

export function throttle<T extends CallableFunction>(
  fn: T,
  limit = 1000 / 60
): T {
  let lastRun: number;
  let result;
  return function (...args) {
    if (!lastRun || performance.now() - lastRun < limit) {
      return result;
    }
    result = fn(...args);
    lastRun = performance.now();
  } as unknown as T;
}
