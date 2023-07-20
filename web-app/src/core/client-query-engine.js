import {
  QueryEngine,
  DocumentStorageQueryEngine,
} from '@ovvio/cfds/base/query-engine';
// import { OP_ADD, OP_MOD } from '@ovvio/cfds/client/client';
import { debounce } from '@ovvio/base/lib/utils';

class QueryListener {
  constructor(cfdsClient, query, onChange) {
    this._cfdsClient = cfdsClient;
    this._query = query;
    this._queryKeys = new Set(query.fieldConditions.map(x => x.fieldname));
    this._unsub = () => { };
    this._onChange = onChange;
    this.debounced = debounce(this.onChange.bind(this));
  }

  onChange(local) {
    try {
      if (this._abortController && !this._abortController.signal.aborted) {
        this._abortController.abort();
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        throw e;
      }
    }
    this._abortController = new AbortController();
    this._onChange(this._abortController.signal, local);
  }

  listen() {
    this._unsub();
    this._unsub = this._cfdsClient.registerGlobalListener(
      (key, op, local, changedKeys) => {
        const collection = key.split('/')[0];
        if (collection !== this._query.collection) {
          return;
        }
        switch (op) {
          case 'OP_MOD':
            if (changedKeys && changedKeys.length) {
              if (!changedKeys.some(k => this._queryKeys.has(k))) {
                return;
              }
            }

            this.debounced(local);
            break;
          case 'OP_ADD':
            const doc = this._cfdsClient.getDocSync(key);
            if (this._query.matches(key, doc)) {
              this.debounced(local);
            }
            break;
          default:
            break;
        }
      }
    );
    this.onChange(false);
  }

  close() {
    this._unsub();
    if (this._abortController && !this._abortController.signal.aborted) {
      this._abortController.abort();
    }
  }
}

export default class ClientQueryEngine extends QueryEngine {
  constructor(cfdsClient) {
    super();
    this._cfdsClient = cfdsClient;
    this._queryEngine = new DocumentStorageQueryEngine(cfdsClient.docStorage);
  }

  async run(query, { signal, local } = {}) {
    if (!query.fieldConditions.some(x => x.fieldname === 'isDeleted')) {
      query = query.where('isDeleted').neq(1);
    }
    let unlocks = [];

    if (!local) {
      const { items } = await this._cfdsClient.networkAdapter.run(query, {
        signal,
      });
      if (signal.aborted) {
        return;
      }

      unlocks = await Promise.all(
        items.map(async x => {
          try {
            await this._cfdsClient.lock(x.key);
            return () => this._cfdsClient.unlock(x.key);
          } catch (e) {
            return () => { };
          }
        })
      );
      if (signal.aborted) {
        unlocks.forEach(fn => fn());
        return;
      }
    }

    const r = await this._queryEngine.run(query, {
      signal,
    });

    unlocks.forEach(fn => fn());

    return r;
  }

  listen(query, onSnapshot, onLoading, onError = () => { }, debugName) {
    if (!query.fieldConditions.some(x => x.fieldname === 'isDeleted')) {
      query = query.where('isDeleted').eq(0);
    }
    const listener = new QueryListener(
      this._cfdsClient,
      query,
      async (signal, local) => {
        try {
          const r = await this.run(query, {
            signal,
            local,
          });
          if (!signal.aborted) {
            onSnapshot(r);
          }
        } catch (e) {
          if (e.name === 'AbortError') {
            return;
          }
          onError(e);
        }
      }
    );
    onLoading();
    listener.listen();

    return () => listener.close();
  }
}
