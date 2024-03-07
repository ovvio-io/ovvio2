import { SimpleTimer, Timer } from '../base/timer.ts';

export class HealthChecker {
  private readonly _timeoutIntervalMs: number;
  private _checkTimer: Timer;
  private _timeoutTimer: Timer | undefined;
  private _abortController: AbortController | undefined;
  private _failureCount = 0;

  constructor(
    readonly url: string,
    checkFreqMs: number,
    readonly failureCallback: () => void,
    readonly failureThreshold: number = 0,
  ) {
    this._checkTimer = new SimpleTimer(
      checkFreqMs,
      true,
      () => this.doCheck(),
      `HealthChecker:${url}`,
    );
    this._timeoutIntervalMs = checkFreqMs * 0.9;
    this.start();
  }

  start(): void {
    this._checkTimer.schedule();
  }

  stop(): void {
    this._checkTimer.unschedule();
    this._timeoutTimer?.unschedule();
    this._timeoutTimer = undefined;
    this._abortController = undefined;
  }

  private async doCheck(): Promise<void> {
    if (this._abortController) {
      console.log(`Health check aborting prev check`);
      this._abortController.abort();
      this.onFailedCheck();
    }
    this._timeoutTimer?.unschedule();
    this._abortController = new AbortController();
    this._timeoutTimer = new SimpleTimer(
      this._timeoutIntervalMs,
      false,
      () => this.onTimeoutReached(),
      `HealthCheckerTimeout:${this.url}`,
    ).schedule();
    try {
      const result = await fetch(this.url, {
        signal: this._abortController.signal,
      });
      if (result.status !== 200) {
        console.log(
          `Health check status = ${
            result.status
          }, resp = ${await result.text()}`,
        );
        this.onFailedCheck();
      } else {
        console.log(`Health check success resp = ${await result.text()}`);
      }
    } catch (_err: unknown) {
      console.log(`Health check error: ${_err}`);
      this.onFailedCheck();
    } finally {
      this._timeoutTimer.unschedule();
      this._timeoutTimer = undefined;
      this._abortController = undefined;
    }
  }

  private onTimeoutReached(): void {
    this._abortController?.abort();
  }

  private onFailedCheck(): void {
    console.log(`Health check failed #${this._failureCount + 1}`);
    debugger;
    if (++this._failureCount >= this.failureThreshold) {
      this._failureCount = 0;
      this.failureCallback();
    }
  }
}
