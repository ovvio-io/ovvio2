import { assert } from '../../../base/error.ts';
import { SchemeNamespace } from '../../base/scheme-types.ts';
import { CoreValue } from '../../../base/core-types/index.ts';
import { Mutation } from './mutations.ts';
import { Vertex } from './vertex.ts';

export type MutationSource = [scheme: SchemeNamespace, fieldName: string];

export interface DestinationResolver<T extends Vertex = Vertex> {
  (vert: T, mutation: Mutation): void;
}

export interface NeighborDidMutateCallback {
  (local: boolean, oldValue: CoreValue, neighbor: Vertex): void;
}

export function parentDestinationResolver<T extends Vertex>(
  vertCallback: keyof T
): DestinationResolver<T> {
  return (vert: T, mutation: Mutation) => {
    const parent = vert.parent as T | undefined;
    if (parent !== undefined) {
      const callback: NeighborDidMutateCallback = parent[vertCallback] as any;
      assert(
        callback !== undefined,
        `Parent mutation handler '${String(
          vertCallback
        )}' does not exist on vertex of type '${vert.namespace}'`
      );
      callback(mutation[1], mutation[2], vert);
    }
  };
}

export function childrenDestinationResolver<T extends Vertex>(
  vertCallback: keyof T
): DestinationResolver<T> {
  return (vert: T, mutation: Mutation) => {
    for (const [child] of vert.inEdges('parent')) {
      const callback: NeighborDidMutateCallback = (child as T)[
        vertCallback
      ] as any;
      assert(
        callback !== undefined,
        `Parent mutation handler '${String(
          vertCallback
        )}' does not exist on vertex of type '${vert.namespace}'`
      );
      callback(mutation[1], mutation[2], vert);
    }
  };
}
