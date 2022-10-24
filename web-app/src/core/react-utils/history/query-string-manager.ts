import { History } from '.';

function formatValue(value: string | string[]) {
  if (!value || !value.length) {
    return;
  }
  if (Array.isArray(value)) {
    return value.join(',');
  }
  return value;
}

export type QueryValue<IsArray extends boolean> = IsArray extends true
  ? string[]
  : string;

export interface IQueryParamManager<IsArray extends boolean> {
  listen(listener: (value: QueryValue<IsArray>) => void): () => void;
  set(value: QueryValue<IsArray>): void;
  dispose(): void;
}

class QueryParamManager<IsArray extends boolean>
  implements IQueryParamManager<IsArray>
{
  private currentVal: string;

  private listeners: ((value: QueryValue<IsArray>) => void)[] = [];

  constructor(
    readonly isArray: IsArray,
    private history: History,
    private key: string,
    private readonly manager: QueryStringManager
  ) {}

  private parseValue(str: string): QueryValue<IsArray> {
    if (this.isArray) {
      return (str || '').split(',') as QueryValue<IsArray>;
    }
    return str as QueryValue<IsArray>;
  }

  listen(listener: (value: QueryValue<IsArray>) => void) {
    if (!this.currentVal) {
      const query = new URLSearchParams(this.history.$history.location.search);
      this.currentVal = query.get(this.key) as any;
    }
    this.listeners.push(listener);
    this.manager.requestListen(this.key);
    listener(this.parseValue(this.currentVal));
    return () => {
      this.manager.requestUnlisten(this.key);
      this.listeners.splice(this.listeners.indexOf(listener), 1);
    };
  }

  set(value: QueryValue<IsArray>) {
    const formatted = formatValue(value);
    if (this.currentVal === formatted) {
      return;
    }
    this.currentVal = formatted;
    this.manager.setQueryParam(this.key, value);
  }

  dispose() {
    this.manager.setQueryParam(this.key, '');
    this.manager.closeManager(this.key);
  }

  notify(value: string) {
    if (value === this.currentVal) {
      return;
    }
    this.currentVal = value;
    const parsed = this.parseValue(value);
    this.listeners.forEach(x => x(parsed as any));
  }
}

export interface IQueryStringManager {
  manage<IsArray extends boolean>(
    key: string,
    isArray: IsArray
  ): IQueryParamManager<IsArray>;
  dispose(): void;
}
type ManagerRecord = {
  listenerCount: number;
  manager: QueryParamManager<any>;
  route?: string;
};
class QueryStringManager implements IQueryStringManager {
  private managers: {
    [key in string]: ManagerRecord;
  } = {};
  private totalListenerCount = 0;
  private unlisten = () => {};
  private isModifyingQuery = false;
  private pendingQueryUpdates: {
    key: string;
    value: string | string[];
    route?: string;
  }[];
  private timeoutId: number;

  constructor(private history: History) {}

  manage<IsArray extends boolean>(
    key: string,
    isArray: IsArray,
    route?: string
  ): IQueryParamManager<IsArray> {
    if (this.managers[key]) {
      throw new Error(`Manager for key ${key} already exists`);
    }
    const manager = new QueryParamManager(isArray, this.history, key, this);
    const m: ManagerRecord = {
      manager,
      listenerCount: 0,
    };
    if (route) {
      m.route = route;
    }
    this.managers[key] = m;
    return manager;
  }

  private onSearchChanged(currentRoute: string, search: string) {
    if (this.isModifyingQuery) {
      return;
    }
    const query = new URLSearchParams(search);
    for (const [key, entry] of Object.entries(this.managers)) {
      const { manager, route } = entry;
      if (typeof route !== 'undefined' || route !== currentRoute) {
        continue;
      }
      manager.notify(query.get(key));
    }
  }

  dispose() {
    this.unlisten();
  }

  requestListen(key: string) {
    this.managers[key].listenerCount++;
    this.totalListenerCount++;
    if (this.totalListenerCount === 1) {
      this.unlisten = this.history.listen((h, l) => {
        this.onSearchChanged(l.pathname, l.search);
      });
    }
  }

  requestUnlisten(key) {
    this.managers[key].listenerCount--;
    this.totalListenerCount--;
    if (!this.totalListenerCount) {
      this.unlisten();
      this.unlisten = () => {};
    }
  }

  private flushPendingUpdates() {
    const query = new URLSearchParams(this.history.$history.location.search);
    for (const update of this.pendingQueryUpdates) {
      const { key, value } = update;
      if (!value || !value.length) {
        query.delete(key);
      } else {
        query.set(key, formatValue(value));
      }
    }
    const search = query.toString();
    this.pendingQueryUpdates = [];
    if (search !== this.history.$history.location.search) {
      this.history.$history.push({ search });
    }
    this.isModifyingQuery = false;
  }

  closeManager(key: string) {
    delete this.managers[key];
  }

  setQueryParam(key: string, value: string | string[]) {
    const query = new URLSearchParams(this.history.$history.location.search);
    const currentVal = query.get(key);
    if (currentVal === formatValue(value)) {
      return;
    }
    this.isModifyingQuery = true;
    this.pendingQueryUpdates = this.pendingQueryUpdates || [];
    this.pendingQueryUpdates.push({ key, value });
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    setTimeout(() => {
      this.flushPendingUpdates();
    }, 10);
  }
}

export function createQueryManager(history: History): IQueryStringManager {
  return new QueryStringManager(history);
}
