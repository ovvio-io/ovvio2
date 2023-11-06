import yargs from 'yargs';
import * as path from 'std/path/mod.ts';
import { Dictionary } from '../../base/collections/dict.ts';
import {
  Logger,
  log,
  newLogger,
  setGlobalLoggerStreams,
} from '../../logging/log.ts';
import { HTTPMethod } from '../../logging/metrics.ts';
import { PrometheusLogStream } from '../../server/prometeus-stream.ts';
import { SyncEndpoint, SyncService } from './sync.ts';
import { StaticAssets, StaticAssetsEndpoint } from './static-assets.ts';
import { ConsoleLogStream } from '../../logging/console-stream.ts';
import { AuthEndpoint, persistSession } from './auth.ts';
import { HealthCheckEndpoint } from './health.ts';
import { MetricsMiddleware, PrometheusMetricsEndpoint } from './metrics.ts';
import { SettingsService } from './settings.ts';
import { BaseService } from './service.ts';
import { TrustPool } from '../../auth/session.ts';
import { EmailService } from './email.ts';

/**
 * CLI arguments consumed by our server.
 */
interface Arguments {
  // Full path to data directory
  readonly dir: string;
  readonly replicas: string[];
  readonly port: number;
}

// Stuff that's shared to all organizations served by this server
export interface ServerContext extends Arguments {
  readonly settings: SettingsService;
  readonly prometheus: PrometheusLogStream;
  readonly trustPool: TrustPool;
  readonly email: EmailService;
  readonly logger: Logger;
}

// Stuff specific to an organization
export interface ServerServices extends ServerContext {
  readonly organizationId: string;
  readonly sync: SyncService;
  staticAssets: StaticAssets | undefined;
}

/**
 * An Endpoint catches a request using its filter, and generates an appropriate
 * response for the request. For every incoming request, all Endpoints are
 * searched until the first filter hit is found. Thus, the order of Endpoint
 * registration determines the search order.
 *
 * In order to fulfill their job, Endpoints can consume Services offered by the
 * server. See `BaseService` below.
 */
export interface Endpoint {
  filter(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo
  ): boolean;
  processRequest(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo
  ): Promise<Response>;
}

/**
 * A middleware runs before and/or after the selected endpoint. A middleware
 * may either block the request entirely (to enforce permissions, etc) or modify
 * the response after the endpoint finished execution.
 *
 * Note that all registered middlewares get a chance to run for each request.
 * Execution order follows registration order, just like endpoints.
 */
export interface Middleware {
  shouldProcess?: (
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo
  ) => Promise<Response | undefined>;
  didProcess?: (
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo,
    resp: Response
  ) => Promise<Response>;
}

/**
 * A simple abstraction around an HTTP server. Our server is built using two
 * primitives: endpoints and middlewares.
 *
 * Endpoint:
 * ---------
 *
 * An endpoint catches a request using its filter, and generates an appropriate
 * response for this request. For every incoming request, all endpoints are
 * searched until a first filter hit is found. Thus, the order of endpoint
 * registration determines the search order.
 *
 * Middleware:
 * -----------
 *
 * A middleware runs before and/or after the selected endpoint. A middleware
 * may either block the request entirely (to enforce permissions, etc) or modify
 * the response after the endpoint finished execution.
 *
 * Note that all registered middlewares get a chance to run for each request.
 * Execution order follows registration order, like endpoints.
 */
export class Server {
  private readonly _endpoints: Endpoint[];
  private readonly _middlewares: Middleware[];
  private readonly _baseContext: ServerContext;
  private readonly _servicesByOrg: Dictionary<string, ServerServices>;
  private _abortController: AbortController | undefined;

  constructor(args?: Arguments) {
    this._endpoints = [];
    this._middlewares = [];
    if (args === undefined) {
      args = yargs(Deno.args)
        .option('port', {
          alias: 'p',
          type: 'number',
          description: 'The port on which the server accepts incoming requests',
          default: 8080,
        })
        .option('replicas', {
          alias: 'r',
          type: 'array',
          default: [],
          description:
            'A list of replica URLs which this server will sync with',
        })
        .option('dir', {
          alias: 'd',
          description:
            'A full path to a local directory which will host all repositories managed by this server',
        })
        .demandOption(
          ['dir']
          // 'Please provide a local directory for this server'
        )
        // .demandOption(['app'], 'Please provide')
        .parse();
    }

    this._servicesByOrg = new Map();
    const settingsService = new SettingsService();
    const prometeusLogStream = new PrometheusLogStream();
    const logStreams = [new ConsoleLogStream(), prometeusLogStream];
    setGlobalLoggerStreams(logStreams);
    this._baseContext = {
      settings: settingsService,
      // trustPool: new TrustPool(settingsService.session, []),
      prometheus: prometeusLogStream,
      dir: args!.dir,
      replicas: args?.replicas || [],
      port: args?.port || 8080,
      email: new EmailService(),
      logger: newLogger(logStreams),
    } as ServerContext;
    // Monitoring
    this.registerMiddleware(new MetricsMiddleware(logStreams));
    this.registerEndpoint(new PrometheusMetricsEndpoint());
    // Health check
    this.registerEndpoint(new HealthCheckEndpoint());
    // Auth
    this.registerEndpoint(new AuthEndpoint());
    // Static Assets
    this.registerEndpoint(new StaticAssetsEndpoint());
    // Sync
    this.registerEndpoint(new SyncEndpoint());
  }

