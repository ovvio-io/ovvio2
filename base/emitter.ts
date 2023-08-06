import { Timer, TimerCallback } from './timer.ts';

export type EmitterEvent = 'EmitterSuspended' | 'EmitterResumed';

export type EmitterCallback = () => void;

export class Emitter<T> {
  private readonly _suspendCallbacks: EmitterCallback[];
  private readonly _resumeCallbacks: EmitterCallback[];
  private readonly _callbacks: Map<T, EmitterCallback[]>;
  private readonly _delayedEmissionTimer?: Timer;
  private _pendingEmissions: [event: T | EmitterEvent, args: unknown[]][];

  constructor(
    delayedEmissionTimerConstructor?: (callback: TimerCallback) => Timer
  ) {
    this._suspendCallbacks = [];
    this._resumeCallbacks = [];
    this._callbacks = new Map();
    if (delayedEmissionTimerConstructor) {
      this._delayedEmissionTimer = delayedEmissionTimerConstructor(() => {
        const emissions = this._pendingEmissions;
        this._pendingEmissions = [];
        for (const [e, args] of emissions) {
          this.emitInPlace(e, ...args);
        }
      });
    }
    this._pendingEmissions = [];
  }

  get isActive(): boolean {
    return this._callbacks.size > 0;
  }

  emit<E extends T | EmitterEvent>(e: E, ...args: unknown[]): void {
    if (this._delayedEmissionTimer) {
      this._pendingEmissions.push([e, args]);
      this._delayedEmissionTimer.schedule();
    } else {
      this.emitInPlace(e, ...args);
    }
  }

  private emitInPlace<E extends T | EmitterEvent>(
    e: E,
    ...args: unknown[]
  ): void {
    let callbacks: EmitterCallback[] | undefined;
    if (e === 'EmitterSuspended') {
      callbacks = this._suspendCallbacks;
    } else if (e === 'EmitterResumed') {
      callbacks = this._resumeCallbacks;
    } else {
      callbacks = this._callbacks.get(e as T);
    }
    if (!callbacks || !callbacks.length) {
      return;
    }
    for (const f of callbacks) {
      (f as (...arg0: unknown[]) => void)(...args);
    }
  }

  attach<E extends T | EmitterEvent>(e: E, callback: EmitterCallback): void {
    if (e === 'EmitterSuspended' || e === 'EmitterResumed') {
      const arr =
        e === 'EmitterSuspended'
          ? this._suspendCallbacks
          : this._resumeCallbacks;
      if (!arr.includes(callback)) {
        arr.push(callback);
      }
      return;
    }
    const wasActive = this.isActive;
    let arr = this._callbacks.get(e as T);
    if (!arr) {
      arr = [];
      this._callbacks.set(e as T, arr);
    }
    if (!arr.includes(callback)) {
      arr.push(callback);
    }
    if (!wasActive) {
      this.resume();
      this.emit('EmitterResumed');
    }
  }

  detach<E extends T | EmitterEvent>(e: E, callback: EmitterCallback): void {
    if (e === 'EmitterSuspended' || e === 'EmitterResumed') {
      const arr =
        e === 'EmitterSuspended'
          ? this._suspendCallbacks
          : this._resumeCallbacks;
      const idx = arr.indexOf(callback);
      if (idx >= 0) {
        arr.splice(idx, 1);
      }
      return;
    }
    const arr = this._callbacks.get(e as T);
    if (!arr) {
      return;
    }
    const idx = arr.indexOf(callback);
    if (idx < 0) {
      return;
    }
    if (arr.length === 1) {
      this._callbacks.delete(e as T);
      if (!this.isActive) {
        this.suspend();
        this.emit('EmitterSuspended');
      }
    }
  }

  protected suspend(): void {}

  protected resume(): void {}
}
