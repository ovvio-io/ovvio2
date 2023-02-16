import { useEffect, useState, useMemo } from 'https://esm.sh/react@18.2.0';
import { useGraphManager } from './graph.tsx';
import {
  VertexManager,
  EVENT_DID_CHANGE,
} from '../../../../../cfds/client/graph/vertex-manager.ts';
import {
  MutationPack,
  mutationPackIter,
} from '../../../../../cfds/client/graph/mutations.ts';
import { Vertex } from '../../../../../cfds/client/graph/vertex.ts';
import { User } from '../../../../../cfds/client/graph/vertices/user.ts';
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

export function useVertexByKey<V extends Vertex>(key: string): V | undefined {
  const graph = useGraphManager();

  const vertexMng = useMemo<VertexManager<V> | undefined>(
    () =>
      (graph && graph.hasVertex(key) && graph.getVertexManager<V>(key)) ||
      undefined,
    [graph, key]
  );

  return useVertex(vertexMng);
}

export type VertexId<T extends Vertex = Vertex> = T | string | VertexManager<T>;

export function KeyFromVertexId<T extends Vertex>(id: VertexId<T>): string {
  return typeof id === 'string' ? id : id.key;
}

export function useVertexManager<V extends Vertex>(
  id: VertexId<V> | undefined | null
): VertexManager<V> | undefined | null;

export function useVertexManager<V extends Vertex>(
  id: VertexId<V> | undefined
): VertexManager<V> | undefined;

export function useVertexManager<V extends Vertex>(
  id: VertexId<V> | null
): VertexManager<V> | null;

export function useVertexManager<V extends Vertex>(
  id: VertexId<V>
): VertexManager<V>;

export function useVertexManager<V extends Vertex>(
  id: VertexId<V> | undefined | null
): VertexManager<V> | undefined | null {
  const graph = useGraphManager();
  if (typeof id === 'undefined' || id === null) {
    return id;
  }
  const key = id instanceof VertexManager || id instanceof Vertex ? id.key : id;
  return graph.getVertexManager<V>(key);
}

export function useVerticesManagers<V extends Vertex>(
  iter: Iterable<VertexId<V> | undefined | null>
): (VertexManager<V> | undefined | null)[];

export function useVerticesManagers<V extends Vertex>(
  iter: Iterable<VertexId<V> | undefined>
): (VertexManager<V> | undefined)[];

export function useVerticesManagers<V extends Vertex>(
  iter: Iterable<VertexId<V> | null>
): (VertexManager<V> | null)[];

export function useVerticesManagers<V extends Vertex>(
  iter: Iterable<VertexId<V>>
): VertexManager<V>[];

export function useVerticesManagers<V extends Vertex>(
  iter: Iterable<VertexId<V> | undefined | null>
): (VertexManager<V> | undefined | null)[] {
  const graph = useGraphManager();
  if (typeof iter === 'undefined' || iter === null) {
    return iter;
  }
  return Array.from(
    mapIterable(iter, (id) => {
      const key =
        id instanceof VertexManager || id instanceof Vertex ? id.key : id;
      return typeof key === 'string' ? graph.getVertexManager<V>(key) : key;
    })
  );
}

export function usePartialVertex<V extends Vertex, K extends keyof V>(
  vertexMng: VertexId<V>,
  keys: K[],
  opts?: OnChangeOpts
): Pick<V, K> & V;

export function usePartialVertex<V extends Vertex, K extends keyof V>(
  vertexMng: undefined | VertexId<V>,
  keys: K[],
  opts?: OnChangeOpts
): undefined | (Pick<V, K> & V);

export function usePartialVertex<V extends Vertex, K extends keyof V>(
  vertId: VertexId<V> | undefined,
  keys: K[],
  opts: OnChangeOpts = EMPTY_OPTS
): (Pick<V, K> & V) | undefined {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setReload] = useState(0);

  if (!vertId) {
    return undefined;
  }
  const vertexMng = useVertexManager(vertId);

  const keysStr = keys.join('-');
  useEffect(() => {
    return register(
      vertexMng,
      () => setReload((x) => x + 1),
      keys as string[],
      opts
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertexMng, opts, keysStr]);

  return vertexMng
    ? (vertexMng.getVertexProxy() as unknown as Pick<V, K> & V)
    : ({} as unknown as Pick<V, K> & V);
}

export function useVertex<V extends Vertex>(
  vertexMng: VertexId<V>,
  opts?: OnChangeOpts
): V;

export function useVertex<V extends Vertex>(
  vertexMng: VertexId<V> | undefined,
  opts?: OnChangeOpts
): V | undefined;

export function useVertex<V extends Vertex>(
  vertexId: VertexId<V> | undefined,
  opts: OnChangeOpts = EMPTY_OPTS
): V | undefined {
  const vertexMng = useVertexManager(vertexId);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setReload] = useState(0);
  useEffect(() => {
    return register(vertexMng, () => setReload((x) => x + 1), [], opts);
  }, [vertexMng, opts]);

  return vertexMng?.getVertexProxy();
}

function filterFunc(
  fn: void | (() => void | undefined)
): fn is () => void | undefined {
  return !!fn;
}

export function useVertices<V extends Vertex>(
  vertexManagers: Iterable<VertexId<V> | undefined | null>,
  opts: OnChangeOpts = EMPTY_OPTS
): V[] {
  return usePartialVertices(vertexManagers, [], opts) as V[];
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

export function usePartialVertices<
  V extends Vertex,
  K extends keyof V = keyof V
>(
  vertexIds: Iterable<VertexId<V>>,
  keys: K[],
  opts?: OnChangeOpts
): (Pick<V, K> & Vertex)[];

export function usePartialVertices<
  V extends Vertex,
  K extends keyof V = keyof V
>(
  vertexIds: Iterable<VertexId<V> | undefined | null>,
  keys: K[],
  opts?: OnChangeOpts
): ((Pick<V, K> & Vertex) | undefined | null)[];

export function usePartialVertices<
  V extends Vertex,
  K extends keyof V = keyof V
>(
  vertexIds: Iterable<VertexId<V> | undefined>,
  keys: K[],
  opts?: OnChangeOpts
): ((Pick<V, K> & Vertex) | undefined)[];

export function usePartialVertices<
  V extends Vertex,
  K extends keyof V = keyof V
>(
  vertexIds: Iterable<VertexId<V> | null>,
  keys: K[],
  opts?: OnChangeOpts
): ((Pick<V, K> & Vertex) | null)[];

export function usePartialVertices<
  V extends Vertex,
  K extends keyof V = keyof V
>(
  vertexIds: Iterable<VertexId<V> | undefined | null>,
  keys: K[],
  opts: OnChangeOpts = EMPTY_OPTS
): ((Pick<V, K> & Vertex) | undefined | null)[] {
  const vertexManagers = useVerticesManagers(vertexIds);
  const [reload, setReload] = useState(0);
  const keysStr = keys.join('-');
  useEffect(() => {
    if (!vertexManagers.length) {
      return;
    }
    const unSubs = vertexManagers
      .map((m) => {
        return register(
          m,
          () => setReload((x) => x + 1),
          keys as string[],
          opts
        );
      })
      .filter(filterFunc);
    return () => unSubs.forEach((fn) => fn());
  }, [vertexManagers, opts, keysStr]);
  const result = useMemo(
    () =>
      vertexManagers.map((x) => (x instanceof VertexManager ? x.vertex : x)),
    [vertexManagers, reload]
  );

  return result;
}

export function useCurrentUser() {
  const graph = useGraphManager();
  return useVertexByKey<User>(graph.rootKey)!;
}
