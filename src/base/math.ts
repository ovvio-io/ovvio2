export interface NumberAggregator {
  get currentValue(): number;
  addValue(v: number): void;
}

export function avg(values: Iterable<number>): number {
  let result = 0;
  let count = 0;
  for (const v of values) {
    result += v;
    ++count;
  }
  return count === 0 ? 0 : result / count;
}

export class MovingAverage implements NumberAggregator {
  private readonly _readingsCount: number;
  private _values: number[];

  constructor(readingsCount: number) {
    this._readingsCount = readingsCount;
    this._values = [];
  }

  get currentValue(): number {
    return avg(this._values);
  }

  addValue(v: number): void {
    const values = this._values;
    if (values.length >= this._readingsCount) {
      values.shift();
    }
    values.push(v);
  }
}
