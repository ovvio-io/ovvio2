import { CoreValue } from '../../../base/core-types/base.ts';
import { assert } from '../../../base/error.ts';
import { SchemeNamespace } from '../../base/scheme-types.ts';
import { Mutation, MutationOrigin } from './mutations.ts';
import { Vertex } from './vertex.ts';

export type MutationSource = [scheme: SchemeNamespace, fieldName: string];

export interface DestinationResolver<T extends Vertex = Vertex> {
  (vert: T, mutation: Mutation): void;
}

export interface NeighborDidMutateCallback {
  (source: MutationOrigin, oldValue: CoreValue, neighbor: Vertex): void;
}

export interface FieldRelationship {
  src: MutationSource;
  dst: DestinationResolver;
}

export type VertexRelationships<T extends Vertex> = {
  [key in keyof T]?: () => void;
};

export class PropagationPolicy {
  private readonly _relationships: Map<
    SchemeNamespace,
    Map<string, DestinationResolver>
  >;

  constructor(relationships: FieldRelationship[]) {
    this._relationships = new Map();
  }
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
