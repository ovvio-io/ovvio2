import { Endpoint } from './base-server.ts';

export class HealthCheckEndpoint implements Endpoint {
  filter(req: Request, info: Deno.ServeHandlerInfo): boolean {
    if (req.method !== 'GET') {
      return false;
    }
    const path = new URL(req.url).pathname.toLowerCase();
    return path === '/healthy';
  }

  processRequest(req: Request, info: Deno.ServeHandlerInfo): Promise<Response> {
    return Promise.resolve(
      new Response('OK', {
        status: 200,
      })
    );
  }
}
