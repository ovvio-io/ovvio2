import * as path from 'std/path/mod.ts';
import { SimpleTimer } from '../base/timer.ts';
import { tuple4Get, tuple4Set } from '../base/tuple.ts';
import { VersionNumber } from '../base/version-number.ts';
import {
  BuildContext,
  createBuildContext,
  getIndexFilePath,
  getRepositoryPath,
} from '../web-app/build.ts';
import { getOvvioConfig } from './config.ts';
import { Server } from '../net/server/server.ts';
import { StaticAssets } from '../net/server/static-assets.ts';

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
  return tuple4Set(version, 0, tuple4Get(version, 0) + 1);
}

function shouldRebuildAfterPathChange(p: string): boolean {
  const name = path.basename(p);
  if (name.startsWith('.')) {
    return false;
  }
  if (p.startsWith('node_modules/')) {
    return false;
  }
  return true;
}

async function openBrowser(): Promise<void> {
  if (Deno.build.os !== 'darwin') {
    return Promise.resolve();
  }
  const cmd = new Deno.Command('open', {
    args: [
      '-na',
      'Google Chrome',
      '--args',
      '--incognito',
      'http://localhost:8080',
    ],
  });
  const { success, code } = await cmd.output();
  if (!success) {
    console.error(`Failed opening google chrome. Code: ${code}`);
  }
}

async function main(): Promise<void> {
  console.log('Starting web-app bundling...');
  const ctx = await createBuildContext();
  const watcher = Deno.watchFs(getRepositoryPath());
  const server = new Server();
  await server.setupServer();
  server.service('staticAssets').value = await rebuildAssets(
    ctx,
    getOvvioConfig().version
  );
  await server.start();
  openBrowser();
  const rebuildTimer = new SimpleTimer(300, false, async () => {
    console.log('Changes detected. Rebuilding static assets...');
    try {
      const config = getOvvioConfig();
      const version = incrementBuildNumber(config.version);
      server.service('staticAssets').value = await rebuildAssets(ctx, version);
      config.version = version;
      console.log('Static assets updated.');
    } catch (e) {
      console.error('Build failed. Will try again on next save.');
    }
  });
  for await (const event of watcher) {
    for (const p of event.paths) {
      if (shouldRebuildAfterPathChange(p)) {
        rebuildTimer.schedule();
      }
    }
  }
  await server.stop();
  ctx.close();
}

main();
