import { NS_NOTES, NS_TAGS, NS_WORKSPACE } from '@ovvio/cfds';
import {
  CacheLoadingStatus,
  EVENT_CACHE_LOADED,
  GraphManager,
} from '@ovvio/cfds/lib/client/graph/graph-manager';
import {
  EVENT_QUERY_RESULTS_CHANGED,
  Predicate,
  Query,
  SortDescriptor,
  UnionQuery,
} from '@ovvio/cfds/lib/client/graph/query';
import { Vertex } from '@ovvio/cfds/lib/client/graph/vertex';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { Note, Tag, Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import {
  DependencyList,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BaseQueryProvider } from '../query-provider';
import { useGraphManager } from './graph';
import { assert } from '@ovvio/base/lib/utils';
import {
  SharedQueryName,
  SharedQueryType,
} from '@ovvio/cfds/lib/client/graph/shared-queries';
import { EVENT_LOADING_FINISHED } from '@ovvio/cfds/lib/client/graph/vertex-source';
import { useRootUser } from './graph';
import { usePartialVertex } from './vertex';

export interface IAsyncQuery {
  called: boolean;
}

export type BaseResult<T> = {
  result: T;
};
export function useBaseQueryProvider<TParams, TResult>(
  TConstructor: { new (): BaseQueryProvider<TParams, TResult> },
  params: TParams,
  initialValue: TResult,
  listen = true
): BaseResult<TResult> & IAsyncQuery {
  const graph = useGraphManager();
  const [result, setResult] = useState<BaseResult<TResult> & IAsyncQuery>({
    result: initialValue,
    called: false,
  });

  const queryProvider = useMemo<BaseQueryProvider<TParams, TResult>>(() => {
    return new TConstructor();
  }, [TConstructor]);

  useEffect(() => {
    let closeListen: (() => void) | undefined;
    if (listen) {
      closeListen = queryProvider.listen(res =>
        setResult({ result: res, called: true })
      );
    }

    return () => {
      if (closeListen) closeListen();
      queryProvider.close();
    };
  }, [queryProvider, listen]);

  useEffect(() => {
    queryProvider.run(graph.indexQueryManager, params);
  }, [queryProvider, graph, params]);

  return result;
}

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

function defaultMap(x) {
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
    let cleanup = notDeleted.onResultsChanged(() => {
      if (!graph.sharedQuery('notDeleted').isLoading) {
        setNotDeletedLoading(false);
        cleanup();
        cleanup = undefined;
      }
    });
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [graph]);

  return (
    loading ||
    graph.cacheStatus === CacheLoadingStatus.CriticalLoading ||
    rootUser.isLoading ||
    notDeletedLoading
  ); // || query.count > 0;
}

export function useQuery2<T extends Query>(
  queryOrName: undefined,
  closeOnCleanup?: boolean
): undefined;

export function useQuery2<T extends Query>(
  queryOrName: T | SharedQueryName,
  closeOnCleanup?: boolean
): T;

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
      setCounter(x => x + 1);
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
  return useQuery2(q as SharedQueryType<T>) as SharedQueryType<T>;
}
