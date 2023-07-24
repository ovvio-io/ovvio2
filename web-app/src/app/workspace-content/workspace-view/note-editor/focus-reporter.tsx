import React, { useEffect } from 'react';
import { useFocused } from 'https://esm.sh/slate-react@0.87.1';
import { VertexManager } from '../../../../../../cfds/client/graph/vertex-manager.ts';
import { Note } from '../../../../../../cfds/client/graph/vertices/note.ts';
import { UISource } from '../../../../../../logging/client-events.ts';
import { useLogger } from '../../../../core/cfds/react/logger.tsx';

interface FocusReporterProps {
  cardManager: VertexManager<Note>;
  source: UISource;
}

export function FocusReporter({ cardManager, source }: FocusReporterProps) {
  const focused = useFocused();
  const logger = useLogger();

  useEffect(() => {
    logger.log({
      severity: 'INFO',
      event: focused ? 'Start' : 'End',
      flow: 'edit',
      vertex: cardManager.key,
      source,
    });
  }, [focused, logger, cardManager, source]);

  return null;
}
