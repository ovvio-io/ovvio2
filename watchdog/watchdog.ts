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
import { kMinuteMs } from '../base/date.ts';

export interface WatchdogSettings extends JSONObject {
  tenantId: string;
  serverBinaryURL: string;
  watchdogSettingsURL: string;
  serverSettingsURL: string;
}

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

async function updateServerBinary(
  url: string,
  localPath: string,
  childProcesses: Deno.ChildProcess[]
): Promise<Deno.ChildProcess[]> {
  let success = false;
  try {
    const resp = await fetch(url);
    const buff = await resp.arrayBuffer();
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
  const port = 9000 + idx;
  const cmd = new Deno.Command(serverBinaryPath, {
    args: ['--silent', `--port=${port}`],
  });
  const child = cmd.spawn();
  child.ref();
  const decoder = new TextDecoder();
  while (true) {
    const output = await child.stdout.getReader().read();
    if (output.value && decoder.decode(output.value).startsWith('STARTED')) {
      break;
    }
  }
  const intervalId = setInterval(async () => {
    try {
      const rep = await fetch()
    }
  })
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
        serverProcesses[i] = await _startChildServerProcess(serverBinaryPath);
        serverProcesses[i].status.then(terminationCallback);
      }
    };
    const child = await _startChildServerProcess(serverBinaryPath);
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
