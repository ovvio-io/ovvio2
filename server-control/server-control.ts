import * as path from 'std/path/mod.ts';
import { kSecondMs } from '../base/date.ts';
import { JSONObject } from '../base/interfaces.ts';
import { sleep } from '../base/time.ts';

const UNHEALTHY_CHECK_COUNT = 5;
const HEALTH_CHECK_FREQ_MS = kSecondMs;

interface ServerControlSettings extends JSONObject {
  serverArchiveURL: string;
  serverBinaryDir: string;
  dataDir: string;
  controlArchiveURL: string;
  serverSettingsURL?: string;
  controlSettingsURL?: string;
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
    .pipeThrough(new CompressionStream('gzip'))
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
  idx: number
): Promise<Deno.ChildProcess> {
  // We match the port to the index of the process
  const port = 9000 + idx;
  // Kill any zombies that may be left listening on this port
  const existingPid = await processIdForPort(port);
  if (existingPid !== -1) {
    console.log(
      `Killing zombie proccess (pid ${existingPid}) listening on port ${port}`
    );
    Deno.kill(existingPid, 'SIGKILL');
  }
  // Start the server process
  const binaryFileName = filenameFromURL(settings.serverArchiveURL, '.gzip');
  const cmd = new Deno.Command(
    path.join(settings.serverBinaryDir, binaryFileName),
    {
      args: ['--silent', `--port=${port}`, '-d', settings.dataDir],
      stdout: 'piped',
    }
  );
  const child = cmd.spawn();
  // child.ref();
  console.log(`Server started on port ${port}. Waiting for it to boot...`);
  const stdoutReader = child.stdout.getReader();
  // Wait for the server to ack its startup
  const decoder = new TextDecoder();
  while (true) {
    const output = await stdoutReader.read();
    const value = decoder.decode(output.value);
    if (output.value && value.startsWith('STARTED')) {
      break;
    }
  }
  stdoutReader.cancel();
  console.log(`Server successfully started on port ${port}`);
  // Health check for this process
  let failureCount = 0;
  const intervalId = setInterval(async () => {
    try {
      const resp = await fetch(`http://localhost:${port}/healthy`);
      if (resp.status !== 200) {
        if (++failureCount === UNHEALTHY_CHECK_COUNT) {
          console.log(`Server failed health check on port ${port}. Killing...`);
          child.kill('SIGKILL');
        }
      } else {
        failureCount = 0;
      }
    } catch (_err: unknown) {
      if (++failureCount === UNHEALTHY_CHECK_COUNT) {
        console.log(`Server failed health check on port ${port}. Killing...`);
        child.kill('SIGKILL');
      }
    }
  }, HEALTH_CHECK_FREQ_MS);
  // Cleanup on process termination
  child.status.finally(() => {
    clearInterval(intervalId);
  });
  return child;
}

async function startServerProcesses(
  settings: ServerControlSettings
): Promise<Deno.ChildProcess[]> {
  const serverProcesses: Deno.ChildProcess[] = [];
  const processCount = 2; //navigator.hardwareConcurrency;
  for (let i = 0; i < processCount; ++i) {
    const terminationCallback = async (status: Deno.CommandStatus) => {
      if (status.code !== 0) {
        console.log('Restarting crashed server');
        serverProcesses[i] = await _startChildServerProcess(settings, i);
        serverProcesses[i].status.then(terminationCallback);
      }
    };
    const child = await _startChildServerProcess(settings, i);
    child.status.then(terminationCallback);
    serverProcesses.push(child);
  }
  return serverProcesses;
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
  outputDir: string
): Promise<boolean> {
  try {
    await Deno.mkdir(outputDir, { recursive: true });
    const binaryFileName = filenameFromURL(archiveURL, '.gzip');
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
    const buff = await resp.arrayBuffer();
    await Deno.mkdir(outputDir, { recursive: true });
    // TODO: Take an EBS snapshot before proceeding with server update
    const archivePath = serverBinaryPath + '.gzip';
    await Deno.writeFile(archivePath, new Uint8Array(buff));
    await Deno.remove(serverBinaryPath, { recursive: true });
    console.log(`Decompressing ${archivePath}...`);
    await decompressFile(archivePath, serverBinaryPath);
    console.log(`Writing updated ETag...`);
    const etag = resp.headers.get('etag');
    if (typeof etag === 'string' && etag.length > 0) {
      await Deno.writeTextFile(etagFilePath, etag);
    } else {
      console.log(`Error: ETag file update failed.`);
      await Deno.remove(etagFilePath, { recursive: true });
    }
  } catch (err: unknown) {
    console.log(err);
  }
  return false;
}

