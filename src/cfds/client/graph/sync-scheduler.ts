import { OrderedMap } from '../../collections/orderedmap';
import {
  CoroutineScheduler,
  CoroutineTimer,
  SchedulerPriority,
} from '../coroutine';
import { SimpleTimer } from '../timer';
import { VertexManager } from './vertex-manager';

const K_PRIORITY_LAST_MOD_CUTOFF_MS = 1000 * 60 * 60 * 24 * 7; // 1 Week

export class SyncScheduler {
  private readonly _pendingManagers: OrderedMap<VertexManager>;
  private readonly _workTask: CoroutineTimer;

  constructor() {
    this._pendingManagers = new OrderedMap();
    this._workTask = new CoroutineTimer(
      CoroutineScheduler.sharedScheduler(),
      () => this._runNextSync(),
      SchedulerPriority.Background,
      'SyncScheduler'
    );
  }

  sync(mgr: VertexManager): void {
    // Some edge cases will lead to sync being called before our manager had a
    // chance to finish cache loading. To work around it we wait a bit before
    // trying to sync again.
    if (!mgr.cacheLoaded) {
      SimpleTimer.once(50, () => this.sync(mgr));
      return;
    }
    if (isPriorityManager(mgr)) {
      mgr._sync();
      return;
    }
    this._pendingManagers.add(mgr);
    this._workTask.schedule();
  }

  private _runNextSync(): boolean {
    const mgr = this._pendingManagers.startKey;
    if (mgr === undefined) {
      return false;
    }
    this._pendingManagers.delete(mgr);
    if (mgr.syncActive) {
      this._pendingManagers.add(mgr);
    } else {
      mgr._sync();
    }
    return this._pendingManagers.size > 0;
  }
}

export const kSharedSyncScheduler = new SyncScheduler();

function isPriorityManager(mgr: VertexManager): boolean {
  if (mgr.isRoot || mgr.isLoading || mgr.hasPendingChanges) {
    return true;
  }
  if (mgr.isDeleted || mgr.errorCode !== undefined) {
    return false;
  }
  const vert = mgr.getVertexProxy();
  const lastModified = vert.lastModified;
  return (
    lastModified === undefined ||
    Date.now() - lastModified.getTime() < K_PRIORITY_LAST_MOD_CUTOFF_MS
  );
}
