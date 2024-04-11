import * as path from 'std/path/mod.ts';
import { encodeBase64Url } from 'std/encoding/base64url.ts';
import { kSecondMs } from '../base/date.ts';
import { sleep } from '../base/time.ts';
import { EC2MetadataToken, getTenantId } from './ec2.ts';
import { tuple4ToString } from '../base/tuple.ts';
import { VCurrent } from '../base/version-number.ts';
import { ReadonlyJSONObject } from '../base/interfaces.ts';
import { BuildTarget } from '../server/build.ts';
import { HealthChecker } from './health-check.ts';
import { isDevelopmentBuild } from '../base/development.ts';

const UNHEALTHY_CHECK_COUNT = 20;
const HEALTH_CHECK_FREQ_MS = 3 * kSecondMs;
const CHECK_UPDATED_INTERVAL_MS = 5 * kSecondMs;
const SERVER_STARTUP_TIMEOUT_MS = kSecondMs;

const ALPHA_TENANTS = ['localhost', 'sandbox'];
const BETA_TENANTS = ['ovvio'];

const ec2MetadataToken = new EC2MetadataToken();

async function getArchiveURL(target: BuildTarget): Promise<string> {
  const tenantId = isDevelopmentBuild()
    ? 'localhost'
    : await getTenantId(ec2MetadataToken);
  let channel = '';
  if (tenantId) {
    if (ALPHA_TENANTS.includes(tenantId)) {
      channel = '-alpha';
    } else if (BETA_TENANTS.includes(tenantId)) {
      channel = '-beta';
    }
  }
  return `https://ovvio2-release.s3.amazonaws.com/ovvio-${target}-${Deno.build.os}${channel}.gz`;
}

async function getServerSettingsURL(): Promise<string | undefined> {
  const tenantId = await getTenantId(ec2MetadataToken);
  if (!tenantId) {
    return undefined;
  }
  return `https://ovvio2-release.s3.amazonaws.com/settings-${tenantId}.json`;
}

interface ServerControlSettings {
  serverBinaryDir: string;
  dataDir: string;
}

function getControlSettings(): ServerControlSettings {
  const dir = path.dirname(getScriptPath());
  return {
    serverBinaryDir: dir,
    dataDir: path.join(dir, 'serverdata'),
  };
}

async function decompressFile(srcPath: string, dstPath: string): Promise<void> {
  const src = await Deno.open(srcPath, { read: true, write: false });
  const dst = await Deno.open(dstPath, {
    read: true,
    write: true,
    create: true,
    truncate: true,
  });
  await src.readable
    .pipeThrough(new DecompressionStream('gzip'))
    .pipeTo(dst.writable);
}

/**
 * Given a port number, this function looks for a process that's currently
 * listening on it.
 *
 * @param port The port to look for.
 * @returns A PID, or -1 if no process is listening on this port.
 */
async function processIdForPort(port: number): Promise<number> {
  const cmd = new Deno.Command('lsof', {
    args: ['-F', 'p', `-i:${port}`],
  });
  const output = await cmd.output();
  const decoder = new TextDecoder();
  const outputStr = decoder.decode(output.stdout);
  for (const line of outputStr.split('\n')) {
    if (line[0] === 'p') {
      return parseInt(line.substring(1));
    }
  }
  return -1;
}

function filenameFromURL(url: string, suffix?: string): string {
  return path.basename(new URL(url).pathname, suffix);
}

