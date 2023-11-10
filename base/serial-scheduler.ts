export class SerialScheduler {
  private static readonly _namedSchedulers = new Map<string, SerialScheduler>();
  private _lastPromise: Promise<unknown> | null = null;

  static get(name: string): SerialScheduler {
    let scheduler = this._namedSchedulers.get(name);
    if (!scheduler) {
      scheduler = new this();
      this._namedSchedulers.set(name, scheduler);
    }
    return scheduler;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (!this._lastPromise) {
      const p = fn();
      this._lastPromise = p;
      try {
        return await p;
      } finally {
        if (this._lastPromise === p) {
          this._lastPromise = null;
        }
      }
    }

    const p = this._lastPromise.finally(async () => {
      try {
        return await fn();
      } finally {
        if (this._lastPromise === p) {
          this._lastPromise = null;
        }
      }
    });

    this._lastPromise = p;
    return p as Promise<T>;
  }
}
