import React, { useEffect, useMemo } from 'https://esm.sh/react@18.2.0';
import { useGraphManager } from '../../../../../core/cfds/react/graph.tsx';
import { useLogger } from '../../../../../core/cfds/react/logger.tsx';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';
import { usePartialFilter } from '../../../../index.tsx';
import { InnerListView } from '../list-view/index.tsx';

export interface SearchResultsProps {
  className?: string;
}

export function SearchResults({ className }: SearchResultsProps) {
  const logger = useLogger();
  const graph = useGraphManager();
  const searchEngine = graph.noteSearchEngine;
  const { textQuery } = usePartialFilter(['textQuery']);
  const selectedWorkspacesQuery = useSharedQuery('selectedWorkspaces');
  useEffect(() => {
    logger.log({
      severity: 'INFO',
      event: 'Start',
      flow: 'search',
    });
    return () => {
      logger.log({
        severity: 'INFO',
        event: 'End',
        flow: 'search',
      });
    };
  }, [logger]);
  const results = useMemo(() => {
    const items = searchEngine.search(textQuery, (note) =>
      selectedWorkspacesQuery.hasVertex(note)
    );
    return {
      unpinned: items,
      pinned: [],
    };
  }, [searchEngine, selectedWorkspacesQuery, textQuery]);

  return <InnerListView className={className} cards={results}></InnerListView>;
}
