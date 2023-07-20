import { NS_NOTES } from '@ovvio/cfds';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { useEventLogger } from 'core/analytics';
import { useCfdsContext } from 'core/cfds/react/graph';
import React, { useEffect, useMemo } from 'react';
import { Query, UnionQuery } from '@ovvio/cfds/lib/client/graph/query';

export interface SearchResultsProps {
  searchTerm: string;
  selectedWorkspaces: VertexManager<Workspace>[];
  className?: string;
}

export function SearchResults({
  searchTerm,
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
      searchTerm,
      x =>
        x.namespace === NS_NOTES &&
        selectedWorkspaces.includes(x.workspace.manager)
    );
    return {
      unpinned: items,
      pinned: [],
    };
  }, [searchEngine, searchTerm, selectedWorkspaces]);

  let query;

  // useEffect(() => {
  //   const source = new UnionQuery(selectedWorkspaces.map(ws => ws.getVertexProxy().notesQuery));
  //   query = new Query<Note, Note>(source, () => true)
  // })

  // return (
  //   <InnerListView
  //     className={className}
  //     query={results}
  //     sortBy={SortBy.Created}
  //   ></InnerListView>
  // );
  return null;
}
