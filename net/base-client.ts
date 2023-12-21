import EventEmitter from 'eventemitter3';
import { EaseInOutSineTimer } from '../base/timer.ts';
import { BloomFilter } from '../base/bloom.ts';
import { SyncMessage, SyncValueType } from './message.ts';
import { retry } from '../base/time.ts';
import { log } from '../logging/log.ts';
import {
  JSONCyclicalDecoder,
  JSONCyclicalEncoder,
} from '../base/core-types/encoding/json.ts';
import { MovingAverage } from '../base/math.ts';
import { getOvvioConfig } from '../server/config.ts';
import { VersionNumber } from '../base/version-number.ts';
import {
  SyncConfig,
  syncConfigGetCycles,
  SyncScheduler,
} from './sync-scheduler.ts';
import { RepositoryType } from '../repo/repo.ts';
import { Commit } from '../repo/commit.ts';

export type ClientStatus = 'idle' | 'sync' | 'offline';

export const EVENT_STATUS_CHANGED = 'status_changed';
export const EVENT_PROTOCOL_VERSION_CHANGED = 'protocol_version_changed';

export interface BaseClientStorage {
  close(): void;
}

/**
 * A base class for sync channel clients. This class takes care of everything
 * but interacting with the values themselves. It takes care of adaptive timing,
 * network errors, and other book keeping.
 *
 * Storage and encoding of values are left for concrete subclasses.
 */
export abstract class BaseClient<
  ValueType extends SyncValueType,
