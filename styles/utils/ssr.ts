import { DependencyList, EffectCallback, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';

export const isServerSide =
  typeof window === 'undefined' || typeof document === 'undefined';

let _isNextJs = false;

export const isNextJs = () => _isNextJs;

export const setNextJs = () => (_isNextJs = true);

function useSSRInstantEffect(effect: EffectCallback, deps?: DependencyList) {
  effect();
}

export const useIsomorphicLayoutEffect = isServerSide
  ? useSSRInstantEffect
  : useLayoutEffect;

export const createUniversalPortal = (
  children: React.ReactNode,
  container?: Element | null,
  key?: string
) => {
  if (isServerSide) {
    return null;
  }

  if (!container) {
    const rootKey = isNextJs() ? '__next' : 'root';
    container = document.getElementById(rootKey);
  }

  return ReactDOM.createPortal(children, container!, key);
};
