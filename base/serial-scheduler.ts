export class SerialScheduler {
  private _lastPromise: Promise<any> | null = null;

  run<T>(fn: () => Promise<T>): Promise<T> {
    if (!this._lastPromise) {
      const p = fn();
      this._lastPromise = p;
      return p.finally(() => {
        if (this._lastPromise === p) {
          this._lastPromise = null;
        }
      });
    }

    const p = this._lastPromise.finally(() => {
      return fn().finally(() => {
        if (this._lastPromise === p) {
          this._lastPromise = null;
        }
      });
    });

    this._lastPromise = p;

    return p;
  }
}
