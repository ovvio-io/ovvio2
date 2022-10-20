import yargs from 'https://deno.land/x/yargs@v17.6.0-deno/deno.ts';
import { prettyJSON, uniqueId } from '../base/common.ts';
import { Record } from '../cfds/base/record.ts';
import { Repository } from '../cfds/base/repo.ts';
import { Client } from '../net/client.ts';

interface Arguments {
  server: string;
}

enum Command {
  Exit,
  Unknown,
  Help,
  Sync,
  Get,
  Put,
}

async function main(): Promise<void> {
  const args: Arguments = yargs(Deno.args)
    .alias({ s: 'server' })
    // .default()
    .demandOption(['server'])
    .help()
    .parse();
  console.log(`Downloading repo from ${args.server}...`);
  const repo = new Repository();
  const client = new Client(repo, args.server);
  client.startSyncing();
  await client.sync();
  console.log(`Download complete (${repo.numberOfCommits} commits).`);

  const sessionId = 'admincli-' + uniqueId();
  let [cmd, cmdArgs] = readCommand();
  while (cmd !== Command.Exit) {
    switch (cmd) {
      case Command.Help:
        console.log('Available commands:');
        console.log('  sync: Sync with the remote server');
        console.log('  get <key>: Read the record of a given key');
        console.log('  put <key> <record>: Update the record of a given key');
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
  // Capitalize first lette
  const result = (Command as any)[cmd];
  if (!result) {
    return [Command.Unknown, args];
  }
  return [result, args];
}

main();
