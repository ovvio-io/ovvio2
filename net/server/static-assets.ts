import { Endpoint } from './base-server.ts';

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
  staticAssets?: StaticAssets;
  constructor(assets?: StaticAssets) {
    this.staticAssets = assets;
  }

  filter(req: Request, info: Deno.ServeHandlerInfo): boolean {
    return req.method === 'GET' && this.staticAssets !== undefined;
  }

  processRequest(req: Request, info: Deno.ServeHandlerInfo): Promise<Response> {
    const path = new URL(req.url).pathname.toLowerCase() as StaticPath;
    switch (path) {
      case '/app.js': {
        return Promise.resolve(
          new Response(this.staticAssets?.js, {
            headers: {
              'content-type': 'text/javascript; charset=utf-8',
            },
            status: this.staticAssets?.js ? 200 : 404,
          })
        );
      }

      case '/app.js.map': {
        return Promise.resolve(
          new Response(this.staticAssets?.sourceMap, {
            headers: {
              'content-type': 'application/json; charset=utf-8',
            },
            status: this.staticAssets?.sourceMap ? 200 : 404,
          })
        );
      }

      case '/index.css': {
        return Promise.resolve(
          new Response(this.staticAssets?.css, {
            headers: {
              'content-type': 'text/css; charset=utf-8',
            },
            status: this.staticAssets?.css ? 200 : 404,
          })
        );
      }

      case '/index.html':
      default: {
        return Promise.resolve(
          new Response(this.staticAssets?.html, {
            headers: {
              'content-type': 'text/html; charset=utf-8',
            },
            status: this.staticAssets?.html ? 200 : 404,
          })
        );
      }
    }
  }
}
