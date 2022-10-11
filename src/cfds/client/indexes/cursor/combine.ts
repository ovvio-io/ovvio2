import { CoreValue, coreValueCompare } from '../../../core-types';
import { ICursor } from '../types';
import { BaseCursor } from './base';

export abstract class CombineCursor<V extends CoreValue> extends BaseCursor<V> {
  protected _cursor1: ICursor<V>;
  protected _cursor2: ICursor<V>;

  constructor(cursor1: ICursor<V>, cursor2: ICursor<V>) {
    super();

    this._cursor1 = cursor1;
    this._cursor2 = cursor2;
  }

  get isAsc() {
    return this._cursor1.isAsc;
  }

  protected compareSortValue(
    item1: [CoreValue, V] | undefined,
    item2: [CoreValue, V] | undefined
  ) {
    const comp = coreValueCompare(item1?.[0], item2?.[0]);
    return this._cursor1.isAsc ? comp : comp * -1;
  }
}
