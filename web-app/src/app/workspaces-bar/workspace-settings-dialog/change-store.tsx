import React, { useContext, useMemo, useState, useEffect } from 'react';

const storeContext = React.createContext<ChangeRecordStore | undefined>(
  undefined
);

export class ChangeRecord {
  private _data: any;
  private _isDirty: boolean;
  private _store: ChangeRecordStore;
  private _listeners: ((record: ChangeRecord) => void)[];

  constructor(store: ChangeRecordStore) {
    this._data = {};
    this._isDirty = false;
    this._store = store;
    this._listeners = [];
  }

  listen(onChange: (record: ChangeRecord) => void) {
    this._listeners.push(onChange);
    return () => {
      this._listeners.splice(this._listeners.indexOf(onChange));
    };
  }

  get isDirty() {
    return this._isDirty;
  }

  set isDirty(value: boolean) {
    if (value !== this._isDirty) {
      this._isDirty = value;
      this._store.notifyRecordChanged(this);
    }
  }

  get(key: string) {
    return this._data[key];
  }

  set(key: string, value: any) {
    this._data[key] = value;
    this.isDirty = true;
    this._listeners.forEach((fn) => fn(this));
  }

  clear(key: string) {
    delete this._data[key];
    if (!Object.keys(this._data).length) {
      this.isDirty = false;
    }
    this._listeners.forEach((fn) => fn(this));
  }

  clearAll() {
    this._data = {};
    this._listeners.forEach((fn) => fn(this));
  }
}

interface RecItem {
  key: string;
  record: ChangeRecord;
  onCommit: (cRec: ChangeRecord) => void;
}

class ChangeRecordStore {
  private _records: RecItem[];
  private _listeners: ((
    store: ChangeRecordStore,
    record: ChangeRecord
  ) => void)[];
  constructor() {
    this._records = [];
    this._listeners = [];
  }

  listen(onChange: (store: ChangeRecordStore, record: ChangeRecord) => void) {
    this._listeners.push(onChange);
    return () => {
      this._listeners.splice(this._listeners.indexOf(onChange));
    };
  }

  notifyRecordChanged(record: ChangeRecord) {
    this._listeners.forEach((fn) => fn(this, record));
  }

  getRecordForKey(key: string, onCommit: (cRec: ChangeRecord) => void) {
    let item = this._records.find((r) => r.key === key);
    if (!item) {
      item = {
        key,
        record: new ChangeRecord(this),
        onCommit,
      };
      this._records.push(item);
    }

    item.onCommit = onCommit;
    return item.record;
  }

  hasChanges() {
    for (const item of this._records) {
      if (item.record.isDirty) {
        return true;
      }
    }
    return false;
  }

  commitChanges() {
    for (const item of this._records) {
      if (item.record.isDirty) {
        item.onCommit(item.record);
      }
    }
  }

  clear() {
    for (const item of this._records) {
      item.record.clearAll();
    }
  }
}

export function useChangeRecord(
  key: string,
  onCommit: (cRec: ChangeRecord) => void
) {
  const ctx = useContext(storeContext);
  const [, setChange] = useState(0);
  const record = ctx?.getRecordForKey(key, onCommit);
  useEffect(() => {
    if (record) {
      return record.listen(() => setChange((x) => x + 1));
    }
  }, [record]);
  return record;
}

export function useRecordStore() {
  return useContext(storeContext);
}

export type ChangeStoreProviderProps = React.PropsWithChildren<
  Record<string | number | symbol, never>
>;
export function ChangeStoreProvider({ children }: ChangeStoreProviderProps) {
  const context = useMemo(() => new ChangeRecordStore(), []);
  return (
    <storeContext.Provider value={context}>{children}</storeContext.Provider>
  );
}
