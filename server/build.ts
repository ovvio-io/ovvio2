// @deno-types="https://deno.land/x/esbuild@v0.19.2/mod.d.ts"
import * as esbuild from 'esbuild';
import * as path from 'std/path/mod.ts';
import { defaultAssetsBuild } from './generate-statc-assets.ts';
import { VCurrent } from '../base/version-number.ts';
import { getRepositoryPath } from '../base/development.ts';
import { tuple4ToString } from '../base/tuple.ts';

async function main(): Promise<void> {
  const repoPath = await getRepositoryPath();
  const buildDirPath = path.join(repoPath, 'build');
  await Deno.remove(buildDirPath, { recursive: true });
  await Deno.mkdir(buildDirPath, { recursive: true });
  await defaultAssetsBuild();
  console.log('Generating executable for local OS...');
  const compileLocalCmd = new Deno.Command('deno', {
    args: [
      'compile',
      '--unstable',
      '-A',
      '--no-check',
      '--no-lock',
      `--output=${path.join(
        repoPath,
        'build',
        `ovvio_${Deno.build.arch}_${Deno.build.os}_${tuple4ToString(VCurrent)}`
      )}`,
      path.join(repoPath, 'server', 'run-server.ts'),
    ],
  });
  await compileLocalCmd.output();
  if (Deno.build.os !== 'linux' || Deno.build.arch !== 'aarch64') {
    console.log('Generating x64 linux build for server deployment...');
    const outputPath = path.join(
      repoPath,
      'build',
      `ovvio_x64_linux_${tuple4ToString(VCurrent)}`
    );
    const compileServerCmd = new Deno.Command('deno', {
      args: [
        'compile',
        '--unstable',
        '-A',
        '--no-check',
        '--no-lock',
        '--target=x86_64-unknown-linux-gnu',
        `--output=${outputPath}`,
        path.join(repoPath, 'server', 'run-server.ts'),
      ],
    });
    await compileServerCmd.output();
  }
}

main();
