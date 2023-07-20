import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  DependencyList,
} from 'react';
import {
  NS_WORKSPACE,
  NS_NOTES,
  NS_TAGS,
} from '../../../../../cfds/base/scheme-types.ts';
import {
  GraphManager,
  CacheLoadingStatus,
} from '../../../../../cfds/client/graph/graph-manager.ts';
import {
  SortDescriptor,
  Query,
  UnionQuery,
  Predicate,
  EVENT_QUERY_RESULTS_CHANGED,
} from '../../../../../cfds/client/graph/query.ts';
import {
  SharedQueryName,
  SharedQueryType,
} from '../../../../../cfds/client/graph/shared-queries.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { EVENT_LOADING_FINISHED } from '../../../../../cfds/client/graph/vertex-source.ts';
import { Vertex } from '../../../../../cfds/client/graph/vertex.ts';
import { Note } from '../../../../../cfds/client/graph/vertices/note.ts';
import { Tag } from '../../../../../cfds/client/graph/vertices/tag.ts';
import { Workspace } from '../../../../../cfds/client/graph/vertices/workspace.ts';
import { useGraphManager } from './graph.tsx';
import { usePartialVertex } from './vertex.ts';
import { assert } from '../../../../../base/error.ts';

export interface IAsyncQuery {
  called: boolean;
}

export type BaseResult<T> = {
  result: T;
};

export interface QueryOptions<IT extends Vertex = Vertex, OT extends IT = IT> {
  sort?: SortDescriptor<OT>;
  listenOn?: (keyof IT)[];
  name?: string;
  mapResult?: (results: VertexManager<OT>[]) => OT;
  source?: Query<any, IT> | UnionQuery<any, IT> | GraphManager;
}

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

function defaultMap(x: any) {
  return x;
}

export function useQuery<IT extends Vertex = Vertex, OT extends IT = IT>(
  predicate: Predicate<IT, OT>,
  deps: DependencyList,
  opts?: QueryOptions<IT, OT>
): UseQueryResult<OT> {
  const { sort, listenOn, mapResult = defaultMap } = opts || {};
  const graph = useGraphManager();
  const [result, setResult] = useState({
    loading: true,
    results: mapResult([]),
  });

  const listenOnDep = listenOn && JSON.stringify(listenOn);

  const filter = useCallback(
    (v: IT) => {
      return !v.isDeleted && predicate(v);
    },
    deps // eslint-disable-line
  );

  useEffect(() => {
    const query = new Query<IT, OT>(
      opts?.source || graph,
      filter,
      sort,
      opts?.name
    );

    query.on(
      EVENT_QUERY_RESULTS_CHANGED,
      () => {
        console.log(`${opts?.name || 'Unknown query'} fired`);
        setResult({
          loading: query.isLoading,
          results: mapResult(query.results),
        });
      },
      true
    );

    return () => {
      query.close();
    };
  }, [graph, filter, sort, listenOnDep]); // eslint-disable-line

  return result;
}

export function useExistingQuery<
  IT extends Vertex = Vertex,
  OT extends IT = IT
>(query: Query<IT, OT>): UseQueryResult<OT> {
  const [result, setResult] = useState<UseQueryResult<OT>>({
    loading: query.isLoading,
    results: query.results,
  });

  useEffect(() => {
    const listener = () => {
      console.log(`${query.name || 'Unknown query'} fired`);
      setResult({
        loading: query.isLoading,
        results: query.results,
      });
    };
    query.on(EVENT_QUERY_RESULTS_CHANGED, listener);

    // if (!query.isLoading) {
    setResult({
      loading: query.isLoading,
      results: query.results,
    });
    // }

    return () => {
      query.removeListener(EVENT_QUERY_RESULTS_CHANGED, listener);
    };
  }, [query]);

  return result;
}

export function useIsGraphLoading() {
  const graph = useGraphManager();
  // const query = useMemo(
  //   () => new Query(graph, x => x.isLoading, { name: 'isGraphLoading' }),
  //   [graph]
  // );
  // useQuery2(query);
  // if (graph.cacheStatus !== CacheStatus.Loading) {
  //   debugger;
  // }
  const [loading, setLoading] = useState(graph.isLoading);
  useMemo(() => {
    if (graph.isLoading) {
      graph.once(EVENT_LOADING_FINISHED, () => {
        setLoading(graph.isLoading);
      });
    }
  }, [graph]);

  const rootUser = usePartialVertex(graph.getRootVertexManager(), [
    'isLoading',
  ]);

  const [notDeletedLoading, setNotDeletedLoading] = useState(
    graph.sharedQuery('notDeleted').isLoading
  );

  useEffect(() => {
    const notDeleted = graph.sharedQuery('notDeleted');
    let cleanup: undefined | (() => void) = notDeleted.onResultsChanged(() => {
      if (!graph.sharedQuery('notDeleted').isLoading) {
        setNotDeletedLoading(false);
        if (cleanup) {
          cleanup();
        }
        cleanup = undefined;
      }
    });
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [graph]);

  return loading || graph.isLoading || rootUser.isLoading || notDeletedLoading; // || query.count > 0;
}

export function useQuery2<T extends Query>(
  queryOrName: T | SharedQueryName,
  closeOnCleanup?: boolean
): T;

export function useQuery2<T extends Query>(
  queryOrName: undefined,
  closeOnCleanup?: boolean
): undefined;

export function useQuery2<T extends Query>(
  queryOrName: T | SharedQueryName | undefined,
  closeOnCleanup?: boolean
): T | undefined;

export function useQuery2<T extends Query>(
  queryOrName: T | SharedQueryName | undefined,
  closeOnCleanup = true
): T | undefined {
  const [_, setCounter] = useState(0);
  const graph = useGraphManager();
  if (typeof queryOrName === 'string') {
    queryOrName = graph.sharedQueriesManager[queryOrName] as T;
  }
  assert(queryOrName instanceof Query || typeof queryOrName === 'undefined');
  const query = queryOrName as T;
  useEffect(() => {
    if (!query) {
      return;
    }
    // const startTime = Date.now();
    const cleanup = query.onResultsChanged(() => {
      // Wait a bit while queries are loading before showing intermediate
      // results. This prevents redundant UI refreshes and keeps everything
      // smooth.
      // if (!query.isLoading || Date.now() - startTime > 500) {
      setCounter((x) => x + 1);
      // }
    });
    return () => {
      cleanup();
      if (closeOnCleanup && !query.isLocked) {
        query.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, closeOnCleanup]);
  return query;
}

export function useSharedQuery<T extends SharedQueryName>(
  name: T
): SharedQueryType<T> {
  const graph = useGraphManager();
  const q = graph.sharedQueriesManager[name];
  return useQuery2(q as Query) as unknown as SharedQueryType<T>;
}
