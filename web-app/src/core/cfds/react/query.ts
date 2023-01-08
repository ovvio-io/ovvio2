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
  GroupId,
  Predicate,
  Query,
  QueryResults,
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
import { Dictionary } from '../../../../../base/collections/dict.ts';

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

export interface UseQueryResult<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  RT = VertexManager<OT>[]
> {
  loading: boolean;
  results: RT;
  query: Query<IT, OT>;
}

export function useQuery<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  RT = VertexManager<OT>[]
>(
  predicate: Predicate<IT, OT>,
  deps: DependencyList,
  opts?: QueryOptions<IT, OT, RT>
): UseQueryResult<IT, OT, RT> {
  const { sort, listenOn, mapResult } = opts || {};
  const graph = useGraphManager();
  const logger = useLogger();
  const [result, setResult] = useState<null | UseQueryResult<IT, OT, RT>>(null);

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
        logger.log({
          severity: 'INFO',
          name: 'QueryFired',
          queryName: opts?.name || 'Unknown',
          value: 1,
          unit: 'Count',
        });
        const results = mapResult
          ? mapResult(query.results)
          : (query.results as RT);
        setResult({
          loading: query.isLoading,
          results: results,
          query,
        });
      },
      true
    );

    return () => {
      query.close();
    };
  }, [graph, filter, sort, listenOnDep]); // eslint-disable-line

  return result!;
}

export function useQueryCount<IT extends Vertex = Vertex, OT extends IT = IT>(
  query: Query<IT, OT>
): number {
  return useQueryField(query, 'count');
}

export function useQueryResults<IT extends Vertex = Vertex, OT extends IT = IT>(
  query: Query<IT, OT>
): QueryResults<OT> {
  return useQueryField(query, 'results');
}

export function useQueryGroups<IT extends Vertex = Vertex, OT extends IT = IT>(
  query: Query<IT, OT>
): Dictionary<GroupId, QueryResults<OT>> {
  return useQueryField(query, 'groups');
}

type QueryResultsField = 'count' | 'results' | 'groups';

type QueryResultsType<
  T extends QueryResultsField,
  OT extends Vertex
> = T extends 'count'
  ? number
  : T extends 'results'
  ? QueryResults<OT>
  : Dictionary<GroupId, QueryResults<OT>>;

export function useQueryField<
  RT extends QueryResultsField,
  IT extends Vertex = Vertex,
  OT extends IT = IT
>(query: Query<IT, OT>, field: RT): QueryResultsType<RT, OT> {
  const [results, setResults] = useState<QueryResultsType<RT, OT>>(
    query[field] as QueryResultsType<RT, OT>
  );
  useEffect(() => {
    const startTime = Date.now();
    const cleanup = query.onResultsChanged(() => {
      // Wait a bit while queries are loading before showing intermediate
      // results. This prevents redundant UI refreshes and keeps everything
      // smooth.
      if (!query.isLoading || Date.now() - startTime > 500) {
        setResults(query[field] as QueryResultsType<RT, OT>);
      }
    });
    return () => {
      cleanup();
      query.close();
    };
  }, [query]);
  return results;
}

export function useExistingQuery<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  RT = VertexManager<OT>[]
>(
  query: Query<IT, OT>,
  opts?: QueryOptions<IT, OT, RT>
): UseQueryResult<IT, OT, RT> {
  const logger = useLogger();
  const [result, setResult] = useState<null | UseQueryResult<IT, OT, RT>>(null);
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
      const results = mapResult
        ? mapResult(query.results)
        : (query.results as RT);
      setResult({
        loading: query.isLoading,
        results,
        query,
      });
    };
    query.on(EVENT_QUERY_RESULTS_CHANGED, listener);

    if (!query.isLoading) {
      const results = mapResult
        ? mapResult(query.results)
        : (query.results as RT);
      setResult({
        loading: query.isLoading,
        results,
        query,
      });
    }

    return () => {
      query.removeListener(EVENT_QUERY_RESULTS_CHANGED, listener);
    };
  }, [query]);

  return result!;
}
