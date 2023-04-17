import { useState } from 'react';
import { useIsomorphicLayoutEffect, isServerSide } from '../ssr.ts';

export interface UseIsScrollVisibleOptions {
  threshold?: number;
}

const isObservableSupported = typeof IntersectionObserver !== 'undefined';

export function useIsScrollVisible(
  el: HTMLElement,
  opts: UseIsScrollVisibleOptions = {}
) {
  const { threshold = 0 } = opts;
  const [isVisible, setIsVisible] = useState(
    !isServerSide && !isObservableSupported
  );

  useIsomorphicLayoutEffect(() => {
    if (!el || !isObservableSupported) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        requestAnimationFrame(() => {
          setIsVisible(entries[0].isIntersecting);
        });
      },
      { threshold }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [el, threshold]);

  return isVisible;
}
