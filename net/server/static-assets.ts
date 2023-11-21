import { walk } from 'std/fs/walk.ts';
import { exists } from 'std/fs/mod.ts';
import { extname } from 'std/path/mod.ts';
import {
  EntryPointDefault,
  EntryPointName,
  kEntryPointsNames,
} from '../../build.ts';
import { ServerServices, Endpoint } from './server.ts';
import { getRequestPath } from './utils.ts';
import { JSONObject, ReadonlyJSONObject } from '../../base/interfaces.ts';
import { decodeBase64, encodeBase64 } from 'std/encoding/base64.ts';

export type ContentType =
  | 'image/svg+xml'
  | 'image/png'
  | 'image/jpeg'
  | 'image/jpeg'
  | 'application/json'
  | 'text/javascript'
  | 'text/html'
  | 'text/css';

const ContentTypeMapping: Record<string, ContentType> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  json: 'application/json',
  js: 'text/javascript',
  html: 'text/html',
  css: 'text/css',
};

const kValidFileExtensions = Object.keys(ContentTypeMapping);

export interface Asset {
  data: Uint8Array;
  contentType: ContentType;
}

export type StaticEntryPoint = Record<string, Asset>;
export type StaticAssets = Required<Record<EntryPointName, StaticEntryPoint>>;

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
    let path = getRequestPath(req);

    const pathComps = path.split('/');

    let ep: EntryPointName = EntryPointDefault;
    if (kEntryPointsNames.includes(pathComps[1] as EntryPointName)) {
      ep = pathComps[1] as EntryPointName;
    }
    const staticEP = services.staticAssets && services.staticAssets[ep];

    if (!staticEP) {
      return Promise.resolve(new Response(null, { status: 404 }));
    }

    const epRelativePath =
      ep === EntryPointDefault ? path : path.substring(ep.length + 1);
    const asset = staticEP[epRelativePath] || staticEP['/index.html'];
    if (!asset) {
      return Promise.resolve(new Response(null, { status: 404 }));
    }

    return Promise.resolve(
      new Response(asset.data, {
        headers: {
          'content-type': asset.contentType,
        },
      })
    );
  }
}

export async function compileAssetsDirectory(
  ...assetsDirectories: string[]
): Promise<Record<string, Asset>> {
  const result: Record<string, Asset> = {};
  for (const dir of assetsDirectories) {
    if (!(await exists(dir))) {
      continue;
    }
    for await (const { path } of walk(dir, {
      includeDirs: false,
      includeSymlinks: false,
      followSymlinks: false,
      exts: kValidFileExtensions,
    })) {
      const ext = extname(path).substring(1) as keyof typeof ContentTypeMapping;
      result[path.substring(dir.length)] = {
        data: await Deno.readFile(path),
        contentType: ContentTypeMapping[ext] || 'application/octet-stream',
      };
    }
  }
  return result;
}

export function staticAssetsToJS(assets: StaticAssets): ReadonlyJSONObject {
  const result: JSONObject = {};
  for (const [ep, entry] of Object.entries(assets)) {
    const encodedEp: JSONObject = {};
    for (const [path, asset] of Object.entries(entry)) {
      encodedEp[path] = {
        data: encodeBase64(asset.data),
        contentType: asset.contentType,
      };
    }
    result[ep] = encodedEp;
  }
  return result;
}

export function staticAssetsFromJS(assets: ReadonlyJSONObject): StaticAssets {
  const result: Record<string, StaticEntryPoint> = {};
  for (const [ep, encodedEp] of Object.entries(assets)) {
    const entry: StaticEntryPoint = {};
    for (const [path, asset] of Object.entries(
      encodedEp as ReadonlyJSONObject
    )) {
      entry[path] = {
        data: decodeBase64((asset as ReadonlyJSONObject).data as string),
        contentType: (asset as ReadonlyJSONObject).contentType as ContentType,
      };
    }
    result[ep] = entry;
  }
  return result as StaticAssets;
}
