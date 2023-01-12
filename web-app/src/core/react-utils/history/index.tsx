import React, {
  useState,
  useContext,
  useEffect,
  useMemo,
} from 'https://esm.sh/react@18.2.0';
import { Router } from 'https://esm.sh/react-router-dom@5.1.0';
import {
  createBrowserHistory,
  History as RouterHistory,
} from 'https://esm.sh/history@5.3.0';
import {
  isElectron,
  loadElectronState,
  saveElectronState,
} from '../../../electronUtils.tsx';
import {
  createQueryManager,
  IQueryStringManager,
} from './query-string-manager.ts';
import { CoreObject } from '../../../../../base/core-types/base.ts';
import { assert } from 'https://deno.land/std@0.160.0/_util/assert.ts';

export const MarketingValues = {
  utmSource: 'utm_source',
  utmMedium: 'utm_medium',
  utmCampaign: 'utm_campaign',
  gcLid: 'gclid',
  inviteId: 'inviteId',
};

export type MarketingParams = { [K in keyof typeof MarketingValues]?: string };

function getUrlSegments(url: string) {
  if (url.startsWith('/')) {
    url = url.substring(1);
  }
  return url.split('/');
}

function getLocationSegments(location: Location) {
  const { pathname } = location;

  // if (window.location.protocol === 'file:') {
  //   console.log(pathname, hash);
  //   pathname = pathname.split('/webapp/build')[1];
  // }
  return getUrlSegments(pathname);
}

export interface RouteParams extends CoreObject {
  [key: string]: string;
}

export interface RouteData {
  name: string;
  url: string;
  id: string;
  params?: RouteParams;
}

interface DynamicSegmentBuilder {
  name: string;
  build: (params: RouteParams) => string;
}

class Route {
  private _urlBuilder!: (string | DynamicSegmentBuilder)[];
  constructor(public name: string, private route: string, private _id: string) {
    this._extractRouteInfo();
  }
  get id() {
    return this._id;
  }
  get routeDefinition() {
    return this.route;
  }

  _extractRouteInfo() {
    const segments = getUrlSegments(this.route);
    const segmentBuilder = [];
    const getParam = (params: RouteParams, key: string): string => {
      const val = params[key.substring(1)];
      assert(
        typeof val !== 'undefined',
        `Missing required parameter ${key} for route ${this.name}`
      );
      return val;
    };

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.startsWith(':')) {
        segmentBuilder[i] = {
          name: segment.substring(1),
          build: (params: RouteParams) => getParam(params, segment),
        };
      } else {
        segmentBuilder[i] = segment;
      }
    }

    this._urlBuilder = segmentBuilder;
  }

  buildRoute(params: RouteParams) {
    const url = this._urlBuilder
      .map((x) => {
        if (typeof x !== 'string') {
          return x.build(params);
        }
        return x;
      })
      .join('/');

    return {
      name: this.name,
      url: `/${url}`,
      id: this._id,
      params,
    };
  }

  extractLocation(location: Location) {
    if (this.route === '/*') {
      return {
        id: this._id,
        params: {},
      };
    }
    const segments = getLocationSegments(location);
    if (segments.length !== this._urlBuilder.length) {
      return false;
    }
    const params: RouteParams = {};
    for (let i = 0; i < segments.length; i++) {
      const segmentBuilder = this._urlBuilder[i];
      const segment = segments[i];
      if (segmentBuilder && typeof segmentBuilder !== 'string') {
        params[segmentBuilder.name] = segment;
      } else if (segment !== segmentBuilder) {
        return false;
      }
    }

    return {
      id: this._id,
      params,
    };
  }
}

class RouterWrapper {
  private routes: Record<string, Route>;

  constructor() {
    this.routes = {};
  }

  register(name: string, url: string, id: string) {
    if (this.routes[id]) {
      throw new Error(`Route with id ${id} already exists`);
    }
    if (Object.values(this.routes).some((x) => x.routeDefinition === url)) {
      throw new Error(`Url ${url} already exists`);
    }
    const r = new Route(name, url, id);
    this.routes[id] = r;
    return r;
  }

  get(id: string) {
    const route = this.routes[id];
    if (!route) {
      throw new Error(`Unknown route id ${id}`);
    }

    return route;
  }

  getRouteForLocation(location: Location) {
    for (const route of Object.values(this.routes)) {
      const extracted = route.extractLocation(location);
      if (extracted) {
        (extracted as any).key = location.key;
        return extracted;
      }
    }
    console.error('Unknown location received', location);
    throw new Error('Unknown location received');
  }
}

const routes = new RouterWrapper();

