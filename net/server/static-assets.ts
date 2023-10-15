import { ServerServices, Endpoint } from './server.ts';
import { getRequestPath } from './utils.ts';

export interface StaticAssets {
  readonly html: string;
  readonly css: string;
  readonly js: string;
  readonly sourceMap?: string;
}

export const kStaticPaths = [
  '/index.html',
  '/index.css',
  '/app.js',
  '/app.js.map',
] as const;

export type StaticPath = (typeof kStaticPaths)[number];

export class StaticAssetsEndpoint implements Endpoint {
  filter(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo
  ): boolean {
    return req.method === 'GET';
  }

  processRequest(
    services: ServerServices,
    req: Request,
    info: Deno.ServeHandlerInfo
  ): Promise<Response> {
    const path = getRequestPath<StaticPath>(req);
    const staticAssets = services.staticAssets;
    switch (path) {
      case '/app.js': {
        return Promise.resolve(
          new Response(staticAssets?.js, {
            headers: {
              'content-type': 'text/javascript; charset=utf-8',
            },
            status: staticAssets?.js ? 200 : 404,
          })
        );
      }

      case '/app.js.map': {
        return Promise.resolve(
          new Response(staticAssets?.sourceMap, {
            headers: {
              'content-type': 'application/json; charset=utf-8',
            },
            status: staticAssets?.sourceMap ? 200 : 404,
          })
        );
      }

      case '/index.css': {
        return Promise.resolve(
          new Response(staticAssets?.css, {
            headers: {
              'content-type': 'text/css; charset=utf-8',
            },
            status: staticAssets?.css ? 200 : 404,
          })
        );
      }

      case '/index.html':
      default: {
        return Promise.resolve(
          new Response(staticAssets?.html, {
            headers: {
              'content-type': 'text/html; charset=utf-8',
            },
            status: staticAssets?.html ? 200 : 404,
          })
        );
      }
    }
  }
}
