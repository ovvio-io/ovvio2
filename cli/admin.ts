import yargs from 'https://deno.land/x/yargs@v17.6.0-deno/deno.ts';
import * as path from 'https://deno.land/std@0.160.0/path/mod.ts';
import { prettyJSON, uniqueId } from '../base/common.ts';
import { Record } from '../cfds/base/record.ts';
import { MemRepoStorage, Repository } from '../cfds/base/repo.ts';
import { Client } from '../net/client.ts';

interface Arguments {
  server: string;
}

enum Command {
  Exit = 1,
  Unknown,
  Help,
  Sync,
  Get,
  Put,
  Putf,
  List,
  Stats,
}

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
  const repo = new Repository(new MemRepoStorage());
  const client = new Client(repo, args.server);
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
        console.log('Available commands:');
        console.log('  help: Print this help page');
        console.log('  sync: Sync with the remote server');
        console.log('  get <key>: Read the record of a given key');
        console.log('  put <key> <record>: Update the record of a given key');
        console.log(
          '  putf <key> <path/to/record.json>: Update the record of a given key with the contents of a json file'
        );
        console.log('  list: List all keys in the repository');
        console.log('  stats: Print statistics about the repository');
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
        console.log(`=====================`);
        console.log(`Commit Statistics:`);
        for (const ns of Array.from(commitCountByNamespace.keys()).sort()) {
          console.log(`${ns}: ${commitCountByNamespace.get(ns)}`);
        }
        break;
      }
    }
    [cmd, cmdArgs] = readCommand();
  }
  client.stopSyncing();
}

const kExitKeywords = ['Q', 'Quit', 'Exit'];

function readCommand(): [Command, string[]] {
  let input = (prompt('Enter command:') || '').trim().toLocaleLowerCase();
  if (input.startsWith('"')) {
    input = input.substring(1, input.length - 1);
  }
  input = input.replaceAll('\\', '');
  const args = input.split(/\s+/);
  const cmd = args[0][0].toUpperCase() + args[0].substring(1);
  if (kExitKeywords.indexOf(input) > -1) {
    return [Command.Exit, args];
  }
  // Capitalize first letter
  const result = (Command as any)[cmd];
  if (!result) {
    return [Command.Unknown, args];
  }
  return [result, args];
}

main();
