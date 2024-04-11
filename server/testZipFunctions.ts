import {
  S3Client,
  PutObjectCommand,
  PutObjectRequest,
} from 'npm:@aws-sdk/client-s3';
import * as path from 'std/path/mod.ts';

async function uploadToS3(uploadPath: string): Promise<void> {
  const file = await Deno.open(uploadPath, { read: true });
  const fileSize = (await file.stat()).size;
  const buffer = new Uint8Array(fileSize);
  await file.read(buffer);
  await file.close();

  const client = new S3Client({ region: 'il-central-1' });
  const req: PutObjectRequest = {
    Body: buffer,
    Bucket: 'amit-loyal',
    Key: path.basename(uploadPath),
    ACL: 'public-read',
    ContentType: 'application/zip', // universally recognized for ZIP files,
  };

  console.log(`Uploading ${uploadPath} \u{02192} ${req.Bucket}/${req.Key}`);

  try {
    const command = new PutObjectCommand(req);
    const response = await client.send(command);
    console.log('Upload success:', response);
  } catch (error) {
    console.error('Upload failed:', error);
  }

  console.log('\nDone');
}

async function zipPath(src: string, dst: string): Promise<boolean> {
  const command = new Deno.Command('zip', {
    args: ['-r', dst, src],
    stderr: 'piped',
  });

  const process = await command.spawn();
  const stderrReader = process.stderr?.getReader();
  const decoder = new TextDecoder();
  let errorOutput = '';

  if (stderrReader) {
    while (true) {
      const { done, value } = await stderrReader.read();
      if (done) break;
      errorOutput += decoder.decode(value);
    }
  }

  const status = await process.status;
  if (status.success) {
    console.log('Zip process succeeded');
    return true;
  } else {
    console.error('Zip process failed:', errorOutput);
    return false;
  }
}

// async function testZip() {
//   const src = 'server/build-info.ts';
//   const dst = 'server/data-backup.zip';
//   try {
//     const result = await zipPath(src, dst);
//     if (result) {
//       console.log('Compression successful!');
//     } else {
//       console.error('Compression failed');
//     }
//   } catch (error) {
//     console.error('Error during compression:', error);
//   }
// }

// testZip();

async function unzipPath(src: string, dst: string): Promise<boolean> {
  const command = new Deno.Command('unzip', {
    args: [src, '-d', dst],
    stderr: 'piped',
  });

  const process = await command.spawn();
  const stderrReader = process.stderr?.getReader();
  const decoder = new TextDecoder();
  let errorOutput = '';

  if (stderrReader) {
    while (true) {
      const { done, value } = await stderrReader.read();
      if (done) break;
      errorOutput += decoder.decode(value);
    }
  }

  const status = await process.status;
  if (status.success) {
    console.log('Unzip process succeeded');
    return true;
  } else {
    console.error('Unzip process failed:', errorOutput);
    return false;
  }
}

// async function testUnzip() {
//   const src = 'server/data-backup.zip';
//   const dst = 'server/unzipped';
//   try {
//     const result = await unzipPath(src, dst);
//     if (result) {
//       console.log('Uncompression successful!');
//     } else {
//       console.error('Uncompression failed');
//     }
//   } catch (error) {
//     console.error('Error during uncompression:', error);
//   }
// }

// testUnzip();

async function main() {
  const action = Deno.args[0];
  const src = Deno.args[1];
  const dst = Deno.args[2];

  if (action === 'zip' && src && dst) {
    await zipPath(src, dst);
  } else if (action === 'unzip' && src && dst) {
    await unzipPath(src, dst);
  } else {
    console.log('Invalid arguments.');
  }
}

main();
