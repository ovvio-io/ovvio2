import { SimpleTimer } from '../base/timer.ts';
import {
  VersionNumber,
  versionNumberDeleteBuild,
  versionNumberGetBuild,
  versionNumberSetBuild,
} from '../defs.ts';
import { Server, StaticAssets } from '../net/server.ts';
import {
  BuildContext,
  createBuildContext,
  getIndexFilePath,
  getRepositoryPath,
} from '../web-app/build.ts';
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

async function rebuildAssets(
  ctx: BuildContext,
  version: VersionNumber
): Promise<StaticAssets> {
  const { source, map } = await ctx.rebuild();
  return {
    js: generateConfigSnippet(version) + source,
    sourceMap: map,
    html: await Deno.readTextFile(getIndexFilePath('.html')),
    css: await Deno.readTextFile(getIndexFilePath('.css')),
  };
}

function incrementBuildNumber(version: VersionNumber): VersionNumber {
  return versionNumberSetBuild(
    versionNumberDeleteBuild(version),
    versionNumberGetBuild(version) + 1
  );
}

async function main(): Promise<void> {
  console.log('Starting web-app bundling...');
  const ctx = await createBuildContext();
  const watcher = Deno.watchFs(getRepositoryPath());
  const server = new Server(
    undefined,
    await rebuildAssets(ctx, getOvvioConfig().version)
  );
  server.run();
  const rebuildTimer = new SimpleTimer(300, false, async () => {
    console.log('Changes detected. Rebuilding static assets...');
    try {
      const config = getOvvioConfig();
      const version = incrementBuildNumber(config.version);
      server.staticAssets = await rebuildAssets(ctx, version);
      config.version = version;
      console.log('Static assets updated.');
    } catch (e) {
      console.error('Build failed. Will try again on next save.');
    }
  });
  for await (const event of watcher) {
    rebuildTimer.schedule();
  }
  ctx.close();
}

main();
