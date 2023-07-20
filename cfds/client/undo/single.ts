import { assert } from '../../../base/error.ts';
import { clone, concatChanges, diff, patch } from '../../base/object.ts';
import * as TypeUtils from '../../base/types/utils.ts';
import { Scheme } from '../../base/scheme.ts';
import { CoreObject, coreValueEquals } from '../../../base/core-types/index.ts';
import { EqualOptions } from '../../../base/core-types/equals.ts';
import { VertexSnapshot } from '../graph/vertex-manager.ts';

enum UndoType {
  Local = 'l',
  Remote = 'r',
}

interface LocalUndo {
  type: UndoType.Local;
  snapshot: VertexSnapshot;
  /**
   * Group is to mark several undo's from several single-managers together.
   * This puts all the undo's in a the same group.
   * Also you can group several snapshots together on the same single-manger.
   * Undo/Redo together.
   */
  group: number;
}

interface RemoteUndo {
  type: UndoType.Remote;
  snapshot: VertexSnapshot;
}
type UndoItem = LocalUndo | RemoteUndo;

interface RedoItem {
  snapshot: VertexSnapshot;
  group: number;
  base: VertexSnapshot;
}

export interface SingleUndoManagerOptions {
  limit?: number;
  equalsOptions?: EqualOptions;
  initialSnapshot?: VertexSnapshot;
  /**
   * Limiting the fields for a snapshot. e.g: the undo on a Note title or body.
   */
  snapshotFields?: string[];
}

const DEFAULT_LIMIT = 100;

/**
 * Represents an object that you can do an undo to.
 * The Vertex-Manager implements this interface.
 * The abstraction helps with testing
 */
export interface UndoObject {
  readonly scheme: Scheme;
  getSnapshot(onlyFields?: string[]): VertexSnapshot;
  updateBySnapshot(snapshot: VertexSnapshot): void;
}

/**
 * Single undo object manager.
 * For every Vertex-Manager there will be a SingleUndoManager
 */
export class SingleUndoManager {
  private _latestSnapshot: VertexSnapshot;

  private _undoList: UndoItem[];
  private _redoList: RedoItem[];
  private _object: UndoObject;
  private _limit: number;
  private _equalsOptions?: EqualOptions;
  private _snapshotFields?: string[];

  constructor(obj: UndoObject, options?: SingleUndoManagerOptions) {
    this._object = obj;
    options = options || {};
    this._snapshotFields = options.snapshotFields;
    this._latestSnapshot =
      options.initialSnapshot || obj.getSnapshot(this._snapshotFields);
    this._undoList = [
      {
        type: UndoType.Local,
        snapshot: this._latestSnapshot,
        group: 0,
      },
    ];
    this._redoList = [];

    this._limit =
      (options.limit !== undefined && options.limit > 0
        ? options.limit
        : DEFAULT_LIMIT) + 1;
    this._equalsOptions = options.equalsOptions;
  }

  get lastLocalUndo(): LocalUndo {
    const last = this.lastUndo;
    if (last.type === UndoType.Local) {
      return last;
    }

    const prevLast = this._undoList[this._undoList.length - 2];
    assert(prevLast.type === UndoType.Local);

    return prevLast as LocalUndo;
  }

  get lastRedo(): RedoItem | undefined {
    if (this._redoList.length === 0) return undefined;
    return this._redoList[this._redoList.length - 1];
  }

  private get lastUndo(): UndoItem {
    return this._undoList[this._undoList.length - 1];
  }

  private get scheme() {
    return this._object.scheme;
  }

  /**
   * Method is called after a local change has happened
   * @param group
   * @returns true if a new undo is added to the list
   */
  changedLocally(group: number) {
    assert(group > 0, 'group must be larger than 0');

    const snapshot = this._object.getSnapshot(this._snapshotFields);

    if (snapshotEquals(this._latestSnapshot, snapshot, this._equalsOptions)) {
      //Nothing changed from latest snapshot.
      //We will update the last local undo
      //But won't create a new undo

      const lastLocal = this.lastLocalUndo;
      lastLocal.snapshot = snapshot;
      this._latestSnapshot = lastLocal.snapshot;

      return false;
    }

    this.addToUndoList(snapshot, true, group, true);
    this._latestSnapshot = snapshot;
    return true;
  }

