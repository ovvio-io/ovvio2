import { useEffect, useMemo, useRef, useState } from 'react';

export function useAnimateWidth<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T>,
  animateProp: any
): Partial<{ width: number }> {
  const size = useAnimateSize(ref.current, animateProp, 'width');
  return useMemo(() => {
    if (size === null) {
      return {};
    }
    return { width: size };
  }, [size]);
}

export function useAnimateHeight<T extends HTMLElement = HTMLElement>(
  ref: React.MutableRefObject<T | undefined | null>,
  animateProp: any
): Partial<{ height: number }> {
  const size = useAnimateSize(ref.current || null, animateProp, 'height');
  return useMemo(() => {
    if (size === null) {
      return {};
    }
    return { height: size };
  }, [size]);
}

export function useAnimateSize<T extends HTMLElement>(
  el: T | null,
  animateProp: any,
  animateSizeKey: 'height' | 'width'
): number | null {
  const lastValue = useRef(animateProp);

  const [size, setSize] = useState<number | null>(null);

  // useEffect(() => {
  //   setSize(null);
  //   if (el) {
  //     const handler = (e: TransitionEvent) => {
  //       if (e.propertyName === animateSizeKey) {
  //         setSize(null);
  //       }
  //     };
  //     el.addEventListener('transitionend', handler);
  //     return () => {
  //       el.removeEventListener('transitionend', handler);
  //     };
  //   }
  // }, [el]);

  useEffect(() => {
    if (!el || animateProp === lastValue.current) {
      return;
    }

    lastValue.current = animateProp;
    const rect = el.getBoundingClientRect();
    const currSize = rect[animateSizeKey];
    setSize(null);
    let abort = false;

    window.requestAnimationFrame(() => {
      if (abort) {
        return;
      }
      const desiredSize = el.getBoundingClientRect()[animateSizeKey];
      setSize(currSize);

      window.requestAnimationFrame(() => {
        if (abort) {
          return;
        }
        setSize(desiredSize);
      });
    });

    return () => {
      abort = true;
    };
  }, [el, animateProp, animateSizeKey]);

  return size;
}
