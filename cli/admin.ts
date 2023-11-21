import { join as joinPath } from 'std/path/mod.ts';
import yargs from 'https://deno.land/x/yargs@v17.6.0-deno/deno.ts';
import * as path from 'std/path/mod.ts';
import { prettyJSON, uniqueId } from '../base/common.ts';
import { Record } from '../cfds/base/record.ts';
import { MemRepoStorage, Repository } from '../repo/repo.ts';
import { RepoClient } from '../net/repo-client.ts';
import { SQLiteRepoStorage } from '../server/sqlite3-repo-storage.ts';
import { buildHelpMessage, Manual } from './help.ts';
import { kSyncConfigClient } from '../net/base-client.ts';
import { setGlobalLoggerSeverity } from '../logging/log.ts';
import { coreValueCompare } from '../base/core-types/comparable.ts';
import {
  JSONCyclicalEncoder,
  JSONEncoder,
} from '../base/core-types/encoding/json.ts';
import { Code, ServerError } from '../cfds/base/errors.ts';

interface Arguments {
  server: string;
}

enum Command {
  Exit = 1,
  Q = Exit,
  Help,
  Sync,
  Get,
  Put,
  Putf,
  List,
  Ls = List,
  Stats,
}

const kCliManual: Manual<keyof typeof Command> = {
  Exit: 'Terminate this CLI',
  Q: 'Shorthand for Exit',
  Help: 'Print this help page',
  Sync: 'Sync with the remote server',
  Get: {
    params: ['key or commit id', 'The key or commit to read'],
    desc: 'Read the head of a specific record or the value of a specific commit',
  },
  Put: {
    params: [
      ['key', 'The key to update'],
      ['record', 'Updated record'],
    ],
    desc: 'Create/replace the record for a given key',
  },
  Putf: {
    params: [
      ['key', 'The key to update'],
      ['path', 'Full or relative path to a JSON encoded record file'],
    ],
    desc: 'Create/replace the record for a given key with a record encoded as JSON file',
  },
  List: {
    params: [
      'key',
      'An optional key. If provided, will return all commits for this key.',
    ],
    desc: 'List all keys in the repository',
  },
  Ls: 'Shorthand for list',
  Stats: 'Print statistics about the repository',
};

