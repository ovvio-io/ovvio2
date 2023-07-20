import StorageBuffer from '@ovvio/user-event/lib/buffer/storageBuffer';
import { Buffer, Event } from '@ovvio/user-event/lib/types';
import * as IDB from 'idb';
import { BaseIndexedDB } from './base';

const DB_NAME_PREFIX = 'user_events_';
const STORE_NAME = 'user_events';

export interface DBScheme extends IDB.DBSchema {
  [STORE_NAME]: {
    value: Event;
    key: string;
  };
}

const DB_VERSION = 1;

export class IndexedDBBuffer extends BaseIndexedDB<DBScheme> implements Buffer {
  private _proxSize?: number;

  constructor(userId: string) {
    super({
      name: `${DB_NAME_PREFIX}${userId}`,
      version: DB_VERSION,
      store: STORE_NAME,
      deleteOnUpgrade: false,
    });
  }

  get size(): number {
    return this._proxSize || 0;
  }
  get isPersistent(): boolean {
    return true;
  }

  async setEvents<T extends Event>(events: T[]): Promise<T[]> {
    const res = await this.runTransaction(async store => {
      await Promise.all(events.map(e => store.put(e, e.id)));
    });

    if (res) {
      if (this._proxSize === undefined) {
        this._proxSize = await this.getCount();
      } else {
        this._proxSize += events.length;
      }

      return;
    } else {
      return events;
    }
  }

  async getEvents<T extends Event>(count: number): Promise<T[]> {
    const res = await this.getAll(count);
    return res;
  }

  async removeEvents(eventIds: string[]): Promise<void> {
    const res = await this.runTransaction(async store => {
      await Promise.all(eventIds.map(id => store.delete(id)));
    });
    if (res) {
      if (this._proxSize === undefined) {
        this._proxSize = await this.getCount();
      } else {
        this._proxSize -= eventIds.length;
        if (this._proxSize < 0) this._proxSize = 0;
      }
    }
  }

  protected onDBUpgrade(db: IDB.IDBPDatabase<DBScheme>) {
    if (db.version === 1) {
      try {
        //Cleanup old stuck events
        const storageBuffer = new StorageBuffer(
          window.localStorage,
          `user_events_` //All Users
        );

        storageBuffer.removeAll();
      } catch {}
    }
  }
}
