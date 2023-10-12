import yargs from 'https://deno.land/x/yargs@v17.7.1-deno/deno.ts';
import { OwnedSession, generateSession } from '../../auth/session.ts';
import { Dictionary } from '../../base/collections/dict.ts';
import { assert } from '../../base/error.ts';
import { LogStream, log, setGlobalLoggerStreams } from '../../logging/log.ts';
import { HTTPMethod } from '../../logging/metrics.ts';
import { PrometheusLogStream } from '../../server/prometeus-stream.ts';
import { SyncEndpoint, SyncService } from './sync.ts';
import { StaticAssets, StaticAssetsEndpoint } from './static-assets.ts';
import { ConsoleLogStream } from '../../logging/console-stream.ts';
import { persistSession } from './auth.ts';
import { HealthCheckEndpoint } from './health.ts';
import { MetricsMiddleware, PrometheusMetricsEndpoint } from './metrics.ts';
import { ValueService, BaseService } from './service.ts';

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
  filter(server: Server, req: Request, info: Deno.ServeHandlerInfo): boolean;
  processRequest(
    server: Server,
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
    server: Server,
    req: Request,
    info: Deno.ServeHandlerInfo
  ) => Promise<Response | undefined>;
  didProcess?: (
    server: Server,
    req: Request,
    info: Deno.ServeHandlerInfo,
    resp: Response
  ) => Promise<Response>;
}

export type ServiceName = 'sync' | 'prometheus' | 'session' | 'staticAssets';

type ServiceType<T extends ServiceName> = T extends 'sync'
  ? SyncService
  : T extends 'prometheus'
  ? ValueService<'prometheus', PrometheusLogStream>
  : T extends 'session'
  ? ValueService<'session', OwnedSession>
  : T extends 'staticAssets'
  ? ValueService<'staticAssets', StaticAssets | undefined>
  : BaseService;

/**
 * CLI arguments consumed by our server.
 */
interface Arguments {
  port: number;
  replicas: string[];
  dir: string;
  app: string;
  importMap?: string;
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
  private readonly _services: Dictionary<string, BaseService>;
  private readonly logStreams: readonly LogStream[];
  private port = 8080;
  private replicas: string[] | undefined;

  private _abortController: AbortController | undefined;

  constructor() {
    this._endpoints = [];
    this._middlewares = [];
    this._services = new Map();
    const prometheusLogStream = new PrometheusLogStream();
    this.logStreams = [new ConsoleLogStream(), prometheusLogStream];
    this.registerService(
      new ValueService(this, 'prometheus', prometheusLogStream)
    );
    setGlobalLoggerStreams(this.logStreams);
  }

  async setupServer(): Promise<void> {
    const args: Arguments = yargs(Deno.args)
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
        description: 'A list of replica URLs which this server will sync with',
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
    this.port = args.port;
    this.replicas = args.replicas;
    // Monitoring
    this.registerMiddleware(new MetricsMiddleware(this.logStreams));
    this.registerEndpoint(new PrometheusMetricsEndpoint());

    // Generate a new root session
    const session = await generateSession('root');
    this.registerService(new ValueService(this, 'session', session));

    // Sync
    this.registerService(new SyncService(this, args.dir, args.replicas));
    this.registerEndpoint(new SyncEndpoint());

    // Publish our root session
    await persistSession(this, session);

    // Health check
    this.registerEndpoint(new HealthCheckEndpoint());

    // Static Assets
    this.registerService(new ValueService(this, 'staticAssets', undefined));
    this.registerEndpoint(new StaticAssetsEndpoint());
  }

  registerEndpoint(ep: Endpoint): void {
    this._endpoints.push(ep as Endpoint);
  }

  registerMiddleware(mid: Middleware): void {
    this._middlewares.push(mid as Middleware);
  }

  registerService(service: BaseService): void {
    this._services.set(service.name, service);
  }

  service<T extends ServiceName>(name: T): ServiceType<T> {
    const service = this._services.get(name);
    assert(
      service !== undefined,
      `Unknown service '${name}'. Did you remember to register it?`
    );
    return service as ServiceType<T>;
  }

  async processRequest(
    req: Request,
    info: Deno.ServeHandlerInfo
  ): Promise<Response> {
    const middlewares = this._middlewares;
    for (const endpoint of this._endpoints) {
      if (endpoint.filter(this, req, info)) {
        try {
          let resp: Response | undefined;
          for (const m of middlewares) {
            if (m.shouldProcess) {
              resp = await m.shouldProcess(this, req, info);
              if (resp) {
                break;
              }
            }
          }
          if (!resp) {
            resp = await endpoint.processRequest(this, req, info);
          }
          for (const m of middlewares) {
            if (m.didProcess) {
              resp = await m.didProcess(this, req, info, resp);
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
        resp = await m.didProcess(this, req, info, resp);
      }
    }
    return resp;
  }

  start(): Promise<void> {
    if (this._abortController) {
      return Promise.resolve();
    }
    for (const service of this._services.values()) {
      if (service.start) {
        service.start();
      }
    }
    log({
      severity: 'INFO',
      name: 'ServerStarted',
      value: 1,
      unit: 'Count',
      urls: this.replicas,
    });
    let resolve: () => void;
    const result = new Promise<void>((res) => {
      resolve = res;
    });
    this._abortController = new AbortController();
    const server = Deno.serve(
      {
        port: this.port || 8080,
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
    for (const service of this._services.values()) {
      if (service.stop) {
        service.stop();
      }
    }
    this._abortController = undefined;
    return Promise.resolve();
  }
}