async function _startChildServerProcess(
  settings: ServerControlSettings,
  idx: number,
  count: number,
  replicas: string[],
): Promise<Deno.ChildProcess | undefined> {
  // We match the port to the index of the process
  const port = 9000 + idx;
  // Kill any zombies that may be left listening on this port
  const existingPid = await processIdForPort(port);
  if (existingPid !== -1) {
    console.log(
      `Killing zombie process (pid ${existingPid}) listening on port ${port}`,
    );
    Deno.kill(existingPid, 'SIGKILL');
  }
  // Start the server process
  const binaryFileName = filenameFromURL(await getArchiveURL('server'), '.gz');
  const args = [
    '-n',
    '3',
    path.join(settings.serverBinaryDir, binaryFileName),
    '--silent',
    `--port=${port}`,
    `--serverId=${idx}`,
    `--pool=${idx}:${count}`,
    '-d',
    settings.dataDir,
  ];
  // if (replicas) {
  //   // if (idx !== 0) {
  //   //   args.push('--follower');
  //   // }
  //   args.push('--b64replicas');
  //   const encodedReplicas = encodeBase64Url(JSON.stringify(replicas || []));
  //   args.push(encodedReplicas);
  // }
  const cmd = new Deno.Command('nice', {
    args,
    stdout: 'piped',
  });
  const child = cmd.spawn();
  // child.ref();
  console.log(`Server started on port ${port}. Waiting for it to boot...`);
  const stdoutReader = child.stdout.getReader();
  // Wait for the server to ack its startup
  const decoder = new TextDecoder();
  const startTime = performance.now();
  let success = false;
  while (performance.now() - startTime <= SERVER_STARTUP_TIMEOUT_MS) {
    const output = await stdoutReader.read();
    const value = decoder.decode(output.value);
    if (output.value && value.startsWith('STARTED')) {
      success = true;
      break;
    }
    await sleep(50);
  }
  stdoutReader.read().then((output) => {
    console.log(decoder.decode(output.value));
  });
  // stdoutReader.cancel();
  if (!success) {
    console.log(`ERROR: Server didn't start properly.`);
    return undefined;
  }
  console.log(`Server successfully started on port ${port}`);
  // Health check for this process
  const healthChecker = new HealthChecker(
    `http://localhost:${port}/healthy`,
    HEALTH_CHECK_FREQ_MS,
    () => {
      console.log(`Server failed health check on port ${port}. Killing...`);
      child.kill('SIGKILL');
    },
    UNHEALTHY_CHECK_COUNT,
  );
  // Cleanup on process termination
  child.status.finally(() => {
    healthChecker.stop();
  });
  return child;
}

async function startServerProcesses(
  settings: ServerControlSettings,
): Promise<(Deno.ChildProcess | undefined)[]> {
  const serverProcesses: (Deno.ChildProcess | undefined)[] = [];
  const processCount = 1; // + Math.round(navigator.hardwareConcurrency * 1.5);
  for (let i = 0; i < processCount; ++i) {
    const replicas: string[] = [];
    // for (let x = 0; x < processCount; ++x) {
    //   if (x !== i) {
    //     replicas.push(`http://localhost:${9000 + x}`);
    //   }
    // }
    const terminationCallback = async (status: Deno.CommandStatus) => {
      if (status.code !== 0) {
        console.log('Restarting crashed server');
        const child = await _startChildServerProcess(
          settings,
          i,
          processCount,
          replicas,
        );
        serverProcesses[i] = child;
        if (child) {
          child.status.then(terminationCallback);
        }
      }
    };
    const child = await _startChildServerProcess(
      settings,
      i,
      processCount,
      replicas,
    );
    if (child) {
      child.status.then(terminationCallback);
    }
    serverProcesses.push(child);
    await sleep(1 * kSecondMs);
  }
  return serverProcesses;
}

async function verifyBuffer(
  buffer: Uint8Array,
  expectedChecksum: Uint8Array,
): Promise<boolean> {
  const actualChecksum = new Uint8Array(
    await crypto.subtle.digest('SHA-512', buffer),
  );
  if (actualChecksum.length !== expectedChecksum.length) {
    console.log(
      `Checksums differ in length: expected ${expectedChecksum.length} got ${actualChecksum.length}`,
    );
    return false;
  }
  const len = actualChecksum.length;
  for (let i = 0; i < len; ++i) {
    if (actualChecksum.at(i) !== expectedChecksum.at(i)) {
      console.log(`Checksums differ at byte ${i}`);
      return false;
    }
  }
  return true;
}

/**
 * Attempts to update a local binary from a remote zip archive.
 *
 * @param archiveURL A URL for the zip archive.
 * @param outputDir Output directory for the zip and resulting binary.
 *                  Will be automatically created if not exists.
 *
 * @returns true if the binary had been successfully updated, false otherwise.
 */
