import { useEffect, useState, useMemo } from 'react';
import {
  MutationPack,
  mutationPackHasField,
  mutationPackIter,
} from '../../../../../cfds/client/graph/mutations.ts';
import {
  VERT_PROXY_CHANGE_FIELD,
  VertexManager,
} from '../../../../../cfds/client/graph/vertex-manager.ts';
import { Vertex, VertexId } from '../../../../../cfds/client/graph/vertex.ts';
import { User } from '../../../../../cfds/client/graph/vertices/user.ts';
import { useGraphManager } from './graph.tsx';
import { mapIterable } from '../../../../../base/common.ts';

interface OnChangeOpts {
  errorCallback?: () => void;
}

type VertexListenerCallback = () => void;

function isRevokedProxy(vertex: Vertex) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = vertex.key;
    return false;
  } catch (err) {
    if (err instanceof TypeError) {
      return true;
    }
    throw err;
  }
}

const EMPTY_OPTS: OnChangeOpts = {};

function register(
  manager: VertexManager | undefined | null,
  onChange: VertexListenerCallback,
  vertexKeys?: readonly string[],
  opts: OnChangeOpts = EMPTY_OPTS,
): void | (() => void | undefined) {
  if (manager === undefined || manager === null) {
    return;
  }

  // const manager = vertex.manager;
  // let vertex = manager.getVertexProxy();

  /***
   * mgr.on(EVENT_DID_CHANGE, (pack: MutationPack) =>
   */
  const callback = (key: string, pack: MutationPack) => {
    if (key !== manager.key) {
      return;
    }
    let didChange = !vertexKeys || vertexKeys.length <= 0;

    // if (isRevokedProxy(vertex)) {
    if (mutationPackHasField(pack, '__vert')) {
      // vertex = manager.getVertexProxy();
      didChange = true;
    }

    if (opts.errorCallback && mutationPackHasField(pack, 'error')) {
      opts.errorCallback();
    }

    if (!didChange) {
      for (const [field] of mutationPackIter(pack)) {
        if (!vertexKeys || vertexKeys.includes(field)) {
          didChange = true;
          break;
        }
      }
    }

    if (didChange) {
      onChange();
    }
  };

  // manager.on(EVENT_DID_CHANGE, callback);
  const graph = manager.graph;
  graph.attach('vertex-changed', callback);
  return () => {
    // manager.removeListener(EVENT_DID_CHANGE, callback);
    graph.detach('vertex-deleted', callback);
  };
}

export function useVertexByKey<V extends Vertex>(key: string): V {
  const graph = useGraphManager();

  const vertexMng = useMemo<VertexManager<V>>(
    () => graph && graph.getVertexManager<V>(key),
    [graph, key],
  );

  return useVertex(vertexMng);
}

type StringKeys<T> = string & keyof T;

export function usePartialVertex<
  V extends Vertex,
  K extends StringKeys<V> = StringKeys<V>,
>(
  vertexId: VertexId<V>,
  keys?: readonly K[],
  opts?: OnChangeOpts,
): Pick<V, K> & Vertex;

export function usePartialVertex(
  vertexId: null,
  keys?: readonly string[],
  opts?: OnChangeOpts,
): null;

export function usePartialVertex(
  vertexId: undefined,
  keys?: readonly string[],
  opts?: OnChangeOpts,
): undefined;

export function usePartialVertex<
  V extends Vertex,
  K extends StringKeys<V> = StringKeys<V>,
>(
  vertexId: VertexId<V> | undefined | null,
  keys?: readonly K[],
  opts?: OnChangeOpts,
): undefined | null | (Pick<V, K> & Vertex);

export function usePartialVertex<
  V extends Vertex,
  K extends StringKeys<V> = StringKeys<V>,
