import yargs from 'yargs';
import {
  PutObjectCommand,
  PutObjectRequest,
  S3Client,
} from 'npm:@aws-sdk/client-s3';
import { Upload } from 'npm:@aws-sdk/lib-storage';
import * as path from 'std/path/mod.ts';
import { defaultAssetsBuild } from './generate-statc-assets.ts';
import { VCurrent } from '../base/version-number.ts';
import { getRepositoryPath } from '../base/development.ts';
import { tuple4ToString } from '../base/tuple.ts';

interface Arguments {
  upload?: boolean;
  linux?: boolean;
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
    ContentType: 'application/octet-stream',
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

async function putS3Object(uploadPath: string): Promise<boolean> {
  const file = await Deno.readFile(uploadPath);
  const client = new S3Client({ region: 'us-east-1' });
  const req: PutObjectRequest = {
    Body: file,
    Bucket: 'ovvio2-release',
    Key: path.basename(uploadPath),
    ACL: 'public-read',
  };
  console.log(
    `Uploading atomically ${uploadPath} \u{02192} ${req.Bucket}/${req.Key}`,
  );
  const resp = await client.send(new PutObjectCommand(req));
  return resp.ETag !== undefined && resp.ETag.length > 0;
}

export function outputFileName(
  target: BuildTarget,
  deployment: boolean,
): string {
  return `ovvio-${target}-${deployment ? 'linux' : Deno.build.os}`;
}

async function hashFile(
  inputFilePath: string,
  outputFilePath?: string,
): Promise<void> {
  const file = await Deno.readFile(inputFilePath);
  console.log(`Generating SHA-512 checksum for ${inputFilePath}...`);
  const checksum = await crypto.subtle.digest('SHA-512', file);
  if (outputFilePath === undefined) {
    outputFilePath = inputFilePath + '.sha512';
  }
  try {
    await Deno.remove(outputFilePath, { recursive: true });
  } catch (_: unknown) {}
  await Deno.writeFile(outputFilePath, new Uint8Array(checksum));
  console.log(`Checksum written successfully to ${outputFilePath}`);
}

async function build(
  repoPath: string,
  upload: boolean,
  linux: boolean,
  target: BuildTarget,
): Promise<void> {
  console.log(
    `Generating ${target} executable for ${linux ? 'linux' : Deno.build.os}...`,
  );
  const fileName = outputFileName(target, linux);
  const outputDir = path.join(repoPath, 'build');
  const binaryOutputPath = path.join(outputDir, fileName);
  Deno.chdir(repoPath);
  const compileArgs = [
    'compile',
    '-A',
    '--no-lock',
    '--no-check',
    `--output=${binaryOutputPath}`,
    '--include',
    path.join('.', 'server', 'sqlite3-worker.ts'),
  ];
  if (linux) {
    compileArgs.push('--target=x86_64-unknown-linux-gnu');
  }
  if (target === 'server') {
    compileArgs.push('--unstable');
    compileArgs.push(path.join(repoPath, 'server', 'run-server.ts'));
  } else {
    compileArgs.push(
      path.join(repoPath, 'server-control', 'server-control.ts'),
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
    const archivePath = path.join(outputDir, fileName + '.gz');
    await compressFile(binaryOutputPath, archivePath);
    await hashFile(archivePath);
    await uploadToS3(archivePath);
    await putS3Object(archivePath + '.sha512');
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
    .option('linux', {
      type: 'boolean',
      default: false,
      description:
        `If supplied, will generate x64 linux build rather than ${Deno.build.os} build`,
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
    args?.linux === true,
    controlBuild ? 'control' : 'server',
  );
}

if (import.meta.main) {
  main();
}