async function updateBinary(
  archiveURL: string,
  outputDir: string,
): Promise<boolean> {
  try {
    await Deno.mkdir(outputDir, { recursive: true });
    console.log(`Fetching checksum from ${archiveURL}.sha512...`);
    const checksumResp = await fetch(archiveURL + '.sha512');
    if (checksumResp.status !== 200) {
      console.log(`Checksum fetch failed with status ${checksumResp.status}`);
      return false;
    }
    const checksum = new Uint8Array(await checksumResp.arrayBuffer());
    const binaryFileName = filenameFromURL(archiveURL, '.gz');
    const serverBinaryPath = path.join(outputDir, binaryFileName);
    const etagFilePath = serverBinaryPath + '.etag';
    let requestInit: RequestInit | undefined;
    try {
      const etag = await Deno.readTextFile(etagFilePath);
      if (typeof etag === 'string' && etag.length > 0) {
        requestInit = {
          headers: {
            'If-None-Match': etag,
          },
        };
      }
    } catch (_: unknown) {}
    console.log(`Checking for updated value at ${archiveURL}...`);
    const resp = await fetch(archiveURL, requestInit);
    if (resp.status === 304) {
      console.log(`ETag matched. Nothing to do.`);
      return false;
    }
    if (resp.status !== 200) {
      console.log(`Fetch failed with status ${resp.status}`);
      return false;
    }
    const buff = new Uint8Array(await resp.arrayBuffer());
    if (!(await verifyBuffer(buff, checksum))) {
      console.log(`Checksum did not match for downloaded binary. Aborting.`);
      return false;
    }
    console.log(`Checksum matched. Proceeding with the update.`);
    // TODO: Take an EBS snapshot before proceeding with server update
    const archivePath = serverBinaryPath + '.gz';
    await Deno.writeFile(archivePath, buff);
    console.log(`Updated archive written to ${archivePath}`);
    await Deno.writeFile(archivePath + '.sha512', checksum);
    console.log(`Updated checksum written to ${archivePath}.sha512`);

    console.log(
      `Decompressing ${archivePath} into ${serverBinaryPath}.tmp ...`,
    );
    await decompressFile(archivePath, serverBinaryPath + '.tmp');
    await Deno.chmod(serverBinaryPath + '.tmp', 0o555);
    try {
      await Deno.remove(serverBinaryPath, { recursive: true });
    } catch (_: unknown) {}
    await Deno.rename(serverBinaryPath + '.tmp', serverBinaryPath);
    console.log(`Writing updated ETag...`);
    const etag = resp.headers.get('etag');
    if (typeof etag === 'string' && etag.length > 0) {
      await Deno.writeTextFile(etagFilePath, etag);
    } else {
      console.log(`Error: ETag file update failed.`);
      try {
        await Deno.remove(etagFilePath, { recursive: true });
      } catch (_: unknown) {}
    }
    const alphaBinary = serverBinaryPath.endsWith('-alpha');
    const betaBinary = serverBinaryPath.endsWith('-beta');
    if (alphaBinary || betaBinary) {
      const suffix = alphaBinary ? '-alpha' : '-beta';
      const binaryLinkTarget = serverBinaryPath.substring(
        0,
        serverBinaryPath.length - suffix.length,
      );
      try {
        await Deno.remove(binaryLinkTarget, { recursive: true });
      } catch (_: unknown) {}
      await Deno.symlink(serverBinaryPath, binaryLinkTarget);
    }
    return true;
  } catch (err: unknown) {
    console.log(err);
    debugger;
  }
  return false;
}

/**
 * Updates the server binary. Upon success, terminates all existing servers and
 * replaces them with updated ones.
 */
async function updateServerBinary(
  settings: ServerControlSettings,
  childProcesses: (Deno.ChildProcess | undefined)[] = [],
): Promise<(Deno.ChildProcess | undefined)[]> {
  const success = await updateBinary(
    await getArchiveURL('server'),
    settings.serverBinaryDir,
  );
  if (success) {
    // Try to stop all existing processes gracefully
    childProcesses.forEach((child) => {
      try {
        if (child) {
          child.kill('SIGTERM');
        }
      } catch (_: unknown) {}
    });
    // Give them a short delay to actually exit cleanly
    await sleep(kSecondMs);
    // Proceed with launching the new version (forcefully killing any running
    // old servers).
    return await startServerProcesses(settings);
  }
  // Even on failure, we expect a number of servers to be up and running
  return childProcesses.length > 0
    ? childProcesses
    : await startServerProcesses(settings);
}

