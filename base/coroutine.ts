import { NextEventLoopCycleTimer, Timer } from './timer.ts';

const kSingleFrameTime = 1000 / 60; // 60 fps
// 1/3 of a frame every event loop cycle
const kSchedulerCycleTimeMs = kSingleFrameTime / 3;

export interface CancellablePromise<T> extends Promise<T> {
  cancel(): void;
}

class Coroutine {
  private readonly _generator: Generator;
  private _doneHandler: () => void;
  private _timeSpentMs: number;
  private _done: boolean;

  readonly name: string | undefined;

  static pack(
    id: number,
    g: Generator,
    name?: string
  ): [Coroutine, CancellablePromise<void>] {
    let resolve: () => void;
    const promise = new Promise<void>((res) => {
      resolve = res;
    });
    const coroutine = new Coroutine(id, g, resolve!, name);
    (promise as CancellablePromise<void>).cancel = () => coroutine.cancel();
    return [coroutine, promise as CancellablePromise<void>];
  }

  constructor(
    readonly id: number,
    generator: Generator,
    doneHandler: () => void,
    name?: string
  ) {
    this._generator = generator;
    this._doneHandler = doneHandler;
    this._timeSpentMs = 0;
    this._done = false;
    this.name = name;
  }

  get isDone(): boolean {
    return this._done;
  }

  run(): void {
    if (this._done) {
      return;
    }
    const res = this._generator.next();
    if (res.done === true) {
      this._done = true;
      this._doneHandler();
    }
  }

  compare(other: Coroutine): number {
    if (other === this) {
      return 0;
    }
    const dt = other._timeSpentMs - this._timeSpentMs;
    if (dt !== 0) {
      return dt;
    }
    return other.id - this.id;
  }

  appendExecutionTime(dt: number): void {
    this._timeSpentMs += dt;
  }

  cancel(): void {
    if (this._done) {
      return;
    }
    this._done = true;
    this._doneHandler();
  }
}

function compareCoroutines(c1: Coroutine, c2: Coroutine): number {
  return c1.compare(c2);
}

export enum SchedulerPriority {
  Normal = 0,
  Background,
  _Count,
}

export interface Scheduler {
  schedule(
    g: Generator,
    priority?: SchedulerPriority,
    name?: string
  ): CancellablePromise<void>;
}

export class CoroutineScheduler implements Scheduler {
  private readonly _timer: Timer;
  private _scheduledCoroutines: Coroutine[][];
  private _coroutineId: number;

  static sharedScheduler(): CoroutineScheduler {
    return kSharedScheduler;
  }

  constructor() {
    this._scheduledCoroutines = [];
    for (let priority = 0; priority < SchedulerPriority._Count; ++priority) {
      this._scheduledCoroutines.push([]);
    }
    this._timer = new NextEventLoopCycleTimer(() => this.tick());
    // this._timer = new SimpleTimer(kSchedulerCycleTimeMs, false, () =>
    //   this.tick()
    // );
    this._coroutineId = 0;
  }

  private _executeFromQueue(queue: Coroutine[], timeLimitMs: number): void {
    const startTime = getRelativeTimestamp();
    const executedCoroutines = new Set<Coroutine>();
    let i = 0;
    while (
      queue.length > 0 &&
      getRelativeTimestamp() - startTime < timeLimitMs
    ) {
      for (; i < Math.min(50, queue.length); ++i) {
        const c = queue.splice(i, 1)[0];
        c.run();
        executedCoroutines.add(c);
        if (!c.isDone) {
          queue.push(c);
        }
      }
      i = i % queue.length;
    }
    const avgRunningTime =
      (getRelativeTimestamp() - startTime) / executedCoroutines.size;
    for (const c of executedCoroutines) {
      c.appendExecutionTime(avgRunningTime);
    }
    queue.sort(compareCoroutines);
  }

  private tick(): boolean {
    const normalStartTime = getRelativeTimestamp();
    const normalQueue = this._scheduledCoroutines[SchedulerPriority.Normal];
    const backgroundQueue =
      this._scheduledCoroutines[SchedulerPriority.Background];
    this._executeFromQueue(normalQueue, kSchedulerCycleTimeMs);
    const backgroundRunTime =
      kSchedulerCycleTimeMs - (getRelativeTimestamp() - normalStartTime);
    if (backgroundRunTime > 0) {
      this._executeFromQueue(backgroundQueue, backgroundRunTime);
    }
    return normalQueue.length > 0 || backgroundQueue.length > 0;
  }

  schedule(
    g: Generator,
    priority?: SchedulerPriority,
    name?: string
  ): CancellablePromise<void> {
    const [coroutine, promise] = Coroutine.pack(++this._coroutineId, g, name);
    if (priority === undefined) {
      priority = SchedulerPriority.Normal;
    }
    const queue = this._scheduledCoroutines[priority];
    queue.push(coroutine);
    queue.sort(compareCoroutines);
    this._timer.schedule();
    return promise;
  }

  map<T>(
    iter: Iterable<T>,
    mapper: (v: T) => void,
    priority = SchedulerPriority.Normal,
    name?: string
  ): Promise<void> {
    return this.schedule(mapGenerator(iter, mapper), priority, name);
  }
}

const kSharedScheduler = new CoroutineScheduler();

function* mapGenerator<T>(
  iter: Iterable<T>,
  mapper: (v: T) => void
): Generator<void> {
  for (const v of iter) {
    mapper(v);
    yield;
  }
}

export class CoroutineQueue implements Scheduler {
  private readonly _queue: Coroutine[];
  private _id: number;

  constructor(
    readonly scheduler: CoroutineScheduler,
    readonly priority: SchedulerPriority = SchedulerPriority.Normal
  ) {
    this._queue = [];
    this._id = 0;
  }

  get size(): number {
    return this._queue.length;
  }

  schedule(
    g: Generator,
    _priority?: SchedulerPriority,
    name?: string
  ): CancellablePromise<void> {
    const [coroutine, promise] = Coroutine.pack(++this._id, g, name);
    this._queue.push(coroutine);
    if (this._queue.length === 1) {
      this.scheduler.schedule(this._workCoroutine(), this.priority);
    }
    return promise;
  }

  private *_workCoroutine(): Generator<void> {
    for (
      let coroutine = this._queue.pop();
      coroutine !== undefined;
      coroutine = this._queue.pop()
    ) {
      while (!coroutine.isDone) {
        coroutine.run();
        yield;
      }
    }
  }
}

const kTimestampReadingThrottle = 3;
let gTimestampCounter = 0;
let gPrevTimestamp = 0;

/**
 * It turns out that we're calling performance.now() a lot, which makes the
 * cost of the call relatively high compared to the time spent doing actual
 * work. To avoid this, we sample the clock once every K calls, and return the
 * cached value otherwise.
 *
 * @returns A timestamp relative to the previous call.
 */
function getRelativeTimestamp(): number {
  if (gTimestampCounter === 0) {
    gPrevTimestamp = performance.now();
  }
  gTimestampCounter = (gTimestampCounter + 1) % kTimestampReadingThrottle;
  return gPrevTimestamp;
}
