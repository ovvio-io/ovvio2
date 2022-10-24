import { NS_NOTES } from '@ovvio/cfds';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { useEventLogger } from 'core/analytics';
import { useCfdsContext } from 'core/cfds/react/graph';
import React, { useEffect, useMemo } from 'react';
import { InnerListView, SortBy } from '../list-view';

export interface SearchResultsProps {
  query: string;
  selectedWorkspaces: VertexManager<Workspace>[];
  className?: string;
}

export function SearchResults({
  query,
  selectedWorkspaces,
  className,
}: SearchResultsProps) {
  const eventLogger = useEventLogger();
  const { searchEngine } = useCfdsContext();
  useEffect(() => {
    eventLogger.action('CARD_SEARCH_ACTIVATED', {});
    return () => {
      eventLogger.action('CARD_SEARCH_DEACTIVATED', {});
    };
  }, [eventLogger]);
  const results = useMemo(() => {
    const items = searchEngine.search(
      query,
      x =>
        x.namespace === NS_NOTES &&
        selectedWorkspaces.some(ws => ws.key === x.workspace.key)
    );
    return {
      unpinned: items,
      pinned: [],
    };
  }, [searchEngine, selectedWorkspaces, query]);

  return (
    <InnerListView
      className={className}
      cards={results}
      sortBy={SortBy.Created}
    ></InnerListView>
  );
}
