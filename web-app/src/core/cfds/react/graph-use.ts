import { GraphManager } from '@ovvio/cfds/lib/client/graph/graph-manager';
import { EVENT_CRITICAL_ERROR } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { useEffect } from 'react';
import { useGraphManager } from './graph';

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
