import { ReadonlyJSONObject } from '../base/interfaces.ts';
import { SimpleTimer } from '../base/timer.ts';
import { VersionNumber } from '../defs.ts';
import { log } from '../logging/log.ts';

export interface VersionInfo extends ReadonlyJSONObject {
  version: VersionNumber;
}

export const VersionInfo3_0_0: VersionInfo = {
  version: VersionNumber.V3_0_0,
};

export const VersionInfoCurrent = VersionInfo3_0_0;

export class VersionUpdateWatcher {
  private readonly _serverUrl: string;
  private readonly _handler: (info: VersionInfo) => void;
  private readonly _timer: SimpleTimer;
  private _checkPromise: Promise<void> | undefined;

  constructor(serverUrl: string, handler: (info: VersionInfo) => void) {
    this._serverUrl = serverUrl;
    this._handler = handler;
    this._timer = new SimpleTimer(5 * 60 * 1000, true, () => {
      if (this._checkPromise) {
        return;
      }
      this._checkPromise = this.checkForNewVersion().finally(() => {
        this._checkPromise = undefined;
      });
    });
    this._timer.schedule();
  }

  private async checkForNewVersion(): Promise<void> {
    try {
      const resp = await fetch(this._serverUrl);
      const info: VersionInfo = await resp.json();
      if (info.version !== VersionNumber.Current) {
        this._handler(info);
      }
    } catch (e) {
      log({
        severity: 'INFO',
        error: 'FetchError',
        trace: e.stack,
        message: e.message,
      });
    }
  }
}
