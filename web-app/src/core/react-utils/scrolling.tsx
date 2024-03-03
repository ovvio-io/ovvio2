import React, { useContext, useEffect, useState } from 'react';

export const scrollingContext = React.createContext<HTMLElement | undefined>(
  document.body,
);

export function useScrollingRerendering() {
  const parent = useContext(scrollingContext);
  const el = parent;
  const [offset, setOffset] = useState(() =>
    el ? { x: el.scrollLeft, y: el.scrollTop } : { x: 0, y: 0 },
  );
  useEffect(() => {
    if (el) {
      const handler = () => {
        setOffset(el ? { x: el.scrollLeft, y: el.scrollTop } : { x: 0, y: 0 });
      };
      el.addEventListener('scroll', handler);
      return () => {
        el.removeEventListener('scroll', handler);
      };
    }
  }, [el]);

  return offset;
}

export function useScrollParent() {
  return useContext(scrollingContext);
}

interface ScrollerProps<T extends HTMLElement> {
  children: (ref: (el: T) => void) => JSX.Element;
  onScroll?: (x: number, y: number) => void;
}

export function Scroller<T extends HTMLElement = HTMLDivElement>({
  children,
  onScroll,
}: ScrollerProps<T>) {
  const [el, setEl] = useState<T>();

  useEffect(() => {
    if (el && onScroll) {
      const handler = () => {
        onScroll(el.scrollLeft, el.scrollTop);
      };
      el.addEventListener('scroll', handler);
      return () => {
        el.removeEventListener('scroll', handler);
      };
    }
  }, [el, onScroll]);

  return (
    <scrollingContext.Provider value={el}>
      {children(setEl)}
    </scrollingContext.Provider>
  );
}
