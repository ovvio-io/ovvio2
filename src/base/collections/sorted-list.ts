import { bsearch } from '../algorithms.ts';

function defaultComparator<T>(a: T, b: T): number {
  return (a as any) - (b as any);
}

function defaultEQ<T>(a: T, b: T): boolean {
  return a === b;
}

export class SortedList<T> {
  private readonly _arr: T[];
  private readonly _comparator: (x: T, y: T) => number;
  private readonly _eq: (a: T, y: T) => boolean;

  constructor(
    comparator?: (x: T, y: T) => number,
    eq?: (a: T, y: T) => boolean
  ) {
    this._arr = [];
    this._comparator = comparator || defaultComparator;
    this._eq = eq || defaultEQ;
  }

  at(index: number): T | undefined {
    return this._arr[index];
  }

  get length(): number {
    return this._arr.length;
  }

  get first(): T | undefined {
    return this._arr[0];
  }

  get last(): T | undefined {
    return this._arr[this._arr.length - 1];
  }

  *iterItems(from = 0, length = this._arr.length): Generator<[number, T]> {
    for (let i = from; i < length; i++) {
      const element = this._arr[i];
      yield [i, element];
    }
  }

  push(v: T): number {
    const arr = this._arr;
    const idx = bsearch(arr, v, this._comparator);
    if (idx >= arr.length || !this._eq(arr[idx], v)) {
      this._arr.splice(idx, 0, v);
    }
    return this._arr.length;
  }

  pop(): T | undefined {
    return this._arr.pop();
  }

  delete(v: T): boolean {
    const arr = this._arr;
    const idx = bsearch(arr, v, this._comparator);
    if (idx < arr.length && this._eq(arr[idx], v)) {
      arr.splice(idx, 1);
      return true;
    }
    return false;
  }

  deleteIndex(idx: number): boolean {
    const arr = this._arr;
    if (idx < arr.length) {
      arr.splice(idx, 1);
      return true;
    }
    return false;
  }

  has(v: T): boolean {
    return this.findIndex(v) >= 0;
  }

  findIndex(v: T): number {
    const arr = this._arr;
    const idx = bsearch(arr, v, this._comparator);
    if (idx < arr.length && this._eq(arr[idx], v)) {
      return idx;
    }
    return -1;
  }

  *[Symbol.iterator]() {
    for (let i of this._arr) {
      yield i;
    }
  }
}
