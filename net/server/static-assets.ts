import { EntryPointName, kEntryPointsNames } from '../../build.ts';
import { ServerServices, Endpoint } from './server.ts';
import { getRequestPath } from './utils.ts';

export interface StaticEntryPoint {
  readonly html: string;
  readonly css: string;
  readonly js: string;
  readonly sourceMap?: string;
}

export type StaticAssets = Required<Record<EntryPointName, StaticEntryPoint>>;

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
    const pathComps = path.split('/');

    let ep: EntryPointName = 'web-app';
    if (
      // pathComps.length === 3 &&
      kEntryPointsNames.includes(pathComps[1] as EntryPointName)
    ) {
      if (ep !== (pathComps[1] as EntryPointName)) {
        ep = pathComps[1] as EntryPointName;
      }
    }
    const staticEP = services.staticAssets && services.staticAssets[ep];
    const filename = ep === 'web-app' ? path.substring(1) : pathComps[2];
    switch (filename) {
      case 'app.js': {
        return Promise.resolve(
          new Response(staticEP?.js, {
            headers: {
              'content-type': 'text/javascript; charset=utf-8',
            },
            status: staticEP?.js ? 200 : 404,
          })
        );
      }

      case 'app.js.map': {
        return Promise.resolve(
          new Response(staticEP?.sourceMap, {
            headers: {
              'content-type': 'application/json; charset=utf-8',
            },
            status: staticEP?.sourceMap ? 200 : 404,
          })
        );
      }

      case 'index.css': {
        return Promise.resolve(
          new Response(staticEP?.css, {
            headers: {
              'content-type': 'text/css; charset=utf-8',
            },
            status: staticEP?.css ? 200 : 404,
          })
        );
      }

      case 'index.html':
      default: {
        return Promise.resolve(
          new Response(staticEP?.html, {
            headers: {
              'content-type': 'text/html; charset=utf-8',
            },
            status: staticEP?.html ? 200 : 404,
          })
        );
      }
    }
  }
}
