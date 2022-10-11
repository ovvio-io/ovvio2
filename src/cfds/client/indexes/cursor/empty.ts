import { CoreValue } from '../../../core-types';
import { BaseCursor } from './base';

/**
 * EmptyCursor
 */
export class EmptyCursor<V extends CoreValue> extends BaseCursor<V> {
  protected init(): void {}
  constructor() {
    super();
  }

  get isAsc(): boolean {
    return true;
  }

  get isDone() {
    return true;
  }

  get item(): [CoreValue, V] | undefined {
    return undefined;
  }
  get value(): V | undefined {
    return undefined;
  }

  move() {}

  contains(_value: V) {
    return false;
  }
}
