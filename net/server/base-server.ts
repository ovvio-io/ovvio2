import { log } from '../../logging/log.ts';
import { HTTPMethod } from '../../logging/metrics.ts';

export interface Middleware {
  shouldProcess?: (
    req: Request,
    info: Deno.ServeHandlerInfo
  ) => Promise<Response | undefined>;
  didProcess?: (
    req: Request,
    info: Deno.ServeHandlerInfo,
    resp: Response
  ) => Promise<Response>;
}

export interface Endpoint {
  filter(req: Request, info: Deno.ServeHandlerInfo): boolean;
  processRequest(req: Request, info: Deno.ServeHandlerInfo): Promise<Response>;
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
export class BaseServer {
  private readonly _endpoints: Endpoint[];
  private readonly _middlewares: Middleware[];

  constructor() {
    this._endpoints = [];
    this._middlewares = [];
  }

  registerEndpoint(ep: Endpoint): void {
    this._endpoints.push(ep);
  }

  registerMiddleware(mid: Middleware): void {
    this._middlewares.push(mid);
  }

  async processRequest(
    req: Request,
    info: Deno.ServeHandlerInfo
  ): Promise<Response> {
    const middlewares = this._middlewares;
    for (const endpoint of this._endpoints) {
      if (endpoint.filter(req, info)) {
        try {
          let resp: Response | undefined;
          for (const m of middlewares) {
            if (m.shouldProcess) {
              resp = await m.shouldProcess(req, info);
              if (resp) {
                break;
              }
            }
          }
          if (!resp) {
            resp = await endpoint.processRequest(req, info);
          }
          for (const m of middlewares) {
            if (m.didProcess) {
              resp = await m.didProcess(req, info, resp);
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
        resp = await m.didProcess(req, info, resp);
      }
    }
    return resp;
  }
}
