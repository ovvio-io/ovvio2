import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { styleguide } from '../styleguide.ts';
import { makeStyles, cn } from '../css-objects/index.ts';
import { useMountedIndicator } from '../utils/hooks/use-mounted-indicator.ts';

const useStyles = makeStyles(
  (theme) => ({
    collapseExpand: {
      overflow: 'visible',
      transition: `all ${styleguide.transition.duration.standard}ms ${styleguide.transition.timing.standard}`,
    },
    visible: {
      // opacity: 1,
      transform: 'translateX(0)',
    },
    entering: {
      // opacity: 0,
      minHeight: 0,
      overflow: 'hidden',
    },
    exiting: {
      // minHeight: 0,
      overflow: 'hidden',
      // opacity: 0,
      // transform: 'translateX(-100%)',
    },
  }),
  'transition_fe904c'
);

export enum TRANSITION_STATES {
  VISIBLE = 'VISIBLE',
  ENTERING = 'ENTERING',
  EXITING = 'EXITING',
  REMOVED = 'REMOVED',
}

export function useTransitionedOpen(
  open: boolean,
  animationDuration = styleguide.transition.duration.standard
): [TRANSITION_STATES, React.MutableRefObject<boolean>] {
  const [visibility, setVisibility] = useState(
    open ? TRANSITION_STATES.ENTERING : TRANSITION_STATES.REMOVED
  );
  // debugger;

  const prevOpen = useRef(open);
  const isMounted = useMountedIndicator();
  const animDuration = useRef(animationDuration);

  useEffect(() => {
    let nextState: TRANSITION_STATES;
    if (!open && prevOpen.current) {
      setVisibility(TRANSITION_STATES.EXITING);
      nextState = TRANSITION_STATES.REMOVED;
    } else if (open) {
      setVisibility(TRANSITION_STATES.ENTERING);
      nextState = TRANSITION_STATES.VISIBLE;
    }
    prevOpen.current = open;
    const timeout = window.setTimeout(() => {
      if (nextState && isMounted.current) {
        setVisibility(nextState);
      }
    }, animDuration.current + 50);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [open, isMounted]);

  return [visibility, isMounted];
}

class TimersCounter {
  private _timers = {};

  addTimer(key, timeoutId, action) {
    if (this._timers[key]) {
      this.removeTimer(key);
    }
    this._timers[key] = {
      id: timeoutId,
      action,
    };
  }

  removeTimer(key) {
    if (!this._timers[key]) {
      return;
    }

    window.clearTimeout(this._timers[key]);
    delete this._timers[key];
  }

  clear() {
    Object.keys(this._timers).forEach((key) => this.removeTimer(key));
  }
}

function useTransitioningChildren(children, duration) {
  const timers = useRef(new TimersCounter());
  const toArray = (x) => x;
  const [newChildren, setNewChildren] = useState(children);

  const setWrapped = (fn) =>
    setNewChildren((...args) => {
      const r = fn(...args);

      return r;
    });
  useEffect(() => {
    setWrapped((c) => {
      const childArray = toArray(
        children.map((item) => {
          const newProps = {
            transitionState:
              item.props.transitionState || TRANSITION_STATES.VISIBLE,
          };
          if (c.every((x) => x.key !== item.key)) {
            newProps.transitionState = TRANSITION_STATES.ENTERING;
            const timerId = window.setTimeout(() => {
              setWrapped((things) =>
                things.map((i) => {
                  if (i.key !== item.key) {
                    return i;
                  }
                  timers.current.removeTimer(item.key);
                  return React.cloneElement(i, {
                    transitionState: TRANSITION_STATES.VISIBLE,
                  });
                })
              );
            }, duration);

            timers.current.addTimer(item.key, timerId, 'enter');
          }

          const e = React.cloneElement(item, newProps);

          return e;
        })
      );

      c.forEach((existing, index) => {
        const newItem = childArray.find((x) => {
          return x.key === existing.key;
        });

        if (newItem) {
          return;
        }
        console.log('removing ', existing);

        if (
          existing.props.transitionState === TRANSITION_STATES.VISIBLE ||
          existing.props.transitionState === TRANSITION_STATES.ENTERING
        ) {
          existing = React.cloneElement(existing, {
            transitionState: TRANSITION_STATES.EXITING,
          });
          const timerId = window.setTimeout(() => {
            setWrapped((c) =>
              c.filter((x) => {
                console.log(x.key, existing.key);
                return x.key !== existing.key;
              })
            );
            timers.current.removeTimer(existing.key);
          }, duration);
          timers.current.addTimer(existing.key, timerId, 'exit');
        }

        childArray.splice(index, 0, existing);
      });

      return childArray;
    });
  }, [children, duration]);

  return newChildren;
}

export default function TransitionGroup({
  children,
  duration = styleguide.transition.duration.standard + 200,
}) {
  const newChildren = useTransitioningChildren(children, duration);

  return <React.Fragment>{newChildren}</React.Fragment>;
}

export function CollapseExpandTransition({
  children,
  transitionState,
  className,
  style = {},
}) {
  const styles = useStyles();
  const elementRef = useRef();
  const [expandStyle, setExpandStyle] = useState({});

  useLayoutEffect(() => {
    if (!elementRef.current) {
      return;
    }
    const rect = (
      elementRef.current as unknown as HTMLElement
    ).getBoundingClientRect();
    if (transitionState === TRANSITION_STATES.ENTERING) {
      setExpandStyle({
        height: 0,
        padding: 0,
      });
      window.requestAnimationFrame((x) => {
        setExpandStyle({
          height: Math.max(rect.height),
          opacity: 1,
        });
      });
    } else if (transitionState === TRANSITION_STATES.VISIBLE) {
      setExpandStyle({});
    } else if (transitionState === TRANSITION_STATES.EXITING) {
      setExpandStyle({
        height: rect.height,
      });

      window.requestAnimationFrame((x) => {
        setExpandStyle({
          height: 0,
          minHeight: 0,
        });
      });
    }
  }, [transitionState]);

  return (
    <div
      ref={elementRef}
      style={{ ...style, ...expandStyle }}
      className={cn(
        className,
        styles.collapseExpand,
        transitionState && styles[transitionState.toLowerCase()]
      )}
    >
      {children}
    </div>
  );
}