/**
 * Updates the server binary. Upon success, terminates all existing servers and
 * replaces them with updated ones.
 */
async function updateServerBinary(
  settings: ServerControlSettings,
  childProcesses: Deno.ChildProcess[] = []
): Promise<Deno.ChildProcess[]> {
  const success = await updateBinary(
    settings.serverArchiveURL,
    settings.serverBinaryDir
  );
  if (success) {
    // Stop all existing processes gracefully
    childProcesses.forEach((child) => {
      try {
        child.kill('SIGTERM');
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

async function updateControlBinary(
  settings: ServerControlSettings
): Promise<void> {
  const workingDir = path.dirname(path.fromFileUrl(import.meta.url));
  const success = await updateBinary(settings.controlArchiveURL, workingDir);
  if (!success) {
    return;
  }
  const updatedBinaryPath = filenameFromURL(
    settings.controlArchiveURL,
    '.gzip'
  );
  const latestSymlinkPath = path.join(workingDir, 'server-control-latest');
  await Deno.remove(latestSymlinkPath, { recursive: true });
  await Deno.symlink(
    path.join(workingDir, updatedBinaryPath),
    latestSymlinkPath
  );
  if (Deno.build.os === 'darwin') {
    const cmd = new Deno.Command(latestSymlinkPath);
    cmd.spawn();
    await sleep(kSecondMs);
    Deno.kill(Deno.pid, 'SIGKILL');
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
  localPath: string
): Promise<boolean> {
  try {
    const etagFilePath = localPath + '.etag';
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
    const json = await resp.json();
    await Deno.writeTextFile(localPath, JSON.stringify(json));
    console.log(`Writing updated ETag...`);
    const etag = resp.headers.get('etag');
    if (typeof etag === 'string' && etag.length > 0) {
      await Deno.writeTextFile(etagFilePath, etag);
    } else {
      console.log(`Error: ETag file update failed.`);
      await Deno.remove(etagFilePath, { recursive: true });
    }
    return true;
  } catch (err: unknown) {
    console.log(err);
  }
  return false;
}

async function main(): Promise<void> {
  const controlDir = path.dirname(path.fromFileUrl(import.meta.url));
  const controlSettingsPath = path.join(controlDir, 'server-control.json');
  let settings: ServerControlSettings = JSON.parse(
    await Deno.readTextFile(controlSettingsPath)
  );
  if (settings.controlSettingsURL) {
    if (await updateJSONFile(settings.controlSettingsURL, controlDir)) {
      settings = JSON.parse(await Deno.readTextFile(controlSettingsPath));
    }
  }
  await updateControlBinary(settings);
  if (settings.serverSettingsURL) {
    await updateJSONFile(settings.serverSettingsURL, settings.dataDir);
  }
  let childProcesses = await updateServerBinary(settings);
  let updateInProgress = false;
  setInterval(async () => {
    if (updateInProgress) {
      return;
    }
    updateInProgress = true;
    await updateControlBinary(settings);
    if (settings.controlSettingsURL) {
      if (await updateJSONFile(settings.controlSettingsURL, controlDir)) {
        settings = JSON.parse(await Deno.readTextFile(controlSettingsPath));
      }
    }
    if (settings.serverSettingsURL) {
      await updateJSONFile(settings.serverSettingsURL, settings.dataDir);
    }
    childProcesses = await updateServerBinary(settings, childProcesses);
    updateInProgress = false;
  }, 5 * kSecondMs);
}

main();
