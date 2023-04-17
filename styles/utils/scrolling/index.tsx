import React, { useContext, useEffect, useState } from 'react';
import { isServerSide } from '../ssr.ts';

export const scrollingContext = React.createContext<HTMLElement>(
  isServerSide ? null : document.body
);

export function useScrollingRerendering() {
  const parent = useContext(scrollingContext);
  const el = parent;
  const [offset, setOffset] = useState(() =>
    el ? { x: el.scrollLeft, y: el.scrollTop } : { x: 0, y: 0 }
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
}

export function Scroller<T extends HTMLElement = HTMLDivElement>({
  children,
}: ScrollerProps<T>) {
  const [el, setEl] = useState<T>();

  return (
    <scrollingContext.Provider value={el}>
      {children(setEl)}
    </scrollingContext.Provider>
  );
}
