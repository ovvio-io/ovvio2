import EventEmitter from 'https://esm.sh/eventemitter3@4.0.7';
import { CoreValue } from '../../../base/core-types/base.ts';

export const EVENT_LOADING_FINISHED = 'LOADING_FINISHED';
export const EVENT_VERTEX_CHANGED = 'VERTEX_CHANGED';
export const EVENT_VERTEX_DELETED = 'VERTEX_DELETED';
export const EVENT_VERTEX_SOURCE_CLOSED = 'VERTEX_SOURCE_CLOSED';

export type GroupId<GT extends CoreValue> = GT | null;

export abstract class VertexSource<
  GT extends CoreValue = CoreValue
> extends EventEmitter {
  abstract readonly isLoading: boolean;

  abstract keys(gid?: GroupId<GT>): Iterable<string>;

  abstract hasVertex(key: string): boolean;

  abstract close(): void;

  abstract keyInGroup(key: string, gid: GroupId<GT>): boolean;
}
