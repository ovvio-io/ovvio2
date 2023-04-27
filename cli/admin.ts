import { join as joinPath } from 'https://deno.land/std@0.160.0/path/mod.ts';
import yargs from 'https://deno.land/x/yargs@v17.6.0-deno/deno.ts';
import * as path from 'https://deno.land/std@0.160.0/path/mod.ts';
import { prettyJSON, uniqueId } from '../base/common.ts';
import { Record } from '../cfds/base/record.ts';
import { MemRepoStorage, Repository } from '../repo/repo.ts';
import { RepoClient } from '../net/repo-client.ts';
import { SQLiteRepoStorage } from '../server/sqlite3-repo-storage.ts';
import { buildHelpMessage, Manual } from './help.ts';
import { kSyncConfigClient } from '../net/base-client.ts';

interface Arguments {
  server: string;
}

enum Command {
  Exit = 1,
  Help,
  Sync,
  Get,
  Put,
  Putf,
  List,
  Stats,
}

const kCliManual: Manual<keyof typeof Command> = {
  Exit: 'Terminate this CLI',
  Help: 'Print this help page',
  Sync: 'Sync with the remote server',
  Get: {
    params: ['key', 'The key to read'],
    desc: 'Read the record of a given key',
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
  List: 'List all keys in the repository',
  Stats: 'Print statistics about the repository',
};

async function main(): Promise<void> {
  let updateKey: string | undefined;
  let updatePath: string | undefined;

  const args: Arguments = yargs(Deno.args)
    .alias({ s: 'server' })
    // .default()
    .demandOption(['server'])
    .help()
    .parse();
  console.log(`Downloading repo from ${args.server}...`);
  // Using in memory SQLite allows us to run queries locally
  const tempDir = Deno.makeTempDirSync();
  const repoPath = joinPath(tempDir, uniqueId() + '.repo');
  const repo = new Repository(new SQLiteRepoStorage(repoPath));
  const client = new RepoClient(repo, args.server, kSyncConfigClient);
  console.log(`Starting download to ${repoPath}...`);
  client.startSyncing();
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
    repo.setValueForKey(updateKey, sessionId, record);
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

      case Command.Get:
        console.log(prettyJSON(repo.valueForKey(cmdArgs[1], sessionId).toJS()));
        break;

      case Command.Put: {
        const input = prompt('Enter record JSON:')!;
        const json = JSON.parse(input);
        // try {
        const record = Record.fromJS(json);
        // } catch (e) {
        //   console.log('Invalid JSON');
        //   break;
        // }
        repo.setValueForKey(cmdArgs[1], sessionId, record);
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
        repo.setValueForKey(cmdArgs[1], sessionId, record);
        console.log(`Updated ${cmdArgs[1]}.`);
        break;
      }

      case Command.List:
        Array.from(repo.keys())
          .sort()
          .forEach((key) =>
            console.log(
              `${key} => ${repo.valueForKey(key, sessionId).scheme.namespace}`
            )
          );
        break;

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
    let input = (prompt('Enter command:') || '').trim().toLocaleLowerCase();
    if (input.startsWith('"')) {
      input = input.substring(1, input.length - 1);
    }
    input = input.replaceAll('\\', '');
    const args = input.split(/\s+/);
    // Capitalize first letter
    const cmd = args[0][0].toUpperCase() + args[0].substring(1);
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
