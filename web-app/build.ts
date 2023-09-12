// @deno-types="https://deno.land/x/esbuild@v0.19.2/mod.d.ts"
import * as esbuild from 'https://deno.land/x/esbuild@v0.19.2/mod.js';
import * as path from 'https://deno.land/std@0.201.0/path/mod.ts';
import { assert, notReached } from '../base/error.ts';
import { retry } from '../base/time.ts';

function getCDNURLForDependency(dep: string): string {
  // return `https://cdn.skypack.dev/${dep}?dts`;
  return `https://esm.sh/${dep}`;
}

export function getRepositoryPath(): string {
  const buildFile = path.fromFileUrl(import.meta.url);
  return path.dirname(path.dirname(buildFile));
}

export function getIndexFilePath(ext = '.tsx'): string {
  const buildFile = path.fromFileUrl(import.meta.url);
  const rootDir = path.dirname(buildFile);
  return path.join(rootDir, 'src', 'index' + ext);
}

function getImportMapPath(): string {
  const buildFile = path.fromFileUrl(import.meta.url);
  const rootDir = path.dirname(path.dirname(buildFile));
  return path.join(rootDir, 'import-map.json');
}

function isPath(str: string): boolean {
  return str.startsWith('/') || str.startsWith('./') || str.startsWith('../');
}

function loaderForFile(str: string): esbuild.Loader {
  if (str.endsWith('.ts')) {
    return 'ts';
  }
  if (str.endsWith('.tsx')) {
    return 'tsx';
  }
  if (str.endsWith('.js') || str.endsWith('.mjs') || str.endsWith('.cjs')) {
    return 'js';
  }
  if (str.endsWith('.jsx')) {
    return 'jsx';
  }
  if (str.endsWith('.json')) {
    return 'json';
  }
  if (str.endsWith('.txt')) {
    return 'text';
  }
  if (str.startsWith('https://')) {
    return 'js';
  }
  notReached(`Unknown loader for file: ${str}`);
}

function baseUrlFromUrl(url: string): string {
  const comps = new URL(url).pathname.split('/');
  if (comps.length > 0) {
    const last = comps[comps.length - 1];
    if (last.includes('.')) {
      url = url.substring(0, url.length - last.length);
    }
  }
  if (url.endsWith('/')) {
    url = url.substring(0, url.length - 1);
  }
  return url;
}

export function createOvvioImportPlugin(dev: boolean): esbuild.Plugin {
  const map = JSON.parse(Deno.readTextFileSync(getImportMapPath())).imports;
  const filter = /.*?/;
  return {
    name: 'ovvio',
    setup(build) {
      build.onResolve({ filter }, async (args) => {
        const importedValue = args.path;
        let url: string | undefined;
        if (map[importedValue]) {
          url = map[importedValue];
        } else if (
          args.importer.startsWith('https://') &&
          isPath(importedValue)
        ) {
          if (importedValue.startsWith('/')) {
            url = `https://${new URL(args.importer).host}${importedValue}`;
          } else {
            url = `${baseUrlFromUrl(args.importer)}/${importedValue}`;
          }
        } else if (importedValue.startsWith('https://')) {
          url = importedValue;
        } else if (!isPath(importedValue)) {
          url = getCDNURLForDependency(importedValue);
        }

        if (typeof url === 'string') {
          const resp = await retry(async () => {
            const r = await fetch(url!);
            assert(r.status === 200, `Failed downloading ${url}`);
            return r;
          }, 5 * 1000);
          return {
            path: resp.url,
            namespace: 'ovvio',
          };
        }
      });
      build.onLoad({ filter, namespace: 'ovvio' }, async (args) => {
        const url = args.path;
        assert(url.startsWith('https://'), 'Unsupported URL');
        const resp = await retry(async () => {
          const r = await fetch(url);
          assert(r.status === 200, `Failed downloading ${url}`);
          return r;
        }, 5 * 1000);
        const text = await resp.text();
        return {
          contents: text,
          loader: loaderForFile(url),
        };
      });
    },
  };
}

export interface BundleResult {
  source: string;
  map: string;
}

export async function bundle(path?: string): Promise<BundleResult> {
  if (!path) {
    path = getIndexFilePath();
  }
  const result = await esbuild.build({
    entryPoints: [path],
    plugins: [createOvvioImportPlugin(true)],
    bundle: true,
    write: false,
    outfile: 'app.js',
    sourcemap: 'linked',
  });
  return bundleResultFromBuildResult(result);
}

function bundleResultFromBuildResult(
  result: esbuild.BuildResult
): BundleResult {
  let source, sourceMap: string;
  for (const file of result.outputFiles!) {
    if (file.path.endsWith('.js')) {
      source = file.text;
    } else if (file.path.endsWith('.js.map')) {
      sourceMap = file.text;
    }
  }
  return {
    source: source!,
    map: sourceMap!,
  };
}

export function stopBackgroundCompiler(): void {
  esbuild.stop();
}

export interface BuildContext {
  rebuild(): Promise<BundleResult>;
  close(): void;
}

export async function createBuildContext(path?: string): Promise<BuildContext> {
  if (!path) {
    path = getIndexFilePath();
  }
  const ctx = await esbuild.context({
    entryPoints: [path],
    plugins: [createOvvioImportPlugin(true)],
    bundle: true,
    write: false,
    outfile: 'app.js',
    sourcemap: 'linked',
  });
  return {
    rebuild: async () => bundleResultFromBuildResult(await ctx.rebuild()),
    close: () => ctx.dispose(),
  };
}
//
// async function main(): Promise<void> {
//   console.log(await bundle(getIndexFilePath()));
//   esbuild.stop();
// }

// main();
