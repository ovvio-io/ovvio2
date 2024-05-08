import yargs from 'yargs';
import * as path from 'std/path/mod.ts';
import { SimpleTimer } from '../base/timer.ts';
import { tuple4Get, tuple4Set } from '../base/tuple.ts';
import { VersionNumber } from '../base/version-number.ts';
import { createBuildContext } from '../build.ts';
import { getOvvioConfig } from './config.ts';
import { Server } from '../net/server/server.ts';
import { getRepositoryPath } from '../base/development.ts';
import { buildAssets } from './generate-statc-assets.ts';

interface Arguments {
  org?: string;
  localhost?: string;
}

function incrementBuildNumber(version: VersionNumber): VersionNumber {
  return tuple4Set(version, 0, tuple4Get(version, 0) + 1);
}

function shouldRebuildAfterPathChange(p: string): boolean {
  const name = path.basename(p);
  if (name.startsWith('.') || p.startsWith('.')) {
    return false;
  }
  if (p.startsWith('node_modules/')) {
    return false;
  }
  if (p.includes('.git/')) {
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
  const args: Arguments = yargs(Deno.args)
    .version(false)
    .option('org', {
      description:
        'The organization id to connect to. Connects to local server if not provided (default).',
    })
    .option('localhost', {
      description: 'Remap localhost to the specified organization id.',
    })
    .parse();
  console.log('Starting web-app bundling...');
  const ctx = await createBuildContext();
  Deno.addSignalListener('SIGTERM', () => {
    ctx.close();
  });
  const serverURL = args.org ? `https://${args.org}.ovvio.io` : undefined;
  const watcher = Deno.watchFs(await getRepositoryPath());
  const server = new Server(undefined, undefined, undefined, args.localhost);
  const orgId = args.localhost || 'localhost';
  await server.setup();
  (await server.servicesForOrganization(orgId)).staticAssets =
    await buildAssets(ctx, getOvvioConfig().version, serverURL, args.localhost);
  await server.start();
  openBrowser();
  const rebuildTimer = new SimpleTimer(300, false, async () => {
    console.log('Changes detected. Rebuilding static assets...');
    try {
      const config = getOvvioConfig();
      const version =
        serverURL === undefined
          ? incrementBuildNumber(config.version)
          : config.version;
      (await server.servicesForOrganization(orgId)).staticAssets =
        await buildAssets(ctx, version, serverURL, args.localhost);
      config.version = version;
      console.log('Static assets updated.');
      if (serverURL !== undefined) {
        console.log(
          `NOTICE: Automatic reload disabled when the --org flag is provided.`,
        );
      }
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
}

main();
