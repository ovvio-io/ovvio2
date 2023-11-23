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
    debugger;
    console.log(
      `Killing zombie proccess (pid ${existingPid}) listening on port ${port}`
    );
    Deno.kill(existingPid, 'SIGKILL');
  }
  // Start the server process
  const binaryFileName = filenameFromURL(settings.serverArchiveURL, '.zip');
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
 * @param zipURL A URL for the zip archive.
 * @param outputDir Output directory for the zip and resulting binary.
 *                  Will be automatically created if not exists.
 *
 * @returns true if the binary had been successfully updated, false otherwise.
 */
async function updateBinary(
  zipURL: string,
  outputDir: string
): Promise<boolean> {
  try {
    await Deno.mkdir(outputDir, { recursive: true });
    const binaryFileName = filenameFromURL(zipURL, '.zip');
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
    console.log(`Checking for updated value at ${zipURL}...`);
    const resp = await fetch(zipURL, requestInit);
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
    const zipPath = serverBinaryPath + '.zip';
    await Deno.writeFile(zipPath, new Uint8Array(buff));
    await Deno.remove(serverBinaryPath, { recursive: true });
    console.log(`Unzipping ${zipPath}...`);
    const unzipCommand = new Deno.Command('unzip', {
      args: ['-u', zipPath],
      cwd: outputDir,
    });
    const output = await unzipCommand.output();
    if (output.success) {
      console.log(`Writing updated ETag...`);
      const etag = resp.headers.get('etag');
      if (typeof etag === 'string' && etag.length > 0) {
        await Deno.writeTextFile(etagFilePath, etag);
      } else {
        console.log(`Error: ETag file update failed.`);
        await Deno.remove(etagFilePath, { recursive: true });
      }
      return true;
    } else {
      debugger;
      console.log(`Error: Failed unzipping archive ${zipPath} at ${outputDir}`);
      const decoder = new TextDecoder();
      console.log(decoder.decode(output.stderr));
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

async function main(): Promise<void> {
  const settings: ServerControlSettings = JSON.parse(
    await Deno.readTextFile(
      path.join(
        path.dirname(path.fromFileUrl(import.meta.url)),
        'server-control.json'
      )
    )
  );
  let childProcesses = await updateServerBinary(settings);
  let updateInProgress = false;
  setInterval(async () => {
    if (updateInProgress) {
      return;
    }
    updateInProgress = true;
    childProcesses = await updateServerBinary(settings, childProcesses);
    updateInProgress = false;
  }, 5 * kSecondMs);
}

main();
