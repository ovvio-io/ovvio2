import { Record } from '../base/record';
import { ACIDStore, IACIDTransaction } from './stores/acid-store';
import {
  indexAllPrefix,
  indexOf,
  indexPrefix,
  parseIndexValue,
} from './path-utils';
import { InviteStatus, NS_INVITES, NS_USERS } from '../base/scheme-types';
import { Utils } from '@ovvio/base';

export enum RecordIndexName {
  PendingEmailInvite = 'pending-email-invite',
  UserEmail = 'user-email',
}

interface RecordIndexOptions {
  name: string;
  keyValueFunc: (key: string, record: Record) => [string[], string];
  filter?: (record: Record) => boolean;
  isCaseSensitive?: boolean;
}

export interface IndexValuesCallback {
  (value: string): void | boolean | Promise<void> | Promise<boolean>;
}

export class RecordIndex {
  private _name: string;
  private _keyValueFunc: (key: string, record: Record) => [string[], string];
  private _filter: (record: Record) => boolean;
  private _isCaseSensitive: boolean;

  constructor(options: RecordIndexOptions) {
    this._name = options.name;
    this._keyValueFunc = options.keyValueFunc;
    this._filter = options.filter || (r => true);
    this._isCaseSensitive =
      options.isCaseSensitive !== undefined ? options.isCaseSensitive : true;
  }

  get name() {
    return this._name;
  }

  update(
    transaction: IACIDTransaction,
    recordKey: string,
    recordBefore: Record | undefined,
    recordAfter: Record | undefined,
    forceUpdate = false
  ) {
    const promises: Promise<any>[] = [];
    const [toDelete, toInsert] = this.checkIfChanged(
      recordKey,
      recordBefore,
      recordAfter,
      forceUpdate
    );

    if (recordBefore && toDelete) {
      const indexPath = this.createPath(recordKey, recordBefore);
      if (indexPath) promises.push(transaction.delete(indexPath));
    }

    if (recordAfter && toInsert) {
      //Changed or New
      const indexPath = this.createPath(recordKey, recordAfter);
      if (indexPath)
        promises.push(
          transaction.update(indexPath, {
            setColumns: {},
            replaceRow: true,
            createRow: true,
          })
        );
    }

    return Promise.all(promises);
  }

  async getValue(
    store: ACIDStore,
    ...keys: string[]
  ): Promise<string | undefined> {
    if (!this._isCaseSensitive) {
      keys = keys.map(x => x.toLowerCase());
    }
    const path = indexPrefix(this._name, keys);

    let value: string | undefined;

    await store.scanPrefix(path, (pKey, _) => {
      value = parseIndexValue(pKey);
      return true;
    });

    return value;
  }

  async getValues(store: ACIDStore, ...keys: string[]): Promise<string[]> {
    if (!this._isCaseSensitive) {
      keys = keys.map(x => x.toLowerCase());
    }
    const path = indexPrefix(this._name, keys);

    const values: string[] = [];

    await store.scanPrefix(path, (pKey, _) => {
      values.push(parseIndexValue(pKey));
    });

    return values;
  }

  async getValuesCB(
    store: ACIDStore,
    keys: string[],
    cb: IndexValuesCallback
  ): Promise<void> {
    if (!this._isCaseSensitive) {
      keys = keys.map(x => x.toLowerCase());
    }
    const path = indexPrefix(this._name, keys);

    await store.scanPrefix(path, (pKey, _) => {
      return cb(parseIndexValue(pKey));
    });
  }

  async getAllValues(store: ACIDStore): Promise<string[]> {
    const path = indexAllPrefix(this._name);

    const values: string[] = [];

    await store.scanPrefix(path, (pKey, _) => {
      values.push(parseIndexValue(pKey));
    });

    return values;
  }

  async getAllValuesCB(
    store: ACIDStore,
    cb: IndexValuesCallback
  ): Promise<void> {
    const path = indexAllPrefix(this._name);

    await store.scanPrefix(path, (pKey, _) => {
      return cb(parseIndexValue(pKey));
    });
  }

  private checkIfChanged(
    recordKey: string,
    recordBefore: Record | undefined,
    recordAfter: Record | undefined,
    forceUpdate: boolean
  ): [boolean, boolean] {
    const passBefore = recordBefore !== undefined && this._filter(recordBefore);
    const passAfter = recordAfter !== undefined && this._filter(recordAfter);

    if (forceUpdate) return [passBefore, passAfter];

    if (!passBefore && !passAfter) {
      return [false, false]; //Didn't pass filter
    }

    if (!recordBefore) {
      if (passAfter) {
        return [false, true]; //New
      }
      return [false, false]; //Didn't pass filter
    }
    if (!recordAfter) {
      if (passBefore) {
        return [true, false]; //Deleted
      }
      return [false, false]; //Didn't pass filter
    }

    if (passBefore && !passAfter) {
      return [true, false]; //Same as deleted, but for index
    }
    if (!passBefore && passAfter) {
      return [false, true]; //Same as new, but for index
    }

    const [keyBefore, valueBefore] = this._keyValueFunc(
      recordKey,
      recordBefore
    );
    const [keyAfter, valueAfter] = this._keyValueFunc(recordKey, recordAfter);

    //return true when key or value has changed
    if (!Utils.Array.equal(keyBefore, keyAfter) || valueBefore !== valueAfter) {
      return [true, true]; //Key or Value changed.
    }

    return [false, false];
  }

  private createPath(recordKey: string, record: Record) {
    let [keys, value] = this._keyValueFunc(recordKey, record);
    if (keys === undefined || keys == null || keys.length === 0)
      return undefined;
    if (value === undefined || value == null) return undefined;
    if (!this._isCaseSensitive) {
      keys = keys.map(k => k.toLowerCase());
    }

    return indexOf(this._name, keys, value);
  }
}

/////////Register Indexes/////////

const indexMap = new Map<string, RecordIndex>();

function registerIndexes() {
  const indexes = [
    new RecordIndex({
      name: RecordIndexName.UserEmail,
      keyValueFunc: (key, record) => [[record.get('email') as string], key],
      filter: r => r.scheme.namespace === NS_USERS,
      isCaseSensitive: false,
    }),
    new RecordIndex({
      name: RecordIndexName.PendingEmailInvite,
      keyValueFunc: (key, record) => [
        [record.get('email') as string, record.get('workspace') as string],
        key,
      ],
      filter: r => {
        if (r.scheme.namespace !== NS_INVITES || r.get('isDeleted') === 1)
          return false;
        return r.get('status') === InviteStatus.PENDING;
      },
      isCaseSensitive: false,
    }),
  ];

  indexes.forEach(i => indexMap.set(i.name, i));
}

registerIndexes();

export function getIndex(name: string) {
  return indexMap.get(name);
}

export function updateIndexes(
  transaction: IACIDTransaction,
  recordKey: string,
  recordBefore: Record | undefined,
  recordAfter: Record | undefined,
  forceUpdate = false
) {
  const promises: Promise<any>[] = [];

  for (const index of indexMap.values()) {
    promises.push(
      index.update(
        transaction,
        recordKey,
        recordBefore,
        recordAfter,
        forceUpdate
      )
    );
  }

  return Promise.all(promises);
}
