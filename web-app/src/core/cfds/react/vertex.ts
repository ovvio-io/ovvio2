import { useEffect, useState, useMemo } from 'react';
import { EVENT_DID_CHANGE } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import { useGraphManager } from './graph';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';
import {
  MutationPack,
  mutationPackIter,
} from '@ovvio/cfds/lib/client/graph/mutations';
import { Vertex } from '@ovvio/cfds/lib/client/graph/vertex';
import { User } from '@ovvio/cfds//lib/client/graph/vertices';

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
  keys?: string[],
  opts: OnChangeOpts = EMPTY_OPTS
): void | (() => void | undefined) {
  if (manager === undefined || manager === null) {
    return;
  }

  //const manager = vertex.manager;
  let vertex = manager.getVertexProxy();

  /***
   * mgr.on(EVENT_DID_CHANGE, (pack: MutationPack) =>
   */
  const callback = (pack: MutationPack) => {
    let didChange = false;

    if (isRevokedProxy(vertex)) {
      vertex = manager.getVertexProxy();
      didChange = true;
    }

    for (const [field] of mutationPackIter(pack)) {
      if (field === 'error' && opts.errorCallback) {
        opts.errorCallback();
      }
      if (!keys || !keys.length || keys.includes(field)) {
        didChange = true;
        break;
      }
    }

    if (didChange) {
      onChange();
    }
  };

  manager.on(EVENT_DID_CHANGE, callback);
  return () => {
    manager.removeListener(EVENT_DID_CHANGE, callback);
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

export function usePartialVertex<V extends Vertex, K extends keyof V>(
  vertexMng: VertexManager<V>,
  keys: K[],
  opts: OnChangeOpts = EMPTY_OPTS
): Pick<V, K> & Vertex {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setReload] = useState(0);
  const keysStr = keys.join('-');
  useEffect(() => {
    return register(
      vertexMng,
      () => setReload(x => x + 1),
      keys as string[],
      opts
    );
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
    return register(vertexMng, () => setReload(x => x + 1), [], opts);
  }, [vertexMng, opts]);

  return vertexMng?.getVertexProxy();
}

function filterFunc(
  fn: void | (() => void | undefined)
): fn is () => void | undefined {
  return !!fn;
}

export function useVertices<V extends Vertex>(
  vertexManagers: VertexManager<V>[],
  opts: OnChangeOpts = EMPTY_OPTS
): V[] {
  return usePartialVertices(vertexManagers, [], opts);
  // // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const [_, setReload] = useState(0);
  // useEffect(() => {
  //   if (!vertexManagers.length) {
  //     return;
  //   }
  //   const unSubs = vertexManagers
  //     .map(m => {
  //       return register(m, () => setReload(x => x + 1), [], opts);
  //     })
  //     .filter(filterFunc);
  //   return () => unSubs.forEach(fn => fn());
  // }, [vertexManagers, opts]);

  // return vertexManagers.map(m => m.getVertexProxy());
}

export function usePartialVertices<V extends Vertex, K extends keyof V>(
  vertexManagers: readonly VertexManager<V>[],
  keys: K[],
  opts: OnChangeOpts = EMPTY_OPTS
): (Pick<V, K> & Vertex)[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [reload, setReload] = useState(0);
  const keysStr = keys.join('-');
  useEffect(() => {
    if (!vertexManagers.length) {
      return;
    }
    const unSubs = vertexManagers
      .map(m => {
        return register(m, () => setReload(x => x + 1), keys as string[], opts);
      })
      .filter(filterFunc);
    return () => unSubs.forEach(fn => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertexManagers, opts, keysStr]);
  const result = useMemo(
    () => vertexManagers.map(x => x.getVertexProxy()),
    [vertexManagers, reload] // eslint-disable-line
  );

  return result;
}

export function useCurrentUser() {
  const graph = useGraphManager();
  return useVertexByKey<User>(graph.rootKey);
}
