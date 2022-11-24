import { GraphManager } from '../../../../../cfds/client/graph/graph-manager.ts';
import { EVENT_CRITICAL_ERROR } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { useEffect } from 'https://esm.sh/react@18.2.0';
import { useGraphManager } from './graph.tsx';

function registerOnCriticalError(
  manager: GraphManager | undefined | null,
  onCriticalError: () => void
): void | (() => void | undefined) {
  if (manager === undefined || manager === null) {
    return;
  }

  manager.on(EVENT_CRITICAL_ERROR, onCriticalError);
  return () => {
    manager.removeListener(EVENT_CRITICAL_ERROR, onCriticalError);
  };
}

export function useOnCriticalError(onCriticalError: () => void) {
  const graphMng = useGraphManager();

  useEffect(() => {
    return registerOnCriticalError(graphMng, onCriticalError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphMng]);
}
