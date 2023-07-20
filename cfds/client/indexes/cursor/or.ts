import { CoreValue, coreValueEquals } from '../../../core-types';
import { ICursor } from '../types';
import { CombineCursor } from './combine';

/**
 * OrCursor goes over two cursors using logical "OR" to combine.
 */
export class OrCursor<V extends CoreValue> extends CombineCursor<V> {
  private _currentCompare: number = 0;
  private _currentCursor: ICursor<V>;

  constructor(cursor1: ICursor<V>, cursor2: ICursor<V>) {
    super(cursor1, cursor2);
    this._currentCursor = cursor1;
  }

  get isDone() {
    this.ensureInit();
    return this._cursor1.isDone && this._cursor2.isDone;
  }

  get item(): [CoreValue, V] | undefined {
    this.ensureInit();
    return this._currentCursor?.item;
  }

  get value(): V | undefined {
    this.ensureInit();
    return this._currentCursor?.value;
  }

  move() {
    this.ensureInit();
    if (this._currentCompare === 0) {
      if (this._currentCursor === this._cursor1) {
        if (!coreValueEquals(this._cursor1.value, this._cursor2.value)) {
          this._currentCursor = this._cursor2;
          return;
        }
      }

      this._cursor1.move();
      this._cursor2.move();
    } else {
      this._currentCursor.move();
    }

    this._setCurrentCompare();
  }

  reset() {
    super.reset();
    this._cursor1.reset();
    this._cursor2.reset();
  }

  protected init() {
    this._setCurrentCompare();
  }

  private _setCurrentCompare() {
    const item1 = this._cursor1.item;
    const item2 = this._cursor2.item;

    if (item1 === undefined && item2 === undefined) return;

    if (item1 !== undefined && item2 === undefined) {
      this._currentCompare = -1;
      this._currentCursor = this._cursor1;
    } else if (item1 === undefined && item2 !== undefined) {
      this._currentCompare = 1;
      this._currentCursor = this._cursor2;
    } else {
      this._currentCompare = this.compareSortValue(item1, item2);
      if (this._currentCompare <= 0) {
        this._currentCursor = this._cursor1;
      } else if (this._currentCompare > 0) {
        this._currentCursor = this._cursor2;
      }
    }
  }

  contains(value: V) {
    return this._cursor1.contains(value) || this._cursor2.contains(value);
  }
}
