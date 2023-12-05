export class SerialScheduler {
  private static readonly _namedSchedulers = new Map<string, SerialScheduler>();
  private _pendingFunctions: (() => Promise<unknown>)[];
  private _runningPromise: Promise<unknown> | undefined;

  constructor() {
    this._pendingFunctions = [];
  }

  static get(name: string): SerialScheduler {
    let scheduler = this._namedSchedulers.get(name);
    if (!scheduler) {
      scheduler = new this();
      this._namedSchedulers.set(name, scheduler);
    }
    return scheduler;
  }

  private async wrapFn<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } finally {
      const nextFn = this._pendingFunctions.shift();
      if (nextFn) {
        this._runningPromise = this.wrapFn(nextFn);
      }
    }
  }

  run<T>(fn: () => Promise<T>): Promise<T> {
    let resolve, reject;
    const result = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const wrapper = async () => {
      try {
        resolve!(await fn());
      } catch (err: unknown) {
        reject!(err);
      } finally {
        const nextFn = this._pendingFunctions.shift();
        if (nextFn) {
          this._runningPromise = this.wrapFn(nextFn);
        } else {
          this._runningPromise = undefined;
        }
      }
    };
    if (!this._runningPromise) {
      this._runningPromise = wrapper();
    } else {
      this._pendingFunctions.push(wrapper);
    }
    return result;
  }
}