/**
 * Returns the path to the executing script if running using `deno run ...`
 * command, or the path to the executable when running from a compiled binary.
 *
 * @returns A full path to this script's "file".
 */
function getScriptPath(): string {
  const execPath = Deno.execPath();
  if (path.basename(execPath) === 'deno') {
    return filenameFromURL(import.meta.url);
  }
  return execPath;
}

async function updateControlBinary(): Promise<void> {
  const workingDir = path.dirname(getScriptPath());
  const success = await updateBinary(
    await getArchiveURL('control'),
    workingDir,
  );
  if (success) {
    console.log(
      'Control binary successfully updated. Exiting and letting systemd restart the updated binary...',
    );
    Deno.exit(0);
  }
}

/**
 * Updates the settings file for server. Servers are watching this file and
 * automatically pick up any changes made to it.
 *
 * @param url The url to download the settings json from.
 * @param localPath Where to store the updated settings.
 */
async function updateJSONFile(
  url: string,
  localPath: string,
  localFileName?: string,
): Promise<boolean> {
  try {
    const jsonFilePath = path.join(
      localPath,
      localFileName || filenameFromURL(url),
    );
    const etagFilePath = jsonFilePath + '.etag';
    let requestInit: RequestInit | undefined;
    try {
      const etag = await Deno.readTextFile(etagFilePath);
      if (typeof etag === 'string' && etag.length > 0) {
        requestInit = {
          headers: {
            'If-None-Match': etag,
          },
        };
      }
    } catch (_: unknown) {}
    console.log(`Checking for updated value at ${url}...`);
    const resp = await fetch(url, requestInit);
    if (resp.status === 304) {
      console.log(`ETag matched. Nothing to do.`);
      return false;
    }
    if (resp.status !== 200) {
      console.log(`Fetch failed with status ${resp.status}`);
      return false;
    }
    const updatedJSON = await resp.json();
    let existingJSONData: ReadonlyJSONObject = {};
    try {
      existingJSONData = JSON.parse(await Deno.readTextFile(jsonFilePath));
    } catch (_: unknown) {}
    await Deno.writeTextFile(
      jsonFilePath,
      JSON.stringify({ ...existingJSONData, ...updatedJSON }),
    );
    console.log(`Updated JSON file at ${jsonFilePath}`);
    const etag = resp.headers.get('etag');
    if (typeof etag === 'string' && etag.length > 0) {
      await Deno.writeTextFile(etagFilePath, etag);
      console.log(`Updated ETag at ${etagFilePath}`);
    } else {
      console.log(`ETag update failed at ${etagFilePath}`);
      try {
        await Deno.remove(etagFilePath, { recursive: true });
      } catch (_: unknown) {}
    }
    return true;
  } catch (err: unknown) {
    console.log(err);
  }
  return false;
}

async function main(): Promise<void> {
  console.log(`Ovvio Control v${tuple4ToString(VCurrent)} started`);
  const settings = getControlSettings();
  await Deno.mkdir(settings.dataDir, { recursive: true });
  await updateControlBinary();
  let serverSettingsURL = await getServerSettingsURL();
  if (serverSettingsURL) {
    await updateJSONFile(serverSettingsURL, settings.dataDir, 'settings.json');
  }
  let childProcesses = await updateServerBinary(settings);
  let updateInProgress = false;
  const updateLoop = async () => {
    if (updateInProgress) {
      return;
    }
    updateInProgress = true;
    await updateControlBinary();
    if (!serverSettingsURL) {
      serverSettingsURL = await getServerSettingsURL();
    }
    if (serverSettingsURL) {
      await updateJSONFile(
        serverSettingsURL,
        settings.dataDir,
        'settings.json',
      );
    }
    childProcesses = await updateServerBinary(settings, childProcesses);
    updateInProgress = false;
    setTimeout(updateLoop, CHECK_UPDATED_INTERVAL_MS);
  };
  setTimeout(updateLoop, CHECK_UPDATED_INTERVAL_MS);
}

main();
