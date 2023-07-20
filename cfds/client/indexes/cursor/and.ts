import { CoreValue, coreValueEquals } from '../../../core-types';
import { ICursor } from '../types';
import { CombineCursor } from './combine';

/**
 * AndCursor goes over two cursors using logical "AND" to combine.
 */
export class AndCursor<V extends CoreValue> extends CombineCursor<V> {
  private _currentItem?: [CoreValue, V];

  constructor(cursor1: ICursor<V>, cursor2: ICursor<V>) {
    super(cursor1, cursor2);
  }

  get isDone() {
    this.ensureInit();
    return this._cursor1.isDone || this._cursor2.isDone;
  }

  get item(): [CoreValue, V] | undefined {
    this.ensureInit();
    return this._currentItem;
  }

  get value(): V | undefined {
    this.ensureInit();
    return this._currentItem?.[1];
  }

  move() {
    this.ensureInit();
    if (this._currentItem === undefined) return;

    const item1 = this._cursor1.item;
    const item2 = this._cursor2.item;

    if (item1 === undefined || item2 === undefined) {
      //if one of the cursors are done, than it is over
      this._currentItem = undefined;
      return;
    }

    const compare = this.compareSortValue(item1, item2);
    if (compare <= 0) {
      this._cursor1.move();
    } else {
      this._cursor2.move();
    }
    this._findNextItem();
  }

  reset() {
    super.reset();
    this._cursor1.reset();
    this._cursor2.reset();
  }

  protected init() {
    this._findNextItem();
  }

  private _findNextItem() {
    while (true) {
      const item1 = this._cursor1.item;
      const item2 = this._cursor2.item;

      if (item1 === undefined || item2 === undefined) {
        //if one of the cursors are done, than it is over
        this._currentItem = undefined;
        return;
      }

      if (coreValueEquals(item1[1], item2[1])) {
        this._currentItem = item1;
        return;
      }

      const compare = this.compareSortValue(item1, item2);
      if (compare <= 0) {
        this._cursor1.move();
      } else {
        this._cursor2.move();
      }
    }
  }

  contains(value: V) {
    return this._cursor1.contains(value) && this._cursor2.contains(value);
  }
}
