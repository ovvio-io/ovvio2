// @deno-types="https://deno.land/x/esbuild@v0.19.2/mod.d.ts"
import * as esbuild from 'https://deno.land/x/esbuild@v0.19.2/mod.js';
import * as path from 'std/path/mod.ts';
import { assert, notReached } from './base/error.ts';
import { retry } from './base/time.ts';
import { getImportMapPath, getRepositoryPath } from './base/development.ts';

const EXCLUDED_IMPORTS = ['slate', 'slate-react'];

export const kEntryPointsNames = ['web-app', 'org-admin'] as const;
export type EntryPointName = (typeof kEntryPointsNames)[number];
export const EntryPointDefault: EntryPointName = 'web-app';

async function getEntryPoints(): Promise<{ in: string; out: string }[]> {
  const repoPath = await getRepositoryPath();
  return kEntryPointsNames.map((name) => {
    return {
      in: path.join(repoPath, name, 'src', 'index.tsx'),
      out: name,
    };
  });
}

const ENTRY_POINTS = await getEntryPoints();

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

/**
 * This function create and returns an ESBuild plugin that implements Ovvio's
 * build requirements. These include:
 *
 * - Respect our import-map.json.
 *
 * - Match deno's resolving logic for code sharing.
 *
 * - Use fetch() for downloading dependencies, which utilizes the built in HTTP
 *   cache.
 *
 * - Automatically try to resolve unspecific dependencies against
 *   https://esm.sh. This allows us to compile against some old npm-native
 *   packages that have yet to be properly upgraded.
 *
 * @returns An ESBuild plugin.
 */
export async function createOvvioImportPlugin(): Promise<esbuild.Plugin> {
  const map = JSON.parse(
    await Deno.readTextFile(await getImportMapPath())
  ).imports;
  const filter = /.*?/;
  return {
    name: 'ovvio',
    setup(build) {
      build.onResolve({ filter }, async (args) => {
        const importedValue = args.path;
        let url: string = importedValue;

        if (importedValue.startsWith('@') || args.importer.startsWith('@')) {
          return;
        }

        for (const excluded of EXCLUDED_IMPORTS) {
          if (
            importedValue.startsWith(excluded) ||
            args.importer.startsWith(excluded)
          ) {
            return;
          }
        }

        for (const [prefix, replacement] of Object.entries(map)) {
          if (
            prefix.endsWith('/') && // This is a prefix mapping,
            importedValue.startsWith(prefix) && // and a match,
            typeof replacement === 'string' // and we have a replacement
          ) {
            url = replacement + importedValue.substring(prefix.length);
            break;
          }
        }

        if (map[url]) {
          url = map[url];
        } else if (args.importer.startsWith('https://') && isPath(url)) {
          if (url.startsWith('/')) {
            url = `https://${new URL(args.importer).host}${url}`;
          } else {
            url = `${baseUrlFromUrl(args.importer)}/${url}`;
          }
        } else if (!url.startsWith('https://') && !isPath(importedValue)) {
          // url = getCDNURLForDependency(importedValue);
        }

        if (url.startsWith('https://')) {
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

export async function bundle(): Promise<Record<EntryPointName, BundleResult>> {
  const result = await esbuild.build({
    entryPoints: ENTRY_POINTS,
    plugins: [await createOvvioImportPlugin()],
    bundle: true,
    write: false,
    sourcemap: 'linked',
  });
  return bundleResultFromBuildResult(result);
}

function bundleResultFromBuildResult(
  buildResult: esbuild.BuildResult
): Record<EntryPointName, BundleResult> {
  const result = {} as Record<EntryPointName, BundleResult>;
  for (const file of buildResult.outputFiles!) {
    const entryPoint = path.basename(file.path).split('.')[0] as EntryPointName;
    assert(kEntryPointsNames.includes(entryPoint)); // Sanity check
    let bundleResult: BundleResult | undefined = result[entryPoint];
    if (!bundleResult) {
      bundleResult = {} as BundleResult;
      result[entryPoint] = bundleResult;
    }
    if (file.path.endsWith('.js')) {
      bundleResult.source = file.text;
    } else if (file.path.endsWith('.js.map')) {
      bundleResult.map = file.text;
    }
  }
  return result;
}

export function stopBackgroundCompiler(): void {
  esbuild.stop();
}

export interface BuildContext {
  rebuild(): Promise<Record<EntryPointName, BundleResult>>;
  close(): void;
}

export async function createBuildContext(): Promise<BuildContext> {
  const ctx = await esbuild.context({
    entryPoints: ENTRY_POINTS,
    plugins: [await createOvvioImportPlugin()],
    bundle: true,
    write: false,
    sourcemap: 'linked',
    outdir: 'output',
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
