// @deno-types="https://deno.land/x/esbuild@v0.19.2/mod.d.ts"
import * as esbuild from 'esbuild';
import * as path from 'std/path/mod.ts';
import { getRepositoryPath } from '../base/development.ts';
import { VCurrent, VersionNumber } from '../base/version-number.ts';
import {
  ReBuildContext,
  isReBuildContext,
  kEntryPointsNames,
  ENTRY_POINTS,
  createOvvioImportPlugin,
  bundleResultFromBuildResult,
} from '../build.ts';
import {
  StaticAssets,
  compileAssetsDirectory,
  staticAssetsToJS,
} from '../net/server/static-assets.ts';
import { getOvvioConfig } from './config.ts';

function generateConfigSnippet(version: VersionNumber): string {
  const config = getOvvioConfig();
  const res = `;\n\rwindow.OvvioConfig = ${JSON.stringify({
    ...config,
    debug: true,
    version,
  })};`;
  return res;
}

export async function buildAssets(
  ctx: ReBuildContext | typeof esbuild,
  version: VersionNumber
): Promise<StaticAssets> {
  const buildResults = await (isReBuildContext(ctx)
    ? ctx.rebuild()
    : bundleResultFromBuildResult(
        await ctx.build({
          entryPoints: ENTRY_POINTS,
          plugins: [await createOvvioImportPlugin()],
          bundle: true,
          write: false,
          sourcemap: 'linked',
          outdir: 'output',
        })
      ));

  const repoPath = await getRepositoryPath();
  const result = {} as StaticAssets;
  const textEncoder = new TextEncoder();
  for (const ep of kEntryPointsNames) {
    const { source, map } = buildResults[ep];
    const assets = await compileAssetsDirectory(
      path.join(repoPath, 'assets'),
      path.join(repoPath, ep, 'assets')
    );
    assets['/app.js'] = {
      data: textEncoder.encode(generateConfigSnippet(version) + source),
      contentType: 'text/javascript',
    };
    assets['/app.js.map'] = {
      data: textEncoder.encode(map),
      contentType: 'application/json',
    };
    assets['/index.html'] = {
      data: await Deno.readFile(path.join(repoPath, ep, 'src', 'index.html')),
      contentType: 'text/html',
    };
    assets['/index.css'] = {
      data: await Deno.readFile(path.join(repoPath, ep, 'src', 'index.css')),
      contentType: 'text/css',
    };
    result[ep] = assets;
  }
  return result;
}

export async function defaultAssetsBuild(): Promise<void> {
  const repoPath = await getRepositoryPath();
  await Deno.mkdir(path.join(repoPath, 'build'), { recursive: true });

  console.log('Bundling client code...');
  const assets = await buildAssets(esbuild, VCurrent);
  await Deno.writeTextFile(
    path.join(repoPath, 'build', 'staticAssets.json'),
    JSON.stringify(staticAssetsToJS(assets))
  );
  esbuild.stop();
}

if (import.meta.main) {
  defaultAssetsBuild();
}
