import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import PropTypes from 'https://esm.sh/prop-types@15.8.1';
import { styleguide } from '../styleguide.ts';
import { useTransitionedOpen, TRANSITION_STATES } from './transition.tsx';
import { makeStyles, cn, keyframes } from '../css-objects/index.ts';
import { useScrollingRerendering } from '../utils/scrolling/index.tsx';
import Layer from './layer.tsx';
import { createUniversalPortal } from '../utils/ssr.ts';

const popIn = keyframes(
  {
    from: {
      opacity: 0,
      transform: `translateY(${styleguide.gridbase * 1.5}px)`,
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
  'popper_a30987'
);

export const zIndex = 100;

const useStyles = makeStyles(
  (theme) => ({
    popper: {
      position: 'absolute',
      zIndex: zIndex,
    },
    animator: {
      ...styleguide.transition.standard,
      transitionDuration: `${styleguide.transition.duration.short}ms`,
      transitionProperty: 'all',
    },
    exiting: {
      opacity: 0,
      transform: `translateY(${styleguide.gridbase * 1.5}px)`,
    },
    removed: {},
    entering: {
      animation: `${popIn} ${styleguide.transition.duration.short}ms ${styleguide.transition.timing.standard} both`,
    },

    // visible: {
    //   opacity: 1,
    //   transform: 'translateY(0px)',
    // },
  }),
  'popper_1a09eb'
);

export interface PopperViewProps
  extends Omit<PopperElementProps, 'visibility'> {
  open: boolean;
  animationDuration?: number;
}

export const Popper: React.FC<PopperViewProps> = ({
  // ----- Popper
  open,
  animationDuration = styleguide.transition.duration.short,
  className = '',
  anchor,
  position,
  ...rest
}) => {
  // debugger;
  const [visibility] = useTransitionedOpen(open && !!anchor, animationDuration);

  if (!anchor || visibility === TRANSITION_STATES.REMOVED) {
    return null;
  }
  return createUniversalPortal(
    <PopperElement
      className={cn(className)}
      anchor={anchor}
      visibility={visibility}
      position={position}
      {...rest}
    />
  );
};

function isOverflowing(
  style: Record<string, any>,
  popper: HTMLElement | undefined
): PopperPosition[] {
  if (!popper) {
    return [];
  }

  const boundingRect = popper.getBoundingClientRect(); //this method is on the DOM element and it triggered the popper to appear. This method returns the size of an element and its position relative to the viewport. Amit.s
  const { x = 0, y = 0 } = style.transform || {};
  let offsetX =
    typeof style.left === 'number'
      ? style.left + boundingRect.width * x
      : window.innerWidth -
        style.right -
        (boundingRect.width + boundingRect.width * x);

  let offsetY =
    typeof style.top === 'number'
      ? style.top + boundingRect.height * y
      : window.innerHeight -
        style.bottom -
        (boundingRect.height + boundingRect.height * y);

  const points = [
    {
      x: offsetX,
      y: offsetY,
    },
    {
      x: offsetX + boundingRect.width,
      y: offsetY,
    },
    {
      x: offsetX,
      y: offsetY + boundingRect.height,
    },
    {
      x: offsetX + boundingRect.width,
      y: offsetY + boundingRect.height,
    },
  ];

  const overflow = new Set<PopperPosition>();

  for (let point of points) {
    if (point.x < 0) {
      overflow.add('left');
    }
    if (point.x > window.innerWidth) {
      overflow.add('right');
    }
    if (point.y < 0) {
      overflow.add('top');
    }
    if (point.y > window.innerHeight) {
      overflow.add('bottom');
    }
  }

  return Array.from(overflow);
}

type Points = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

type CalcFunction = (
  anchor: HTMLElement,
  rect: DOMRect,
  points: Points
) => Record<string, any>;

function calcFn(fn: CalcFunction): GetPositionFn {
  return (anchor: HTMLElement) => {
    const el = anchor;
    const rect = el.getBoundingClientRect();
    const points = {
      top: rect.top + 3,
      left: rect.left,
      right: window.innerWidth - (rect.left + rect.width - 12),
      bottom: window.innerHeight - (rect.top + rect.height),
    };
    return fn(el, rect, points);
  };
}
type PositionCalculator = {
  [position in PopperPosition]: {
    [align in PopperAlign]: {
      [direction in PopperDirection]: GetPositionFn;
    };
  };
};

const positionCalculator: PositionCalculator = {
  top: {
    start: {
      in: calcFn((el, rect, points) => {
        return {
          transformOrigin: 'top left',
          top: points.top,
          left: points.left,
        };
      }),
      out: calcFn((el, rect) => {
        return {
          transformOrigin: 'bottom left',
          bottom: window.innerHeight - rect.top,
          left: rect.left - 8,
        };
      }),
    },
    center: {
      in: calcFn((el, rect) => {
        return {
          transformOrigin: 'top center',
          top: rect.top,
          left: rect.left,
          transform: { x: -0.25 },
        };
      }),
      out: calcFn((el, rect) => {
        return {
          transformOrigin: 'bottom center',
          bottom: window.innerHeight - rect.top,
          left: rect.left + rect.width / 2,
          transform: { x: -0.5 },
        };
      }),
    },
    end: {
      in: calcFn((el, rect) => {
        return {
          transformOrigin: 'top right',
          top: rect.top,
          right: window.innerWidth - (rect.left + rect.width),
        };
      }),
      out: calcFn((el, rect) => {
        return {
          transformOrigin: 'bottom right',
          bottom: window.innerHeight - rect.top,
          right: window.innerWidth - (rect.left + rect.width),
        };
      }),
    },
  },
  left: {
    start: {
      in: (...args: any) => {
        return positionCalculator.top.start.in(...args);
      },
      out: calcFn((el, rect) => {
        return {
          transformOrigin: 'top right',
          top: rect.top - 8,
          right: window.innerWidth - rect.left + 10,
        };
      }),
    },
    center: {
      in: calcFn((el, rect) => {
        return {
          transformOrigin: 'left center',
          top: rect.top + rect.height / 2,
          left: rect.left,
          transform: { y: -0.5 },
        };
      }),
      out: calcFn((el, rect) => {
        return {
          transformOrigin: 'right center',
          top: rect.top + rect.height / 2,
          right: window.innerWidth - rect.left,
          transform: { y: -0.5 },
        };
      }),
    },
    end: {
      in: calcFn((el, rect) => {
        return {
          transformOrigin: 'bottom left',
          bottom: window.innerHeight - (rect.top + rect.height),
          left: rect.left,
        };
      }),
      out: calcFn((el, rect) => {
        return {
          transformOrigin: 'right top',
          bottom: window.innerHeight - (rect.top + rect.height),
          right: window.innerWidth - rect.left,
        };
      }),
    },
  },
  right: {
    start: {
      in: (...args: any) => {
        return positionCalculator.top.end.in(...args);
      },
      out: calcFn((el, rect) => {
        return {
          transformOrigin: 'left top',
          top: rect.top,
          left: rect.left + rect.width,
        };
      }),
    },
    center: {
      in: calcFn((el, rect, points) => {
        return {
          transformOrigin: 'left top',
          right: points.right,
          top: rect.top + rect.height / 2,
          transform: { y: -0.5 },
        };
      }),
      out: calcFn((el, rect, points) => {
        return {
          transformOrigin: 'left top',
          left: rect.left + rect.width,
          top: rect.top + rect.height / 2,
          transform: { y: -0.5 },
        };
      }),
    },
    end: {
      in: calcFn((el, rect, points) => {
        return {
          transformOrigin: 'left top',
          right: points.right + 10,
          bottom: points.bottom,
        };
      }),
      out: calcFn((el, rect, points) => {
        return {
          transformOrigin: 'left top',
          left: rect.left + rect.width,
          bottom: points.bottom,
        };
      }),
    },
  },
  bottom: {
    start: {
      in: calcFn((el, rect, points) => {
        return {
          transformOrigin: 'left top',
          left: points.left,
          bottom: points.bottom,
        };
      }),
      out: calcFn((el, rect, points) => {
        return {
          transformOrigin: 'left top',
          left: points.left - 7,
          top: points.top + rect.height + 1,
        };
      }),
    },
    center: {
      in: calcFn((el, rect, points) => {
        return {
          transformOrigin: 'left top',
          left: points.left,
          bottom: points.bottom,
          transform: { x: -0.25 },
        };
      }),
      out: calcFn((el, rect, points) => {
        return {
          transformOrigin: 'left top',
          left: rect.left + rect.width / 2,
          transform: { x: -0.5 },
          top: points.top + rect.height,
        };
      }),
    },
    end: {
      in: calcFn((el, rect, points) => {
        return {
          transformOrigin: 'left top',
          right: points.right,
          bottom: points.bottom,
        };
      }),
      out: calcFn((el, rect, points) => {
        return {
          transformOrigin: 'left top',
          right: points.right - 7,
          top: points.top + rect.height + 6,
        };
      }),
    },
  },
};

Popper.propTypes = {
  position: PropTypes.oneOf<PopperPosition>(['top', 'left', 'right', 'bottom'])
    .isRequired,
  align: PropTypes.oneOf(['start', 'center', 'end']),
  direction: PropTypes.oneOf(['in', 'out']),
  anchor: PropTypes.any,
};

export type PopperPosition = 'top' | 'left' | 'right' | 'bottom';
export type PopperAlign = 'start' | 'center' | 'end';
export type PopperDirection = 'in' | 'out';

interface PopperElementProps extends React.HTMLAttributes<HTMLDivElement> {
  anchor: HTMLElement;
  position: PopperPosition;
  align?: PopperAlign;
  direction?: PopperDirection;
  visibility: TRANSITION_STATES;
  className?: string;
}
const PopperElement: React.FC<PopperElementProps> = ({
  anchor,
  className,
  position,
  align = 'center',
  children,
  direction = 'out',
  visibility,
  ...rest
}) => {
  const styles = useStyles();
  const [recalc, setRecalc] = useState(0);
  const el = useRef<HTMLDivElement>();
  const [style, setStyle] = useState({});
  const offset = useScrollingRerendering();

  function getMarginStyles(position: string) {
    switch (position) {
      case 'left':
        return {
          marginLeft: '0px',
          marginRight: '4px',
          marginTop: '0px',
          marginBottom: '0px',
        };
      case 'bottom':
        return {
          marginBottom: '0px',
          marginTop: '4px',
          marginLeft: '0px',
          marginRight: '0px',
        };
      case 'right':
        return {
          marginBottom: '0px',
          marginTop: '0px',
          marginLeft: '4px',
          marginRight: '0px',
        };
      case 'top':
        return {
          marginBottom: '4px',
          marginTop: '0px',
          marginLeft: 'px',
          marginRight: '0px',
        };
      default:
        return {
          marginTop: '0px',
          marginBottom: '0px',
          marginLeft: '0px',
          marginRight: '0px',
        };
    }
  }
  useLayoutEffect(() => {
    let p = position;
    let a = align;
    let newStyle = {
      ...positionCalculator[p][a][direction](anchor),
      ...getMarginStyles(p),
    };
    const overflow = isOverflowing(newStyle, el.current);
    if (overflow.length) {
      if (p === 'right') {
        if (overflow.includes('left') || overflow.includes('right')) {
          p = 'left';
        }
        if (overflow.includes('bottom')) {
          a = 'end';
        } else if (overflow.includes('top')) {
          a = 'start';
        }
      } else if (p === 'left') {
        if (overflow.includes('left') || overflow.includes('right')) {
          p = 'right';
        }
        if (overflow.includes('bottom')) {
          a = 'end';
        } else if (overflow.includes('top')) {
          a = 'start';
        }
      } else if (p === 'top') {
        if (overflow.includes('top') || overflow.includes('bottom')) {
          p = 'bottom';
        }
        if (overflow.includes('right')) {
          a = 'end';
        } else if (overflow.includes('left')) {
          a = 'start';
        }
      } else if (p === 'bottom') {
        if (overflow.includes('top') || overflow.includes('bottom')) {
          p = 'top';
        }
        if (overflow.includes('right')) {
          a = 'end';
        } else if (overflow.includes('left')) {
          a = 'start';
        }
      }

      newStyle = {
        ...positionCalculator[p][a][direction](anchor),
        ...getMarginStyles(p),
      };
    }

    for (let [key, val] of Object.entries(newStyle)) {
      if (typeof val === 'number') {
        newStyle[key] = val + 'px';
      }
    }

    if (newStyle.transform) {
      const { x = 0, y = 0 } = newStyle.transform;

      newStyle.transform = `translate(${x * 100}%, ${y * 100}%)`;
    }

    setStyle(newStyle);
  }, [align, position, direction, anchor, recalc, offset]);

  useEffect(() => {
    const handler = () => {
      setRecalc((x) => x + 1);
    };

    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler);
    };
  }, []);

  return (
    <Layer>
      {({ zIndex }) => (
        <div
          className={cn(className, styles.popper)}
          style={{ ...style, zIndex }}
          {...rest}
        >
          <div
            className={cn(styles.animator, styles[visibility.toLowerCase()])}
            ref={el}
          >
            {children}
          </div>
        </div>
      )}
    </Layer>
  );
};

export default Popper;
