import { LogStream, log } from '../../logging/log.ts';
import { PrometheusLogStream } from '../../server/prometeus-stream.ts';
import { Endpoint, Middleware } from './base-server.ts';

export class MetricsMiddleware implements Middleware {
  constructor(readonly outputStreams?: readonly LogStream[]) {}

  didProcess(
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
  constructor(readonly logStream: PrometheusLogStream) {}

  filter(req: Request, info: Deno.ServeHandlerInfo): boolean {
    if (req.method !== 'GET') {
      return false;
    }
    return new URL(req.url).pathname.toLowerCase() === '/metrics';
  }

  processRequest(req: Request, info: Deno.ServeHandlerInfo): Promise<Response> {
    const metrics = this.logStream.getMetrics();
    return Promise.resolve(
      new Response(metrics, {
        headers: {
          'content-type': 'text/plain; version=0.0.4; charset=utf-8',
        },
      })
    );
  }
}