async function main(): Promise<void> {
  let updateKey: string | undefined;
  let updatePath: string | undefined;

  setGlobalLoggerSeverity('ERROR');
  const args: Arguments = yargs(Deno.args)
    .alias({ s: 'server' })
    // .default()
    .demandOption(['server'])
    .help()
    .parse();
  console.log(`Downloading repo from ${args.server}...`);
  // Using SQLite allows us to run queries locally
  const tempDir = Deno.makeTempDirSync();
  const repoPath = joinPath(tempDir, uniqueId() + '.repo');
  const repo = new Repository(new SQLiteRepoStorage(repoPath));
  const client = new RepoClient(repo, args.server, kSyncConfigClient);
  console.log(`Starting download to ${repoPath}...`);
  // client.startSyncing();
  await client.sync();
  console.log(`Download complete (${repo.numberOfCommits} commits).`);

  const sessionId = 'admincli-' + uniqueId();

  if (updateKey && updatePath) {
    const json = JSON.parse(Deno.readTextFileSync(updatePath));
    // try {
    const record = Record.fromJS(json);
    // } catch (e) {
    //   console.log('Invalid JSON');
    //   break;
    // }
    repo.setValueForKey(updateKey, record);
    console.log(`Updated ${updateKey}.`);
  }

  let [cmd, cmdArgs] = readCommand();
  while (cmd !== Command.Exit) {
    switch (cmd) {
      case Command.Help:
        console.log(buildHelpMessage(kCliManual));
        break;

      case Command.Sync:
        console.log(
          `Starting sync (${repo.numberOfCommits} commits in repo)...`
        );
        await client.sync();
        console.log(`Done. ${repo.numberOfCommits} in repo`);
        break;

      case Command.Get: {
        const key = cmdArgs[1];
        if (repo.hasKey(key)) {
          console.log(prettyJSON(repo.valueForKey(key, sessionId).toJS()));
        } else {
          try {
            console.log(
              `Commit:\n${prettyJSON(
                JSONCyclicalEncoder.serialize(repo.getCommit(key))
              )}`
            );
            console.log(
              `Record:\n${prettyJSON(
                JSONEncoder.toJS(repo.recordForCommit(key))
              )}`
            );
          } catch (e: any) {
            if (
              e instanceof ServerError &&
              e.code === Code.ServiceUnavailable
            ) {
              console.log('Not Found');
            } else {
              throw e;
            }
          }
        }
        break;
      }

      case Command.Put: {
        const input = prompt('Enter record JSON:')!;
        const json = JSON.parse(input);
        // try {
        const record = Record.fromJS(json);
        // } catch (e) {
        //   console.log('Invalid JSON');
        //   break;
        // }
        repo.setValueForKey(cmdArgs[1], record);
        console.log(`Updated ${cmdArgs[1]}.`);
        break;
      }

      case Command.Putf: {
        const json = JSON.parse(
          Deno.readTextFileSync(path.resolve(cmdArgs[2]))
        );
        // try {
        const record = Record.fromJS(json);
        // } catch (e) {
        //   console.log('Invalid JSON');
        //   break;
        // }
        repo.setValueForKey(cmdArgs[1], record);
        console.log(`Updated ${cmdArgs[1]}.`);
        break;
      }

      case Command.List: {
        const key = cmdArgs[1];
        if (typeof key !== 'undefined') {
          Array.from(repo.commitsForKey(key))
            .sort(coreValueCompare)
            .forEach((c) => {
              console.log(`${c.timestamp.toISOString()}: ${c.id}`);
            });
        } else {
          Array.from(repo.keys())
            .sort()
            .forEach((key) =>
              console.log(
                `${key} => ${repo.valueForKey(key, sessionId).scheme.namespace}`
              )
            );
        }
        break;
      }

      case Command.Stats: {
        let totalKeys = 0;
        const keyCountByNamespace = new Map<string, number>();
        for (const key of repo.keys()) {
          const ns = repo.valueForKey(key, sessionId).scheme.namespace;
          keyCountByNamespace.set(ns, 1 + (keyCountByNamespace.get(ns) || 0));
          ++totalKeys;
        }
        const commitCountByNamespace = new Map<string, number>();
        for (const commit of repo.commits()) {
          const ns = repo.recordForCommit(commit).scheme.namespace;
          commitCountByNamespace.set(
            ns,
            1 + (commitCountByNamespace.get(ns) || 0)
          );
        }
        console.log(`=====================`);
        console.log(`Key Statistics:`);
        for (const ns of Array.from(keyCountByNamespace.keys()).sort()) {
          console.log(`${ns}: ${keyCountByNamespace.get(ns)}`);
        }
        console.log(`Total: ${totalKeys}`);
        console.log(`=====================`);
        console.log(`Commit Statistics:`);
        for (const ns of Array.from(commitCountByNamespace.keys()).sort()) {
          console.log(`${ns}: ${commitCountByNamespace.get(ns)}`);
        }
        console.log(`Total commits: ${repo.numberOfCommits}`);
        break;
      }
    }
    [cmd, cmdArgs] = readCommand();
  }
  client.stopSyncing();
}

const kExitKeywords = ['Q', 'Quit', 'Exit'];

function readCommand(): [Command, string[]] {
  while (true) {
    let input = (prompt('Enter command:') || '').trim();
    if (input.startsWith('"')) {
      input = input.substring(1, input.length - 1);
    }
    input = input.replaceAll('\\', '');
    const args = input.split(/\s+/);
    // Capitalize first letter
    const cmd =
      args[0][0].toUpperCase() + args[0].substring(1).toLocaleLowerCase();
    if (kExitKeywords.indexOf(input) > -1) {
      return [Command.Exit, args];
    }
    const result = (Command as any)[cmd];
    if (result) {
      return [result, args];
    }
    console.log('Unknown command.');
  }
}

main();