> extends EventEmitter {
  private readonly _timer: EaseInOutSineTimer;
  private readonly _syncFreqAvg: MovingAverage;
  private _previousServerFilter: BloomFilter | undefined;
  private _previousServerSize: number;
  private _connectionOnline = true;
  private _serverVersionNumber: VersionNumber | undefined;
  private _ready: boolean;
  private _scheduled: boolean;
  private _closed = false;
  private _pendingSyncPromise: Promise<void> | undefined;

  constructor(
    readonly storage: RepositoryType,
    readonly id: string,
    readonly syncConfig: SyncConfig,
    readonly scheduler: SyncScheduler,
  ) {
    super();
    this._timer = new EaseInOutSineTimer(
      syncConfig.minSyncFreqMs,
      syncConfig.maxSyncFreqMs,
      syncConfig.maxSyncFreqMs * 3,
      () => {
        this.sendSyncMessage().catch((e) => {
          log({
            severity: 'INFO',
            error: 'UnknownSyncError',
            message: e.message,
            trace: e.stack,
          });
        });
      },
      true,
      'Sync timer',
    );
    this._syncFreqAvg = new MovingAverage(
      syncConfigGetCycles(this.syncConfig) * 2,
    );
    this._previousServerSize = 0;
    this._ready = false;
    this._scheduled = false;
  }

  get serverUrl(): string {
    return this.serverUrl;
  }

  get isOnline(): boolean {
    return this._connectionOnline;
  }

  get status(): ClientStatus {
    if (!this.isOnline) {
      return 'offline';
    }
    return this.needsReplication() ? 'sync' : 'idle';
  }

  get previousServerFilter(): BloomFilter | undefined {
    return this._previousServerFilter;
  }

  get previousServerSize(): number {
    return this._previousServerSize;
  }

  get syncCycles(): number {
    return syncConfigGetCycles(this.syncConfig, this._syncFreqAvg.currentValue);
  }

  get serverVersion(): VersionNumber {
    return this._serverVersionNumber || getOvvioConfig().version;
  }

  private set serverVersion(v: VersionNumber) {
    if (this._serverVersionNumber !== v) {
      this._serverVersionNumber = v;
      this.emit(EVENT_PROTOCOL_VERSION_CHANGED);
    }
  }

  get ready(): boolean {
    return this._ready && !this.closed;
  }

  protected set ready(f: boolean) {
    if (f !== this._ready) {
      this._ready = f;
      if (this._scheduled) {
        if (f) {
          this._timer.schedule();
        } else {
          this.stopSyncing();
        }
      }
    }
  }

  get closed(): boolean {
    return this._closed;
  }

  protected abstract buildSyncMessage(): Promise<SyncMessage<ValueType>>;
  protected abstract persistPeerValues(values: ValueType[]): Promise<number>;
  protected abstract getLocalSize(): number;
  abstract localIds(): Iterable<string>;

  private _setIsOnline(value: boolean): void {
    if (value !== this._connectionOnline) {
      this._connectionOnline = value;
      this.emit(EVENT_STATUS_CHANGED);
    }
  }

  startSyncing(): typeof this {
    if (!this._scheduled) {
      this._scheduled = true;
      if (this.ready) {
        this._timer.schedule();
      }
    }
    return this;
  }

  stopSyncing(): typeof this {
    this._timer.unschedule();
    this._timer.reset();
    this._scheduled = false;
    return this;
  }

  private sendSyncMessage(): Promise<void> {
    let result = this._pendingSyncPromise;
    if (!result) {
      const promise = this._sendSyncMessageImpl().finally(() => {
        if (this._pendingSyncPromise === promise) {
          this._pendingSyncPromise = undefined;
        }
      });
      result = promise;
      this._pendingSyncPromise = result;
    }
    return result;
  }

  private async _sendSyncMessageImpl(): Promise<void> {
    if (this.closed) {
      return;
    }
    const startingStatus = this.status;
    const reqMsg = await this.buildSyncMessage();

    let syncResp: SyncMessage<ValueType>;
    try {
      syncResp = await this.scheduler.send(
        this.storage,
        this.id,
        reqMsg,
      ) as typeof reqMsg;
    } catch (e) {
      log({
        severity: 'INFO',
        error: 'SerializeError',
        value: e.message,
        message: e.message,
        trace: e.stack,
      });
      this._setIsOnline(false);
      return;
    }

    this._previousServerFilter = syncResp.filter;
    this._previousServerSize = syncResp.size;
    const config = getOvvioConfig();

    if (syncResp.buildVersion !== config.version) {
      // TODO: Save uncommitted changes
      if (config.debug) {
        location.reload();
      } else {
        this._setIsOnline(false);
      }
      //
    }

    let persistedCount = 0;
    if (syncResp.values.length) {
      const start = performance.now();
      persistedCount = await this.persistPeerValues(syncResp.values);
      log({
        severity: 'METRIC',
        name: 'CommitsPersistTime',
        value: performance.now() - start,
        unit: 'Milliseconds',
      });
      log({
        severity: 'METRIC',
        name: 'CommitsPersistCount',
        value: persistedCount,
        unit: 'Count',
      });
    }
    if (this.closed) {
      return;
    }

    if (persistedCount > 0 || this.needsReplication()) {
      this.touch();
    }
    this._setIsOnline(true);
    if (this.status !== startingStatus) {
      this.emit(EVENT_STATUS_CHANGED);
    }
  }

  /**
   * Returns a promise that completes when both peers have reached consensus.
   * This method is probabilistic and fakes the appearance of a steady state
   * between this client and the server. It's intended to be used in back-office
   * and diagnostics tools, and not in app-to-server or server-to-server
   * communication (which rely on indefinite polling loop).
   */
  async sync(): Promise<void> {
    const syncConfig = this.syncConfig;
    const cycleCount = syncConfigGetCycles(syncConfig) + 1;
    // We need to do a minimum number of successful sync cycles in order to make
    // sure everything is sync'ed. Also need to make sure we don't have any
    // local commits that our peer doesn't have (local changes or peer recovery).
    let i = 0;
    do {
      await this.sendSyncMessage();
      ++i;
    } while (!this.closed && i < cycleCount);
  }

  needsReplication(): boolean {
    const serverFilter = this._previousServerFilter;
    if (!serverFilter || this._previousServerSize !== this.getLocalSize()) {
      return true;
    }
    for (const id of this.localIds()) {
      if (!serverFilter.has(id)) {
        return true;
      }
    }
    return false;
  }

  touch(): void {
    // this._timer.unschedule();
    // this.sendSyncMessage();
    this._timer.reset();
    this._timer.schedule();
  }

  close() {
    this.stopSyncing();
    this._closed = true;
    this._setIsOnline(false);
  }
}
