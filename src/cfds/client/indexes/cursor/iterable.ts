import { CoreValue } from '../../../core-types';
import { BaseCursor } from './base';

export class IterableCursor<V extends CoreValue> extends BaseCursor<V> {
  private _genIterable: () => Iterable<[CoreValue, V]>;
  private _containsFunc: (value: V) => boolean;
  private _filter?: (value: V) => boolean;

  private _iterator?: Iterator<[CoreValue, V], any, undefined>;
  private _current?: IteratorResult<[CoreValue, V]>;
  private _isAsc: boolean;

  constructor(
    genIterable: () => Iterable<[CoreValue, V]>,
    containsFunc: (value: V) => boolean,
    isAsc?: boolean,
    filter?: (value: V) => boolean
  ) {
    super();
    this._genIterable = genIterable;
    this._containsFunc = containsFunc;
    this._isAsc = isAsc !== undefined ? isAsc : true;
    this._filter = filter;
  }

  get isAsc() {
    return this._isAsc;
  }

  get isDone(): boolean {
    this.ensureInit();
    return this._current?.done || false;
  }

  get item(): [CoreValue, V] | undefined {
    this.ensureInit();
    if (this._current && this._current.done === false) {
      return this._current.value;
    }
  }

  get value(): V | undefined {
    const item = this.item;
    return item?.[1];
  }

  move(): void {
    this.ensureInit();
    this._moveToNext();
  }

  private _moveToNext() {
    let keepGoing = true;
    while (keepGoing) {
      this._current = this._iterator!.next();
      if (this._current.done === true) {
        keepGoing = false;
      } else {
        if (
          this._filter === undefined ||
          this._filter(this._current.value[1])
        ) {
          keepGoing = false;
        }
      }
    }
  }

  contains(value: V): boolean {
    return (
      this._containsFunc(value) &&
      (this._filter === undefined || this._filter(value))
    );
  }

  protected init(): void {
    this._iterator = this._genIterable()[Symbol.iterator]();
    this._moveToNext();
  }
}