  /**
   * Method is called after a remote change has happened
   */
  changedRemotely() {
    const snapshot = this._object.getSnapshot(this._snapshotFields);
    this.addToUndoList(snapshot, false, undefined, true);
    this._latestSnapshot = snapshot;
  }

  private addToUndoList(
    snapshot: VertexSnapshot,
    local: boolean,
    group: number | undefined,
    resetRedoList: boolean
  ) {
    const last = this.lastUndo;

    if (local) {
      assert(group !== undefined);
      group = group!;
      if (last.type === UndoType.Local && last.group === group) {
        //Undo with the same group
        //Override last snapshot
        last.snapshot = snapshot;
      } else {
        //Adding new local change
        this._undoList.push({
          type: UndoType.Local,
          snapshot,
          group,
        });

        this.ensureUndoSpace();
      }

      //resets the redo list
      if (resetRedoList) this._redoList = [];
    } else {
      //Remote change
      if (last.type === UndoType.Remote) {
        //Override last item because keeping only one remote change between local
        last.snapshot = snapshot;
      } else {
        //Add new remote change
        this._undoList.push({
          type: UndoType.Remote,
          snapshot,
        });

        this.ensureUndoSpace();
      }
    }
  }

  /**
   *
   * @returns true if a undo has occurred
   */
  undo(): boolean {
    const lastGroup = this.lastLocalUndo.group;
    if (lastGroup === 0) {
      //Initial state. nothing to undo
      return false;
    }

    const snapList: VertexSnapshot[] = [];

    this.internalUndo(lastGroup, snapList);

    const last = snapList[snapList.length - 1];
    if (last) {
      this.updateSnapshot(last);
      return true;
    }

    return false;
  }

  private updateSnapshot(newSnap: VertexSnapshot) {
    this._latestSnapshot = newSnap;
    this._object.updateBySnapshot(newSnap);
  }

  private internalUndo(group: number, snapList: VertexSnapshot[]): void {
    const last = this.lastUndo;

    if (last.type === UndoType.Local) {
      if (last.group === 0) {
        //Initial state. nothing to undo
        return;
      }
      /**
       * Local undo:
       * 1. Remove from undo list
       * 2. Add to redo list
       * 3. update state with prev
       */
      this._undoList.splice(this._undoList.length - 1, 1);
      const prevSnapshot = this.lastUndo.snapshot;
      this._redoList.push({
        snapshot: last.snapshot,
        group: last.group,
        base: prevSnapshot,
      });
      snapList.push(prevSnapshot);
      return;
    } else {
      /**
       * Remote Undo:
       */

      //1. get prev1 item. must be local
      const prev1 = this._undoList[this._undoList.length - 2];

      if (prev1.type === UndoType.Remote) {
        throw new Error('remote undo, previous snapshot must be a local one');
      }

      if (prev1.group === 0) {
        //1.1 prev is initial state. nothing to undo
        return;
      }

      //2. get prev2 item. must exist
      const prev2 = this._undoList[this._undoList.length - 3];
      assert(prev2 !== undefined);

      //3. 3 way merge: prev1 is base, prev2 and last are branches
      const mergedSnapshot = this.threeWayMerge(
        prev1.snapshot,
        prev2.snapshot,
        last.snapshot
      );
      if (snapshotEquals(mergedSnapshot, last.snapshot, this._equalsOptions)) {
        //3.1 stale undo: has not changed current data
        this._undoList.splice(this._undoList.length - 2, 1);
        if (prev2.type === UndoType.Remote) {
          //Need to merge remotes
          prev2.snapshot = last.snapshot;
          this._undoList.splice(this._undoList.length - 1, 1);
        }

        if (this.lastLocalUndo.group === group || snapList.length === 0) {
          //3.2 rerun undo if:
          //last local is in the same group
          //or: dataList is empty, undo has not yet happened
          this.internalUndo(group, snapList);
          return;
        }

        //no need to rerun undo, return last result
        return;
      }

      //4. add "last" to redo list
      this._redoList.push({
        snapshot: last.snapshot,
        base: mergedSnapshot,
        group: prev1.group,
      });

      //5. remove "prev1" and "last" from undo list
      this._undoList.splice(this._undoList.length - 2, 2);

      //6. add "merged" to undo list
      this.addToUndoList(mergedSnapshot, false, undefined, false);

      //7. update record state with "merged" data
      snapList.push(mergedSnapshot);
    }

    if (this.lastLocalUndo.group === group) {
      //Found another local undo that is the same group as the first undo
      //Need to undo again
      return this.internalUndo(group, snapList);
    }
  }

