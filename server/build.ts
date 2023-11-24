import yargs from 'yargs';
import { S3Client, PutObjectRequest } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import * as path from 'std/path/mod.ts';
import { defaultAssetsBuild } from './generate-statc-assets.ts';
import { VCurrent } from '../base/version-number.ts';
import { getRepositoryPath } from '../base/development.ts';
import { tuple4ToString } from '../base/tuple.ts';

interface Arguments {
  upload?: boolean;
  deployment?: boolean;
  control?: boolean;
}

type BuildTarget = 'server' | 'control';

async function compressFile(srcPath: string, dstPath: string): Promise<void> {
  const src = await Deno.open(srcPath, { read: true, write: false });
  const dst = await Deno.open(dstPath, {
    read: true,
    write: true,
    create: true,
    truncate: true,
  });
  await src.readable
    .pipeThrough(new CompressionStream('gzip'))
    .pipeTo(dst.writable);
}

async function uploadToS3(uploadPath: string): Promise<void> {
  const file = await Deno.open(uploadPath, { read: true, write: false });
  const client = new S3Client({ region: 'us-east-1' });
  const req: PutObjectRequest = {
    Body: file.readable,
    Bucket: 'ovvio2-release',
    Key: path.basename(uploadPath),
    ACL: 'public-read',
  };
  console.log(`Uploading ${uploadPath} \u{02192} ${req.Bucket}/${req.Key}`);

  const parallelUploads3 = new Upload({
    client: client,
    params: req,
  });

  const dot = new TextEncoder().encode('.');
  parallelUploads3.on('httpUploadProgress', (progress) => {
    Deno.stdout.write(dot);
  });

  await parallelUploads3.done();
  console.log('\nDone');
}

export function outputFileName(
  target: BuildTarget,
  deployment: boolean
): string {
  return `ovvio-${target}-${deployment ? 'linux' : Deno.build.os}`;
}

async function build(
  repoPath: string,
  upload: boolean,
  deployment: boolean,
  target: BuildTarget
): Promise<void> {
  console.log(
    `Generating ${target} executable for ${
      deployment ? 'linux' : Deno.build.os
    }...`
  );
  const fileName = outputFileName(target, deployment);
  const binaryOutputPath = path.join(repoPath, 'build', fileName);
  const compileArgs = [
    'compile',
    '-A',
    '--no-lock',
    '--no-check',
    `--output=${binaryOutputPath}`,
  ];
  if (deployment) {
    compileArgs.push('--target=x86_64-unknown-linux-gnu');
  }
  if (target === 'server') {
    compileArgs.push('--unstable');
    compileArgs.push(path.join(repoPath, 'server', 'run-server.ts'));
  } else {
    compileArgs.push(
      path.join(repoPath, 'server-control', 'server-control.ts')
    );
  }
  const compileLocalCmd = new Deno.Command('deno', {
    args: compileArgs,
  });
  const output = await compileLocalCmd.output();
  if (!output.success) {
    console.log('Build failed');
    return;
  }
  if (upload) {
    const archivePath = fileName + '.gzip';
    await compressFile(binaryOutputPath, archivePath);
    await uploadToS3(archivePath);
  }
}

async function main(): Promise<void> {
  const args: Arguments = yargs(Deno.args)
    .option('upload', {
      type: 'boolean',
      default: false,
      description:
        'Whether or not to upload the resulting binaries to S3 for release',
    })
    .option('deployment', {
      type: 'boolean',
      default: false,
      description: `If supplied, will generate x64 linux build rather than ${Deno.build.os} build`,
    })
    .parse();
  console.log(`Building based on version ${tuple4ToString(VCurrent)}`);
  const repoPath = await getRepositoryPath();
  const buildDirPath = path.join(repoPath, 'build');
  try {
    await Deno.remove(buildDirPath, { recursive: true });
  } catch (_: unknown) {}
  await Deno.mkdir(buildDirPath, { recursive: true });
  const controlBuild = args?.control === true;
  if (!controlBuild) {
    await defaultAssetsBuild();
  }
  await build(
    repoPath,
    args?.upload === true,
    args?.deployment === true,
    controlBuild ? 'control' : 'server'
  );
}

if (import.meta.main) {
  main();
}
