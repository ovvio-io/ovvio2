import { LogStream, log } from '../../logging/log.ts';
import { Server, Endpoint, Middleware } from './server.ts';
import { getRequestPath } from './utils.ts';

export class MetricsMiddleware implements Middleware {
  constructor(readonly outputStreams?: readonly LogStream[]) {}

  didProcess(
    server: Server,
    req: Request,
    info: Deno.ServeHandlerInfo,
    resp: Response
  ): Promise<Response> {
    log(
      {
        severity: 'INFO',
        name: 'HttpStatusCode',
        unit: 'Count',
        value: resp.status,
        url: req.url,
        method: req.method,
      },
      this.outputStreams
    );
    return Promise.resolve(resp);
  }
}

export class PrometheusMetricsEndpoint implements Endpoint {
  filter(server: Server, req: Request, info: Deno.ServeHandlerInfo): boolean {
    if (req.method !== 'GET') {
      return false;
    }
    return getRequestPath(req) === '/metrics';
  }

  processRequest(
    server: Server,
    req: Request,
    info: Deno.ServeHandlerInfo
  ): Promise<Response> {
    const logStream = server.service('prometheus').value;
    const metrics = logStream.getMetrics();
    return Promise.resolve(
      new Response(metrics, {
        headers: {
          'content-type': 'text/plain; version=0.0.4; charset=utf-8',
        },
      })
    );
  }
}
