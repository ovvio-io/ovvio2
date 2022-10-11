import { CoreValue } from '../../../core-types';
import { ICursor } from '../types';

export abstract class BaseCursor<V extends CoreValue> implements ICursor<V> {
  protected hasInitialized = false;

  abstract get isAsc(): boolean;

  /**
   * returns true if cursor is done with all vertices.
   * can use reset() method to start over.
   */
  abstract get isDone(): boolean;

  /**
   * the current item.
   * returns undefined if the cursor is done.
   */
  abstract get item(): [CoreValue, V] | undefined;

  /**
   * the current value.
   * returns undefined if the cursor is done.
   */
  abstract get value(): V | undefined;

  /**
   * moves to the next vertex. updating the "item" and "value" property
   */
  abstract move(): void;

  /**
   * Resetting the cursor, from the beginning.
   */
  reset() {
    this.hasInitialized = false;
  }

  /**
   * checks if the vertex is apart of the cursor
   */

  abstract contains(value: V): boolean;

  /**
   * returns the "current" vertex and moves to the next one.
   * can be used in a while like this:
   * while(!cursor.isDone) {
   *     cursor.read();
   * }
   */
  read(): V | undefined {
    const current = this.internalRead();
    return current?.[1];
  }

  /**
   * returns a generator of items. moving the cursor "num" forward.
   */
  *readMany(num: number): Generator<V> {
    this.ensureInit();
    if (num <= 0) num = 1;

    let counter = 0;
    while (!this.isDone && counter < num) {
      const i = this.read();
      if (i === undefined) break;
      yield i;
      counter++;
    }
  }

  /**
   * returns a generator all items left in the cursor. returns when "isDone" flag is set to true.
   */
  *readAll(): Generator<V> {
    this.ensureInit();

    while (!this.isDone) {
      const i = this.read();
      if (i === undefined) break;
      yield i;
    }
  }
  *readAllByGroup(
    gFunc: (a: [CoreValue, V], b: [CoreValue, V]) => boolean,
    fFunc?: (group: V[]) => boolean
  ): Generator<V[]> {
    this.ensureInit();

    let last: [CoreValue, V] | undefined;
    let group: V[] | undefined;

    while (!this.isDone) {
      const i = this.internalRead();
      if (i === undefined) {
        break;
      }
      if (group && last && gFunc(last, i)) {
        //Add to group
        group.push(i[1]);
      } else {
        //New Group
        if (group && group.length > 0) {
          if (!fFunc || fFunc(group)) yield group;
        }
        group = [i[1]];
        last = i;
      }
    }

    if (group && group.length > 0) {
      if (!fFunc || fFunc(group)) yield group;
    }
  }

  readAllToArray(): V[] {
    return Array.from(this.readAll());
  }

  protected ensureInit() {
    if (!this.hasInitialized) {
      this.init();
      this.hasInitialized = true;
    }
  }

  /**
   * Internal Cursor method initialize method.
   * Should be called before any other public property or method.
   */
  protected abstract init(): void;

  private internalRead() {
    this.ensureInit();
    if (this.isDone) {
      return;
    }

    const current = this.item;
    this.move();

    return current;
  }
}
