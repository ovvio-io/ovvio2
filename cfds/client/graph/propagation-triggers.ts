/**
 * This file contains a set of common field triggers that can be installed
 * on specific Vertex fields.
 */
import { assert } from '../../../base/error.ts';
import { SchemeNamespace } from '../../base/scheme-types.ts';
import { CoreValue } from '../../../base/core-types/index.ts';
import { Mutation, MutationPack, mutationPackIsEmpty } from './mutations.ts';
import { FieldChangeTrigger, Vertex } from './vertex.ts';

/**
 * An interface of a method that gets called in response to a neighboring
 * vertex's field mutation.
 */
export interface NeighborDidMutateCallback {
  /**
   * @param local Whether the change is local or remote.
   * @param oldValue The old value of the field that triggered this change
   *                 in the neighboring vertex.
   * @param neighbor The neighbor that changed.
   *
   * @requires MutationPack A mutation pack with side effects of this.
   */
  (local: boolean, oldValue: CoreValue, neighbor: Vertex): MutationPack;
}

/**
 * Assuming two vertices P and C, where P is the parent of C, this function
 * returns a trigger that can be installed on C's field change. This trigger
 * will invoke P.vertCallback() whenever C mutates.
 *
 * @param vertCallback A method name on the parent vertex that conforms to
 *                     NeighborDidMutateCallback.
 * @param parentScheme An optional scheme that the parent must match in order
 *                     for the trigger to fire.
 *
 * @returns A field trigger function that propagates the vertex's mutation to
 *          its parent.
 */
export function triggerParent<T extends Vertex>(
  vertCallback: keyof T,
  parentScheme?: SchemeNamespace
): FieldChangeTrigger<T> {
  return (vert: T, mutation: Mutation) => {
    const parent = vert.parent as T | undefined;
    if (
      parent !== undefined &&
      (parentScheme === undefined ||
        parent.manager.scheme.namespace === parentScheme)
    ) {
      const callback: NeighborDidMutateCallback = parent[vertCallback] as any;
      assert(
        callback !== undefined,
        `Parent mutation handler '${String(
          vertCallback
        )}' does not exist on vertex of type '${vert.namespace}'`
      );
      const sideEffects = callback.call(parent, mutation[1], mutation[2], vert);
      if (!mutationPackIsEmpty(sideEffects)) {
        parent.manager.vertexDidMutate(sideEffects);
      }
    }
  };
}

/**
 * Assuming two vertices P and C, where P is the parent of C, this function
 * returns a trigger that can be installed on P's field change. This trigger
 * will invoke C.vertCallback() on each of P's children..
 *
 * @param vertCallback A method name on the child vertex that conforms to
 *                     NeighborDidMutateCallback.
 * @param childScheme  An optional scheme that the a child must match in order
 *                     for the trigger to fire. Only children that match the
 *                     scheme will receive the trigger.
 *
 * @returns A field trigger function that propagates the vertex's mutation to
 *          its children.
 */
export function triggerChildren<T extends Vertex>(
  vertCallback: keyof T,
  childScheme?: SchemeNamespace
): FieldChangeTrigger<T> {
  return (vert: T, mutation: Mutation) => {
    for (const [child] of vert.inEdges('parent')) {
      // Skip children that don't match the provided scheme
      if (
        childScheme !== undefined &&
        child.manager.scheme.namespace !== childScheme
      ) {
        continue;
      }
      const callback: NeighborDidMutateCallback = (child as T)[
        vertCallback
      ] as any;
      assert(
        callback !== undefined,
        `Parent mutation handler '${String(
          vertCallback
        )}' does not exist on vertex of type '${vert.namespace}'`
      );
      const sideEffects = callback.call(child, mutation[1], mutation[2], vert);
      if (!mutationPackIsEmpty(sideEffects)) {
        child.manager.vertexDidMutate(sideEffects);
      }
    }
  };
}

/**
 * Given two field triggers `t1` and `t2`, this function creates and returns a
 * composite trigger that fires both triggers one after the other.
 * @param t1 First trigger.
 * @param t2 Second trigger.
 * @returns A composite trigger.
 */
export function triggerCompose<T extends Vertex>(
  t1: FieldChangeTrigger<T>,
  t2: FieldChangeTrigger<T>
): FieldChangeTrigger<T> {
  return (vert: T, mutation: Mutation) => {
    t1(vert, mutation);
    t2(vert, mutation);
  };
}