  redo(): boolean {
    if (this._redoList.length === 0) return false;

    const snapList: VertexSnapshot[] = [];
    this.internalRedo(snapList);
    const last = snapList[snapList.length - 1];

    if (last) {
      this.updateSnapshot(last);
      return true;
    }

    return false;
  }

  private internalRedo(snapList: VertexSnapshot[]): void {
    const lastRedo = this._redoList[this._redoList.length - 1];
    const lastGroup = lastRedo.group;

    const lastUndo = this.lastUndo;

    if (lastUndo.type === UndoType.Local) {
      /**
       * Simple Redo:
       * 1. Add last redo data back to undo list
       * 2. Update State with redo data
       * 3. Remove last redo from list
       */

      this.addToUndoList(lastRedo.snapshot, true, lastRedo.group, false);

      snapList.push(lastRedo.snapshot);

      this._redoList.splice(this._redoList.length - 1, 1);
    } else {
      /**
       * Complex Redo
       */
      const newRedoSnap = this.threeWayMerge(
        lastRedo.base,
        lastRedo.snapshot,
        lastUndo.snapshot
      );
      if (snapshotEquals(newRedoSnap, lastUndo.snapshot, this._equalsOptions)) {
        /**
         * Stale Redo.
         * Remove last redo
         * restart redo process
         */
        this._redoList.splice(this._redoList.length - 1, 1);
        this.internalRedo(snapList);
        return;
      }

      this.addToUndoList(newRedoSnap, true, lastRedo.group, false);

      snapList.push(newRedoSnap);

      this._redoList.splice(this._redoList.length - 1, 1);
    }

    const lastAfter = this._redoList[this._redoList.length - 1];
    if (lastAfter && lastAfter.group === lastGroup) {
      //Found another redo that is the same group as this redo
      //Need to redo again
      this.internalRedo(snapList);
    }

    return;
  }

  private threeWayMerge(
    base: VertexSnapshot,
    snap1: VertexSnapshot,
    snap2: VertexSnapshot
  ): VertexSnapshot {
    //Scheme data first
    const baseClone = clone(this.scheme.fields, base.data);

    const changes1 = diff(this.scheme.fields, baseClone, snap1.data);
    const changes2 = diff(this.scheme.fields, baseClone, snap2.data);
    const changes = concatChanges(changes1, changes2);

    const newData = patch(this.scheme.fields, baseClone, changes);

    //Local Data
    const localFields = new Set<string>();
    for (const key of Object.keys(base.local)) {
      localFields.add(key);
    }
    for (const key of Object.keys(snap1.local)) {
      localFields.add(key);
    }
    for (const key of Object.keys(snap2.local)) {
      localFields.add(key);
    }

    const newLocal: CoreObject = {};
    for (const field of localFields) {
      const changes1 = TypeUtils.diff(base.local[field], snap1.local[field]);
      const changes2 = TypeUtils.diff(base.local[field], snap2.local[field]);
      const changes = TypeUtils.concatChanges(changes1, changes2);

      newLocal[field] = TypeUtils.patch(base.local[field], changes);
    }

    return {
      data: newData,
      local: newLocal,
    };
  }

  private ensureUndoSpace() {
    if (this._undoList.length <= this._limit) return;

    //Over limit, move up first;
    let index = this._undoList.length - this._limit;
    if (this._undoList[index].type !== UndoType.Local) {
      index++; //This index is not local, so next index will be local
    }

    const item = ensureLocalItem(this._undoList[index]);

    //Delete all of undo list before the index;
    this._undoList.splice(0, index);

    //Make item to be the new first item;
    item.group = 0;
  }
}

function ensureLocalItem(item: UndoItem): LocalUndo {
  assert(item.type === UndoType.Local);
  return item as LocalUndo;
}

function snapshotEquals(
  snap1: VertexSnapshot,
  snap2: VertexSnapshot,
  options?: EqualOptions
) {
  if (!coreValueEquals(snap1.local, snap2.local, options)) {
    return false;
  }

  if (!coreValueEquals(snap1.data, snap2.data, options)) {
    return false;
  }

  return true;
}
