import EventEmitter from 'eventemitter3';

export const EVENT_LOADING_FINISHED = 'LOADING_FINISHED';
export const EVENT_VERTEX_CHANGED = 'VERTEX_CHANGED';
export const EVENT_VERTEX_DELETED = 'VERTEX_DELETED';

export abstract class VertexSource extends EventEmitter {
  abstract readonly isLoading: boolean;
  abstract keys(): Iterable<string>;

  abstract hasVertex(key: string): boolean;
}
