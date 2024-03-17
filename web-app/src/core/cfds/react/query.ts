import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  NS_WORKSPACE,
  NS_NOTES,
  NS_TAGS,
} from '../../../../../cfds/base/scheme-types.ts';
import { Query, QueryOptions } from '../../../../../cfds/client/graph/query.ts';
import {
  SharedQueryName,
  SharedQueryType,
} from '../../../../../cfds/client/graph/shared-queries.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { Vertex } from '../../../../../cfds/client/graph/vertex.ts';
import { Note } from '../../../../../cfds/client/graph/vertices/note.ts';
import { Tag } from '../../../../../cfds/client/graph/vertices/tag.ts';
import { Workspace } from '../../../../../cfds/client/graph/vertices/workspace.ts';
import { useGraphManager } from './graph.tsx';
import { CoreValue } from '../../../../../base/core-types/base.ts';

export interface IAsyncQuery {
  called: boolean;
}

export type BaseResult<T> = {
  result: T;
};

export function isWorkspace(v: Vertex): v is Workspace {
  return v.namespace === NS_WORKSPACE;
}

export function isNote(v: Vertex): v is Note {
  return v.namespace === NS_NOTES;
}

export function isTag(v: Vertex): v is Tag {
  return v.namespace === NS_TAGS;
}

export interface UseQueryResult<T extends Vertex = Vertex> {
  loading: boolean;
  results: VertexManager<T>[];
}

/**
 * @deprecated
 */
export function useExistingQuery<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
>(query: Query<IT, OT>): UseQueryResult<OT> {
  query = useQuery2(query);
  return {
    loading: query.isLoading,
    results: query.results,
  };
}

type SharedQueryResultType<T extends SharedQueryName | undefined = undefined> =
  T extends SharedQueryName ? SharedQueryType<T> : undefined;

export function useQuery2<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  GT extends CoreValue = CoreValue,
>(queryOrName: QueryOptions<IT, OT, GT>): Query<IT, OT, GT>;

export function useQuery2<T extends SharedQueryName | undefined = undefined>(
  queryOrName: T,
): SharedQueryResultType<T>;

export function useQuery2<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  GT extends CoreValue = CoreValue,
>(
  queryOrName: QueryOptions<IT, OT, GT> | undefined,
): Query<IT, OT, GT> | undefined;

export function useQuery2<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  GT extends CoreValue = CoreValue,
>(queryOrName: undefined): undefined;

export function useQuery2<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  GT extends CoreValue = CoreValue,
  T extends SharedQueryName | undefined = undefined,
>(
  queryOrName: QueryOptions<IT, OT, GT> | T | undefined,
): Query<IT, OT, GT> | SharedQueryResultType<T> | undefined {
  const graph = useGraphManager();
  if (typeof queryOrName === 'string') {
    queryOrName = graph.sharedQueriesManager[queryOrName] as unknown as T;
  }
  const query = useMemo(() => {
    if (queryOrName instanceof Query) {
      return queryOrName;
    }
    if (typeof queryOrName === 'undefined') {
      return undefined;
    }
    return graph.query(queryOrName as QueryOptions<IT, OT, GT>);
  }, [queryOrName]);
  const [_, setLastProxy] = useState(query?.proxy);
  useEffect(
    () => query?.onResultsChanged(() => setLastProxy(query?.proxy)),
    [query],
  );
  return query?.proxy;
}

export function useSharedQuery<T extends SharedQueryName>(
  name: T,
): SharedQueryType<T> {
  const graph = useGraphManager();
  const q = graph.sharedQueriesManager[name] as Query;
  return useQuery2(q) as SharedQueryType<T>;
}
