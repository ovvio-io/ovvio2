import { CoreValue } from '../../../base/core-types/base.ts';
import { Emitter } from '../../../base/emitter.ts';

// export const EVENT_LOADING_FINISHED = 'LOADING_FINISHED';
// export const EVENT_VERTEX_CHANGED = 'VERTEX_CHANGED';
// export const EVENT_VERTEX_DELETED = 'VERTEX_DELETED';

export type VertexSourceEvent =
  | 'loading-finished'
  | 'vertex-changed'
  | 'vertex-deleted'
  | 'results-changed';

export type GroupId<GT extends CoreValue> = GT | null;

export interface VertexSource<GT extends CoreValue = CoreValue>
  extends Emitter<VertexSourceEvent> {
  readonly isLoading: boolean;
  readonly graph: VertexSource;

  keys(gid?: GroupId<GT>): Iterable<string>;

  hasVertex(key: string): boolean;

  keyInGroup(key: string, gid: GroupId<GT>): boolean;
}
