import { useEffect, useState, useMemo } from 'react';
import {
  MutationPack,
  mutationPackHasField,
  mutationPackIter,
} from '../../../../../cfds/client/graph/mutations.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { Vertex, VertexId } from '../../../../../cfds/client/graph/vertex.ts';
import { User } from '../../../../../cfds/client/graph/vertices/user.ts';
import { useGraphManager } from './graph.tsx';

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
  opts: OnChangeOpts = EMPTY_OPTS
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
    [graph, key]
  );

  return useVertex(vertexMng);
}

export function usePartialVertex<V extends Vertex, K extends keyof V = keyof V>(
  vertexId: VertexId<V> | undefined | null,
  keys: readonly K[],
  opts: OnChangeOpts = EMPTY_OPTS
): Pick<V, K> & Vertex {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setReload] = useState(0);
  const graph = useGraphManager();
  const vertexMng = vertexId && graph.getVertexManager<V>(vertexId);
  const keysStr = keys.join('-');
  useEffect(() => {
    if (vertexMng) {
      return register(
        vertexMng,
        () => setReload((x) => x + 1),
        keys as readonly string[],
        opts
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertexMng, opts, keysStr]);

  return vertexMng
    ? (vertexMng.getVertexProxy() as unknown as Pick<V, K> & Vertex)
    : ({} as unknown as Pick<V, K> & Vertex);
}

export function useVertex<V extends Vertex>(
  vertexMng: VertexManager<V>,
  opts: OnChangeOpts = EMPTY_OPTS
) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setReload] = useState(0);
  useEffect(() => {
    return register(vertexMng, () => setReload((x) => x + 1), [], opts);
  }, [vertexMng, opts]);

  return vertexMng?.getVertexProxy();
}

export function useVertices<V extends Vertex>(
  vertexManagers: VertexId<V>[] | Set<VertexId<V>>,
  opts: OnChangeOpts = EMPTY_OPTS
): V[] {
  return usePartialVertices(vertexManagers, [], opts) as V[];
}

export function usePartialVertices<V extends Vertex, K extends keyof V>(
  vertexManagers: readonly VertexId<V>[] | Set<VertexId<V>>,
  keys: K[],
  opts: OnChangeOpts = EMPTY_OPTS
): (Pick<V, K> & Vertex)[] {
  const [, setReload] = useState(0);
  const keysStr = keys.join('-');
  const graph = useGraphManager();
  useEffect(() => {
    const unSubs: (() => void)[] = [];
    for (const id of vertexManagers) {
      const mgr = graph.getVertexManager(id);
      const callback = register(
        mgr,
        () => setReload((x) => x + 1),
        keys as string[],
        opts
      );
      if (callback) {
        unSubs.push(callback);
      }
    }
    return () => unSubs.forEach((fn) => fn());
  }, [vertexManagers, opts, keysStr]);
  const result = [];
  for (const id of vertexManagers) {
    result.push(graph.getVertex(id));
  }
  return result;
}

export function useCurrentUser() {
  const graph = useGraphManager();
  return useVertexByKey<User>(graph.rootKey);
}
