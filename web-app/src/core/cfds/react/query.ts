import { NS_NOTES, NS_TAGS, NS_WORKSPACE } from '@ovvio/cfds';
import {
  CacheStatus,
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
  predicate: Predicate,
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
    (v: Vertex) => {
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
    loading: true,
    results: [],
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

    if (!query.isLoading) {
      setResult({
        loading: query.isLoading,
        results: query.results,
      });
    }

    return () => {
      query.removeListener(EVENT_QUERY_RESULTS_CHANGED, listener);
    };
  }, [query]);

  return result;
}

export function useIsGraphLoading() {
  const graph = useGraphManager();

  const [isLoading, setIsLoading] = useState(
    graph.cacheStatus !== CacheStatus.Loaded
  );

  useEffect(() => {
    const loadingQuery = new Query(graph, x => x.isLoading, undefined);
    if (graph.cacheStatus === CacheStatus.Loaded) {
      setIsLoading(false);
      return;
    }

    const handler = () => {
      if (graph.cacheStatus === CacheStatus.Loaded) {
        setIsLoading(false);
      } else {
        loadingQuery.on(EVENT_QUERY_RESULTS_CHANGED, () => {
          const isLoading =
            loadingQuery.isLoading || loadingQuery.results.length > 0;
          if (!isLoading) {
            setIsLoading(false);
            loadingQuery.removeAllListeners();
          }
        });
      }
    };
    if (graph.cacheStatus === CacheStatus.NoCache) {
      handler();
    } else {
      graph.once(EVENT_CACHE_LOADED, handler);
    }

    return () => {
      loadingQuery.removeAllListeners();
      graph.removeListener(EVENT_CACHE_LOADED, handler);
    };
  }, [graph]);

  return isLoading;
}
