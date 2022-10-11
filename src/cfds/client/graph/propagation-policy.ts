import { assert } from 'console';
import { SchemeNamespace } from 'src/base/scheme-types';
import { CoreValue } from 'src/core-types';
import { Mutation } from './mutations';
import { Vertex } from './vertex';

export type MutationSource = [scheme: SchemeNamespace, fieldName: string];

export interface DestinationResolver<T extends Vertex = Vertex> {
  (vert: T, mutation: Mutation): void;
}

export interface NeighborDidMutateCallback {
  (local: boolean, oldValue: CoreValue, neighbor: Vertex): void;
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
        `Parent mutation handler '${vertCallback}' does not exist on vertex of type '${vert.namespace}'`
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
        `Parent mutation handler '${vertCallback}' does not exist on vertex of type '${vert.namespace}'`
      );
      callback(mutation[1], mutation[2], vert);
    }
  };
}