export const MY_TASKS = routes.register(
  'My Tasks',
  '/:workspaceId/me',
  'MY_TASKS'
);
export const CREATE_WORKSPACE = routes.register(
  'Create Workspace',
  '/new',
  'CREATE_WORKSPACE'
);
export const ALL_ITEMS = routes.register(
  'All Items',
  '/:workspaceId',
  'ALL_ITEMS'
);
export const SETTINGS = routes.register(
  'Settings',
  '/:workspaceId/settings',
  'SETTINGS'
);
export const NOTE = routes.register(
  'Note',
  '/:workspaceId/notes/:noteId',
  'NOTE'
);
export const LOGIN = routes.register('Login', '/', 'LOGIN');
export const NOT_FOUND = routes.register('Not found', '/*', 'NOT_FOUND');

export class History {
  private unlisten: () => void;
  private forwardRoutes: Map<any, any>;
  private backStack: any[];
  private listeners: any[];
  readonly queryManager: IQueryStringManager;

  constructor(private history: RouterHistory) {
    this.history = history;
    this.unlisten = this.history.listen(this.onHistoryChanged.bind(this));
    this.forwardRoutes = new Map();
    this.backStack = [routes.getRouteForLocation(history.location)];
    this.listeners = [];
    this.queryManager = createQueryManager(this);
  }

  get $history() {
    return this.history;
  }

  get length() {
    return this.backStack.length;
  }

  get currentRoute() {
    return this.getRouteInformation(0);
  }

  getRouteInformation(index: number) {
    if (index >= this.length) {
      return null;
    }
    index = this.length - index - 1;

    const { id, params } = this.backStack[index];
    return routes.get(id).buildRoute(params);
  }

  listen(fn: (history: History, location: Location) => void) {
    this.listeners.push(fn);

    return () => {
      this.listeners.splice(this.listeners.indexOf(fn), 1);
    };
  }

  onHistoryChanged(location, action) {
    switch (action) {
      case 'PUSH': {
        this.backStack.push(routes.getRouteForLocation(location));
        break;
      }
      case 'POP': {
        if (this.forwardRoutes.has(location.key)) {
          this.backStack.push(this.forwardRoutes.get(location.key));
          this.forwardRoutes.delete(location.key);
          break;
        }
        const route = this.backStack.pop();
        if (route) {
          this.forwardRoutes.set(route.key, route);
        }
        break;
      }
      case 'REPLACE': {
        this.backStack[0] = routes.getRouteForLocation(location);
        break;
      }
      default:
        throw new Error('Unknown action received');
    }

    this.listeners.forEach((fn) => fn(this, location));
  }

  push(route, params?: any) {
    const r = route.buildRoute(params);
    return this.$history.push(r.url, {
      ...params,
      id: route.key,
    });
  }

  replace(route, params?: any) {
    const r = route.buildRoute(params);
    return this.$history.replace(r.url, {
      ...params,
      id: route.key,
    });
  }

  extractMarketingParams(removeFromQs = false) {
    const queryParams = new URLSearchParams(window.location.search);
    const result: MarketingParams = {};

    const marketingKeys = new Set<string>();

    for (const [propName, key] of Object.entries(MarketingValues)) {
      const val = queryParams.get(key);
      if (val) {
        result[propName] = val;
      }
      marketingKeys.add(key);
    }
    if (removeFromQs) {
      const newQs: string[] = [];
      for (const [key, value] of queryParams) {
        if (!marketingKeys.has(key)) {
          newQs.push(`${key}=${value}`);
        }
      }
      this.$history.replace({
        search: `?${newQs.join('&')}`,
      });
    }
    return result;
  }

  pop() {
    return this.$history.goBack();
  }

  cleanup() {
    this.unlisten();
  }
}
const IS_ELECTRON = isElectron();

const historyContext = React.createContext<History>(null);

export function useHistoryStatic() {
  return useContext(historyContext);
}

export function useHistory(onChange = null) {
  const history = useHistoryStatic();
  const [, setRerender] = useState(1);
  useEffect(() => {
    return history.listen((h, l) => {
      setRerender((x) => x + 1);
      if (onChange) {
        onChange(h, l);
      }
    });
  }, [history, onChange]);
  return history;
}

export default function OvvioRouter(props) {
  const [history] = useState(
    IS_ELECTRON
      ? createBrowserHistory({ basename: window.location.pathname })
      : createBrowserHistory()
  );

  useEffect(() => {
    loadElectronState(history);
    if (!IS_ELECTRON) {
      return;
    }
    const unsub = history.listen((loc) => {
      saveElectronState(loc.search);
    });

    return () => {
      unsub();
    };
  }, [history]);

  const val = useMemo(() => {
    return new History(history);
  }, [history]);
  return (
    <historyContext.Provider value={val}>
      <Router {...props} history={val.$history} />
    </historyContext.Provider>
  );
}
