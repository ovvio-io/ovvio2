import {
  DependencyList,
  useCallback,
  useEffect,
  useState,
} from 'https://esm.sh/react@18.2.0';
import {
  NS_NOTES,
  NS_TAGS,
  NS_WORKSPACE,
} from '../../../../../cfds/base/scheme-types.ts';
import { GraphManager } from '../../../../../cfds/client/graph/graph-manager.ts';
import {
  EVENT_QUERY_RESULTS_CHANGED,
  Predicate,
  Query,
  SortDescriptor,
  UnionQuery,
} from '../../../../../cfds/client/graph/query.ts';
import { Vertex } from '../../../../../cfds/client/graph/vertex.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import {
  Note,
  Tag,
  Workspace,
} from '../../../../../cfds/client/graph/vertices/index.ts';
import { useGraphManager } from './graph.tsx';
import { useLogger } from './logger.tsx';

export interface IAsyncQuery {
  called: boolean;
}

export type BaseResult<T> = {
  result: T;
};

export interface QueryOptions<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  RT = OT[]
> {
  sort?: SortDescriptor<OT>;
  listenOn?: (keyof IT)[];
  name?: string;
  mapResult?: (results: VertexManager<IT>[]) => RT;
  source?: Query<Vertex, IT> | UnionQuery<Vertex, IT> | GraphManager;
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

export interface UseQueryResult<T> {
  loading: boolean;
  results: T;
}

export function useQuery<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  RT = OT[]
>(
  predicate: Predicate,
  deps: DependencyList,
  opts?: QueryOptions<IT, OT>
): UseQueryResult<RT> {
  const { sort, listenOn, mapResult } = opts || {};
  const graph = useGraphManager();
  const logger = useLogger();
  const [result, setResult] = useState({
    loading: true,
    results: [] as RT,
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
        logger.log({
          severity: 'INFO',
          name: 'QueryFired',
          queryName: opts?.name || 'Unknown',
          value: 1,
          unit: 'Count',
        });
        const results = mapResult ? mapResult(query.results) : query.results;
        setResult({
          loading: query.isLoading,
          results: results as RT,
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
  OT extends IT = IT,
  RT = OT[]
>(query: Query<IT, OT>, opts?: QueryOptions<IT, OT>): UseQueryResult<RT> {
  const logger = useLogger();
  const [result, setResult] = useState<UseQueryResult<RT>>({
    loading: true,
    results: [] as RT,
  });
  const mapResult = opts?.mapResult;

  useEffect(() => {
    const listener = () => {
      logger.log({
        severity: 'INFO',
        name: 'QueryFired',
        value: 1,
        unit: 'Count',
        queryName: opts?.name || query.name || 'Unknown',
      });
      const results = mapResult ? mapResult(query.results) : query.results;
      setResult({
        loading: query.isLoading,
        results: results as RT,
      });
    };
    query.on(EVENT_QUERY_RESULTS_CHANGED, listener);

    if (!query.isLoading) {
      const results = mapResult ? mapResult(query.results) : query.results;
      setResult({
        loading: query.isLoading,
        results: results as RT,
      });
    }

    return () => {
      query.removeListener(EVENT_QUERY_RESULTS_CHANGED, listener);
    };
  }, [query]);

  return result;
}
