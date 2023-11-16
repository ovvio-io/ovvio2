/**
 * The Watchdog is responsible for the following:
 *
 * 1. Load the watchdog settings from disk.
 * 2. Update watchdog settings, server settings, and server binary.
 * 3. Start server processes based on the number of available CPUs
 *    3.1. Restart these processes if they exit with non-zero status code.
 */
import * as path from 'std/path/mod.ts';
import { JSONObject } from '../base/interfaces.ts';
import { getEntryFilePath } from '../base/development.ts';
import { kMinuteMs, kSecondMs } from '../base/date.ts';

const UNHEALTHY_CHECK_COUNT = 5;
const HEALTH_CHECK_FREQ_MS = kSecondMs;

export interface WatchdogSettings extends JSONObject {
  tenantId: string;
  serverBinaryURL: string;
  watchdogSettingsURL: string;
  serverSettingsURL: string;
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

/**
 * Updates the settings file for server. Servers are watching this file and
 * automatically pick up any changes made to it.
 *
 * @param url The url to download the settings json from.
 * @param localPath Where to store the updated settings.
 */
async function updateServerSettings(
  url: string,
  localPath: string
): Promise<void> {
  try {
    const resp = await fetch(url);
    const json = await resp.json();
    await Deno.writeTextFile(localPath, JSON.stringify(json));
  } catch (err: unknown) {
    console.log(err);
  }
}

/**
 * Updates the server binary. Upon success, terminates all existing servers and
 * replaces them with updated ones.
 *
 * @param url
 * @param localPath
 * @param childProcesses
 * @returns
 */
async function updateServerBinary(
  url: string,
  localPath: string,
  childProcesses: Deno.ChildProcess[]
): Promise<Deno.ChildProcess[]> {
  let success = false;
  try {
    const resp = await fetch(url);
    const buff = await resp.arrayBuffer();
    // TODO: Take snapshot of the disk before actually updating anything
    await Deno.writeFile(localPath, new Uint8Array(buff));
    success = true;
  } catch (err: unknown) {
    console.log(err);
  }
  if (success) {
    childProcesses.forEach((child) => child.kill('SIGTERM'));
    childProcesses = await startServerProcesses(localPath);
  }
  return childProcesses;
}

async function _startChildServerProcess(
  serverBinaryPath: string,
  idx: number
): Promise<Deno.ChildProcess> {
  // We match the port to the index of the process
  const port = 9000 + idx;
  // Kill any zombies that may be left listening on this port
  const existingPid = await processIdForPort(port);
  if (existingPid !== -1) {
    Deno.kill(existingPid, 'SIGKILL');
  }
  // Start the server process
  const cmd = new Deno.Command(serverBinaryPath, {
    args: ['--silent', `--port=${port}`],
  });
  const child = cmd.spawn();
  child.ref();
  // Wait for the server to ack its startup
  const decoder = new TextDecoder();
  while (true) {
    const output = await child.stdout.getReader().read();
    if (output.value && decoder.decode(output.value).startsWith('STARTED')) {
      break;
    }
  }
  // Health check for this process
  let failureCount = 0;
  const intervalId = setInterval(async () => {
    try {
      const resp = await fetch(`http://localhost:${port}/healthy`);
      if (resp.status !== 200) {
        if (++failureCount === UNHEALTHY_CHECK_COUNT) {
          child.kill('SIGKILL');
        }
      } else {
        failureCount = 0;
      }
    } catch (_err: unknown) {
      if (++failureCount === UNHEALTHY_CHECK_COUNT) {
        child.kill('SIGKILL');
      }
    }
  }, HEALTH_CHECK_FREQ_MS);
  // Cleanup on process termination
  child.status.finally(() => clearInterval(intervalId));
  return child;
}

async function startServerProcesses(
  serverBinaryPath: string
): Promise<Deno.ChildProcess[]> {
  const serverProcesses: Deno.ChildProcess[] = [];
  for (let i = 0; i < navigator.hardwareConcurrency; ++i) {
    const terminationCallback = async (status: Deno.CommandStatus) => {
      if (status.code !== 0) {
        console.log('Restarting crashed server');
        serverProcesses[i] = await _startChildServerProcess(
          serverBinaryPath,
          i
        );
        serverProcesses[i].status.then(terminationCallback);
      }
    };
    const child = await _startChildServerProcess(serverBinaryPath, i);
    child.status.then(terminationCallback);
    serverProcesses.push(child);
  }
  return serverProcesses;
}

async function main(): Promise<void> {
  const entryFilePath = getEntryFilePath();
  const settingsPath = path.join(path.dirname(entryFilePath), 'settings.json');
  let serverProcesses: Deno.ChildProcess[] = [];
  let settings = JSON.parse(await Deno.readTextFile(settingsPath));
  let serverBinaryPath = path.join(
    path.dirname(entryFilePath),
    path.basename(new URL(settings.serverBinaryURL).pathname)
  );
  await updateServerSettings(settings.serverSettingsURL, settingsPath);
  await updateServerBinary(
    settings.serverBinaryURL,
    serverBinaryPath,
    serverProcesses
  );
  const intervalId = setInterval(async () => {
    try {
      const resp = await fetch(settings.watchdogSettingsURL);
      const updatedSettings = await resp.json();
      if (settings.serverSettingsURL !== updatedSettings.serverSettingsURL) {
        await updateServerSettings(
          updatedSettings.serverSettingsURL,
          settingsPath
        );
      }
      if (settings.serverBinaryURL !== updatedSettings.serverBinaryURL) {
        serverBinaryPath = path.join(
          path.dirname(entryFilePath),
          path.basename(new URL(settings.serverBinaryURL).pathname)
        );
        await updateServerBinary(
          updatedSettings.serverBinaryURL,
          serverBinaryPath,
          serverProcesses
        );
      }
      settings = updatedSettings;
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error && err.stack) {
        console.error(err.stack);
      }
    }
  }, kMinuteMs);

  serverProcesses = await startServerProcesses(serverBinaryPath);
}

main();
