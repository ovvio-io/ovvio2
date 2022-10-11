import { notReached } from '@ovvio/base/lib/utils/error';
import {
  CRUD,
  GetOptions,
  RowData,
  ScanCallback,
  ScanningCRUD,
  ScanOptions,
  ScanPrefixCallback,
  SizeEstimate,
  UpdateRequest,
  UpdateResult,
} from './crud';

export interface SetupOptions {
  provider?: string;
  region?: string;
  env?: string;
  table?: string;
}
/**
 * Setup function responsible for creating CRUD instances for the router.
 */
export interface SetupFunction {
  (options: SetupOptions, specOptions?: any): CRUD | undefined;
}

/**
 * RouterStore is a logical glue on top of multiple, unrelated, CRUD
 * implementations. You can use it to route requests to different tables,
 * different regions, or even different cloud providers.
 *
 * You can, and probably should, create an ACIDStore instance on top of a
 * RouterStore instance, thereby getting ACID semantics on top all of the
 * router's backends.
 *
 * RouterStore routs requests based on their key, which can be either "plain"
 * or a full URL. Plain keys, in the form of `<key>/<path>` are routed to the
 * default table at the default region/provider.
 *
 * Full URL keys adhere to the following format:
 * `<provider>://<region>.<env>.<table>/key/path`.
 *
 * The domain part can use any of these options:
 * Full: <region>.<env>.<table>
 * Env+Table: <env>.<table>
 * Table only: <table>
 *
 * Additionally, the region, env and table parts can use the special `default`
 * value (think "localhost" in traditional URLs), which directs to the default
 * configuration. Some examples:
 * - `default://stage.default` -> current stage table in the default provider.
 * - `aws://default` -> default table in current stage in AWS.
 * - `gcp://default.dev.foo` -> foo table in dev of default region in GCP.
 */
export class RouterStore implements CRUD, ScanningCRUD {
  private _setupFuncs: [SetupFunction, any][];
  // provider -> region -> env -> tableName -> CRUD
  private _map: Map<
    string | undefined,
    Map<
      string | undefined,
      Map<string | undefined, Map<string | undefined, CRUD>>
    >
  >;
  readonly baseUrl;

  /**
   * @param baseUrl Base URL for URL resolver
   */
  constructor(
    setupFunc: SetupFunction,
    extendedOpts?: any,
    baseUrl: string = 'default://default'
  ) {
    this._setupFuncs = [[setupFunc, extendedOpts]];
    this._map = new Map();
    this.baseUrl = baseUrl;
  }

  /**
   * Register a setup function for this router. Upon a request to a new backend,
   * the router will run all setup functions in order, using the first returned
   * CRUD instance. This usually means that the first registered setup function
   * will be of the default provider.
   *
   * @param f The setup function to register.
   */
  registerSetupFunc(f: SetupFunction, extendedOpts?: any): void {
    this._setupFuncs.push([f, extendedOpts]);
  }

  create(key: string, data: RowData): Promise<boolean> {
    const [store, primitiveKey] = this.storeForKey(key);
    return store.create(primitiveKey, data);
  }

  get(key: string, options?: GetOptions): Promise<RowData | undefined> {
    const [store, primitiveKey] = this.storeForKey(key);
    return store.get(primitiveKey, options);
  }

  update(key: string, request: UpdateRequest): Promise<UpdateResult> {
    const [store, primitiveKey] = this.storeForKey(key);
    return store.update(primitiveKey, request);
  }

  delete(key: string, checkColumns?: RowData): Promise<UpdateResult> {
    const [store, primitiveKey] = this.storeForKey(key);
    return store.delete(primitiveKey, checkColumns);
  }

  scanPrefix(
    keyPrefix: string,
    callback: ScanPrefixCallback,
    options?: GetOptions
  ): Promise<void> {
    const [store, primitiveKey] = this.storeForKey<ScanningCRUD>(keyPrefix);
    return store.scanPrefix(primitiveKey, callback, options);
  }

  scan(
    callback: ScanCallback,
    options?: ScanOptions
  ): Promise<string | undefined> {
    const [store] = this.storeForKey<ScanningCRUD>(this.baseUrl);
    return store.scan(callback, options);
  }

  scanByDBKey(key: string, callback: ScanCallback, options?: GetOptions) {
    const [store] = this.storeForKey<ScanningCRUD>(key);
    return store.scan(callback, options);
  }

  getSizeEstimate(): Promise<SizeEstimate> {
    const [store] = this.storeForKey<ScanningCRUD>(this.baseUrl);
    return store.getSizeEstimate();
  }

  private storeForKey<T extends CRUD>(key: string): [T, string] {
    const url = new URL(key, this.baseUrl);
    let provider: string | undefined = url.protocol;
    if (provider?.endsWith(':')) {
      provider = provider.substring(0, provider.length - 1);
    }
    provider = normalizeURLValue(provider);

    let providerMap = this._map.get(provider);
    if (providerMap === undefined) {
      providerMap = new Map();
      this._map.set(provider, providerMap);
    }
    const [region, env, table] = parseDomain(url.hostname);
    let regionMap = providerMap.get(region);
    if (regionMap === undefined) {
      regionMap = new Map();
      providerMap.set(region, regionMap);
    }
    let envMap = regionMap.get(env);
    if (envMap === undefined) {
      envMap = new Map();
      regionMap.set(env, envMap);
    }
    let store = envMap.get(table);
    if (store === undefined) {
      store = this.createCRUD({ provider, region, env, table });
      envMap.set(table, store);
    }
    let primitiveKey = url.pathname;
    if (primitiveKey[0] === '/') {
      primitiveKey = primitiveKey.substring(1);
    }
    return [store as T, primitiveKey];
  }

  private createCRUD(options: SetupOptions): CRUD {
    let result: CRUD | undefined = undefined;
    for (const [setupFunc, extendedOpts] of this._setupFuncs) {
      result = setupFunc(options, extendedOpts);
      if (result !== undefined) {
        return result;
      }
    }
    notReached(
      `No CRUD setup was found for configuration: ${options.provider}://${options.region}.${options.env}.${options.table}`
    );
  }
}

// Returns [region, env, table]
function parseDomain(
  domain: string | undefined
): [string | undefined, string | undefined, string | undefined] {
  if (domain === undefined || domain.length === 0) {
    return [undefined, undefined, undefined];
  }
  const parts = domain.split('.');
  if (parts.length === 1) {
    return [undefined, undefined, normalizeURLValue(parts[0])];
  }
  if (parts.length === 2) {
    return [
      undefined,
      normalizeURLValue(parts[0]),
      normalizeURLValue(parts[1]),
    ];
  }
  return [
    normalizeURLValue(parts[0]),
    normalizeURLValue(parts[1]),
    normalizeURLValue(parts[2]),
  ];
}

function normalizeURLValue(v: string | undefined): string | undefined {
  return v === 'default' ? undefined : v;
}
