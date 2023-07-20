import { CoreValue, coreValueEquals } from '../../../core-types';
import { ICursor } from '../types';
import { CombineCursor } from './combine';

/**
 * SubCursor goes over two cursors using logical "-" to combine.
 */
export class SubCursor<V extends CoreValue> extends CombineCursor<V> {
  private _currentItem?: [CoreValue, V];

  constructor(cursor1: ICursor<V>, cursor2: ICursor<V>) {
    super(cursor1, cursor2);
  }

  get isDone() {
    this.ensureInit();
    return this._cursor1.isDone;
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
    this._cursor1.move();
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

      if (item1 === undefined) {
        //if the first cursor has finished we are done
        this._currentItem = undefined;
        return;
      }

      if (item2 === undefined) {
        this._currentItem = item1;
        return;
      }

      const compare = this.compareSortValue(item1, item2);
      if (compare > 0) {
        //The second cursor is bigger
        this._cursor2.move();
      } else if (compare < 0) {
        //The first cursor is bigger
        this._currentItem = item1;
        return;
      } else {
        if (!coreValueEquals(item1[1], item2[1])) {
          this._cursor2.move();
        } else {
          //Equal values, item can't be from cursor 1
          this._cursor1.move();
          this._cursor2.move();
        }
      }
    }
  }

  contains(value: V) {
    return this._cursor1.contains(value) && !this._cursor2.contains(value);
  }
}
