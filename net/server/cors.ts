import { Endpoint, Middleware, ServerServices } from './server.ts';

export class CORSMiddleware implements Middleware {
  didProcess(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo,
    resp: Response
  ): Promise<Response> {
    resp.headers.set(
      'access-control-allow-origin',
      req.headers.get('origin') || '*'
    );
    resp.headers.set('access-control-allow-methods', req.method || '*');
    resp.headers.set('access-control-allow-headers', '*');
    return Promise.resolve(resp);
  }
}

export class CORSEndpoint implements Endpoint {
  filter(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo
  ): boolean {
    return req.method === 'OPTIONS';
  }

  processRequest(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo
  ): Promise<Response> {
    return Promise.resolve(new Response(null));
  }
}