>(
  vertexId: VertexId<V> | undefined | null,
  keys?: readonly K[],
  opts: OnChangeOpts = EMPTY_OPTS,
): undefined | null | (Pick<V, K> & Vertex) {
  const graph = useGraphManager();
  const vertexMng =
    vertexId === null || vertexId === undefined
      ? vertexId
      : graph.getVertexManager<V>(vertexId);
  const [result, setResult] = useState<
    [string, Pick<V, K> & Vertex] | undefined | null
  >(
    vertexMng
      ? [vertexMng.key, new Proxy(vertexMng.getVertexProxy(), {})]
      : undefined,
  );

  useEffect(() => {
    if (!vertexMng) {
      if (result) {
        setResult(undefined);
      }
      return;
    }
    return vertexMng.onVertexChanged((mutations: MutationPack) => {
      // Skip any changes that are safe to ignore for this specific observer
      if (
        keys &&
        keys.length > 0 &&
        !mutationPackHasField(mutations, ...keys) &&
        !mutationPackHasField(mutations, VERT_PROXY_CHANGE_FIELD)
      ) {
        return;
      }
      setResult([vertexMng.key, new Proxy(vertexMng.getVertexProxy(), {})]);
    });
  }, [vertexMng, setResult, keys]);

  if (
    (vertexMng && (!result || result[0] !== vertexMng?.key)) ||
    (!vertexMng && result)
  ) {
    setResult(
      vertexMng
        ? [vertexMng.key, new Proxy(vertexMng.getVertexProxy(), {})]
        : undefined,
    );
  }

  return result && result[1];
}

export function useVertex<V extends Vertex>(
  vertexMng: VertexId<V>,
  opts?: OnChangeOpts,
): V;

export function useVertex<V extends Vertex>(
  vertexMng: null,
  opts?: OnChangeOpts,
): null;

export function useVertex<V extends Vertex>(
  vertexMng: undefined,
  opts?: OnChangeOpts,
): undefined;

export function useVertex<V extends Vertex>(
  vertexMng: VertexId<V> | undefined | null,
  opts: OnChangeOpts = EMPTY_OPTS,
): undefined | null | V {
  // This stupid repeat typing lets the TypeScript compiler understand
  if (vertexMng === null) {
    return usePartialVertex(vertexMng, [], opts);
  }
  if (vertexMng === undefined) {
    return usePartialVertex(vertexMng, [], opts);
  }
  return usePartialVertex(vertexMng, [], opts) as V;
}

export function useVertices<V extends Vertex>(
  vertexManagers: VertexId<V>[] | Set<VertexId<V>>,
  opts: OnChangeOpts = EMPTY_OPTS,
): V[] {
  return usePartialVertices(vertexManagers, [], opts) as V[];
}

export function usePartialVertices<
  V extends Vertex,
  K extends keyof V = keyof V,
>(
  vertexIds: readonly VertexId<V>[] | Set<VertexId<V>> | undefined,
  keys: K[],
  opts: OnChangeOpts = EMPTY_OPTS,
): (Pick<V, K> & Vertex)[] {
  if (!vertexIds) {
    vertexIds = [];
  }
  const [reload, setReload] = useState(0);
  const keysStr = keys.join('-');
  const graph = useGraphManager();
  const vertexManagers = Array.from(
    mapIterable(vertexIds, (id) => graph.getVertexManager(id)),
  );
  const mgrsStamp = vertexManagers
    .map((mgr) => mgr.key)
    .sort()
    .join('-');
  useEffect(() => {
    const unSubs: (() => void)[] = [];
    for (const id of vertexManagers) {
      const mgr = graph.getVertexManager(id);
      const callback = register(
        mgr,
        () => setReload((x) => x + 1),
        keys as string[],
        opts,
      );
      if (callback) {
        unSubs.push(callback);
      }
    }
    return () => unSubs.forEach((fn) => fn());
  }, [mgrsStamp, opts, keysStr]);
  const result = useMemo(
    () => Array.from(vertexManagers).map((mgr) => graph.getVertex(mgr)),
    [mgrsStamp, reload],
  );
  return result;
}

export function useCurrentUser() {
  const graph = useGraphManager();
  return useVertexByKey<User>(graph.rootKey);
}
