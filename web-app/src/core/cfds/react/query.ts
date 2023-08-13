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
import { GraphManager } from '../../../../../cfds/client/graph/graph-manager.ts';
import {
  SortDescriptor,
  Query,
  UnionQuery,
  Predicate,
  QueryOptions,
} from '../../../../../cfds/client/graph/query.ts';
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
import { usePartialVertex } from './vertex.ts';
import { assert } from '../../../../../base/error.ts';
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

function defaultMap(x: any) {
  return x;
}

// export function useQuery<IT extends Vertex = Vertex, OT extends IT = IT>(
//   predicate: Predicate<IT, OT>,
//   deps: DependencyList,
//   opts?: QueryOptions<IT, OT>
// ): UseQueryResult<OT> {
//   const { sort, listenOn, mapResult = defaultMap } = opts || {};
//   const graph = useGraphManager();
//   const filter = useCallback(
//     (v: IT) => {
//       return !v.isDeleted && predicate(v);
//     },
//     deps // eslint-disable-line
//   );
//   const listenOnDep = listenOn && JSON.stringify(listenOn);
//   const query = useQuery2(
//     useMemo(
//       () => new Query<IT, OT>(opts?.source || graph, filter, sort, opts?.name),
//       [opts?.source, graph, filter, sort, opts?.name, listenOnDep]
//     )
//   );
//   return {
//     loading: query.isLoading,
//     results: query.results,
//   };
// }

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
    query.attach('results-changed', listener);

    // if (!query.isLoading) {
    setResult({
      loading: query.isLoading,
      results: query.results,
    });
    // }

    return () => {
      query.detach('results-changed', listener);
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
      graph.once('loading-finished', () => {
        setLoading(graph.isLoading);
      });
    }
  }, [graph]);

  const rootUser = usePartialVertex(graph.getRootVertexManager(), []);

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

  return loading || graph.isLoading || rootUser.isNull || notDeletedLoading; // || query.count > 0;
}

type SharedQueryResultType<T extends SharedQueryName | undefined = undefined> =
  T extends SharedQueryName ? SharedQueryType<T> : undefined;

export function useQuery2<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  GT extends CoreValue = CoreValue
>(queryOrName: QueryOptions<IT, OT, GT>): Query<IT, OT, GT>;

export function useQuery2<T extends SharedQueryName | undefined = undefined>(
  queryOrName: T
): SharedQueryResultType<T>;

export function useQuery2<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  GT extends CoreValue = CoreValue
>(
  queryOrName: QueryOptions<IT, OT, GT> | undefined
): Query<IT, OT, GT> | undefined;

export function useQuery2<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  GT extends CoreValue = CoreValue
>(queryOrName: undefined): undefined;

export function useQuery2<
  IT extends Vertex = Vertex,
  OT extends IT = IT,
  GT extends CoreValue = CoreValue,
  T extends SharedQueryName | undefined = undefined
>(
  queryOrName: QueryOptions<IT, OT, GT> | T | undefined
): Query<IT, OT, GT> | SharedQueryResultType<T> | undefined {
  const graph = useGraphManager();
  if (typeof queryOrName === 'string') {
    queryOrName = graph.sharedQueriesManager[queryOrName] as unknown as T;
  }
  const [query] = useState<Query<IT, OT, GT> | undefined>(() => {
    if (queryOrName instanceof Query) {
      return queryOrName;
    }
    if (typeof queryOrName === 'undefined') {
      return undefined;
    }
    return graph.query(queryOrName as QueryOptions<IT, OT, GT>);
  });
  const [proxy, setProxy] = useState<Query<IT, OT, GT> | undefined>(query);
  useEffect(() => {
    if (!query) {
      return;
    }

    setProxy(new Proxy(query, {}));
    const callback = () => {
      setProxy(new Proxy(query, {}));
    };
    query.attach('results-changed', callback);
    return () => {
      query.detach('results-changed', callback);
    };
  }, [query]);
  return proxy || query;
}

export function useSharedQuery<T extends SharedQueryName>(
  name: T
): SharedQueryType<T> {
  const graph = useGraphManager();
  const q = graph.sharedQueriesManager[name] as Query;
  return useQuery2(q) as SharedQueryType<T>;
}