  async setup(): Promise<void> {
    const services: ServerServices = {
      ...this._baseContext,
      organizationId: '<global>',
      sync: new SyncService(),
      staticAssets: undefined,
    };
    // Setup Settings service
    await this._baseContext.settings.setup(services);
    await this._baseContext.email.setup(services);
    (this._baseContext as any).trustPool = new TrustPool(
      this._baseContext.settings.session,
      []
    );
  }

  async servicesForOrganization(orgId: string): Promise<ServerServices> {
    let services = this._servicesByOrg.get(orgId);
    if (!services) {
      const baseTrustPool = this._baseContext.trustPool;
      // Monitoring
      services = {
        ...this._baseContext,
        dir: path.join(this._baseContext.dir, orgId),
        organizationId: orgId,
        sync: new SyncService(),
        trustPool: new TrustPool(
          baseTrustPool.currentSession,
          baseTrustPool.roots
        ),
        staticAssets: undefined,
      };

      // Setup all services in the correct order of dependencies
      services.sync.setup(services);
      // <<< Add any new service.setup() calls here >>>

      // Publish our root session to clients so we claim our authority
      await persistSession(services, services.settings.session);
      this._servicesByOrg.set(orgId, services);
    }
    return services;
  }

  registerEndpoint(ep: Endpoint): void {
    this._endpoints.push(ep as Endpoint);
  }

  registerMiddleware(mid: Middleware): void {
    this._middlewares.push(mid as Middleware);
  }

  async processRequest(
    req: Request,
    info: Deno.ServeHandlerInfo
  ): Promise<Response> {
    const orgId = organizationIdFromURL(req.url);
    if (!orgId) {
      log({
        severity: 'METRIC',
        name: 'HttpStatusCode',
        unit: 'Count',
        value: 404,
        url: req.url,
        method: req.method as HTTPMethod,
      });
      return new Response(null, {
        status: 404,
      });
    }
    const services = await this.servicesForOrganization(orgId);
    const middlewares = this._middlewares;
    for (const endpoint of this._endpoints) {
      if (endpoint.filter(services, req, info)) {
        try {
          let resp: Response | undefined;
          for (const m of middlewares) {
            if (m.shouldProcess) {
              resp = await m.shouldProcess(services, req, info);
              if (resp) {
                break;
              }
            }
          }
          if (!resp) {
            resp = await endpoint.processRequest(services, req, info);
          }
          for (const m of middlewares) {
            if (m.didProcess) {
              resp = await m.didProcess(services, req, info, resp);
            }
          }
          return resp;
        } catch (e: any) {
          log({
            severity: 'ERROR',
            name: 'InternalServerError',
            unit: 'Count',
            value: 500,
            url: req.url,
            method: req.method as HTTPMethod,
            error: String(e),
          });
          return new Response(null, {
            status: 500,
          });
        }
      }
    }
    let resp = new Response(null, {
      status: 404,
    });
    for (const m of middlewares) {
      if (m.didProcess) {
        resp = await m.didProcess(services, req, info, resp);
      }
    }
    return resp;
  }

  start(): Promise<void> {
    if (this._abortController) {
      return Promise.resolve();
    }
    for (const services of this._servicesByOrg.values()) {
      for (const v of Object.values(services)) {
        if (v instanceof BaseService) {
          v.start();
        }
      }
    }
    log({
      severity: 'METRIC',
      name: 'ServerStarted',
      value: 1,
      unit: 'Count',
      urls: this._baseContext.replicas,
    });
    let resolve: () => void;
    const result = new Promise<void>((res) => {
      resolve = res;
    });
    this._abortController = new AbortController();
    const server = Deno.serve(
      {
        port: this._baseContext.port,
        onListen() {
          resolve();
        },
        signal: this._abortController.signal,
      },
      this.processRequest.bind(this)
    );
    return result;
  }

  stop(): Promise<void> {
    if (!this._abortController) {
      return Promise.resolve();
    }
    this._abortController.abort();
    for (const services of this._servicesByOrg.values()) {
      for (const v of Object.values(services)) {
        if (v instanceof BaseService) {
          v.stop();
        }
      }
    }
    this._abortController = undefined;
    return Promise.resolve();
  }
}

const RESERVED_ORG_IDS = ['ovvio', 'debug', 'localhost'];

function isValidOrgId(id: string): boolean {
  const len = id.length;
  if (len < 4 || len > 32) {
    return false;
  }
  if (RESERVED_ORG_IDS.includes(id)) {
    return false;
  }
  for (let i = 0; i < len; ++i) {
    const code = id.charCodeAt(i);
    // [0 -
    if (code < 48) {
      return false;
    }
    // 9], [A -
    if (code > 57 && code < 65) {
      return false;
    }
    // Z], [a -
    if (code > 90 && code < 97) {
      return false;
    }
    // z]
    if (code > 122) {
      return false;
    }
  }
  return true;
}

/**
 * WARNING: This seemingly trivial function deals with data that arrives from
 * anywhere in the internet. We must treat it as potentially hostile.
 */
function organizationIdFromURL(url: string | URL): string | undefined {
  if (typeof url === 'string') {
    url = new URL(url);
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost';
  }
  const comps = url.hostname.split('.');
  if (comps.length !== 3) {
    return undefined;
  }
  const maybeId = comps[0];
  if (isValidOrgId(maybeId)) {
    return maybeId;
  }
  return undefined;
}
