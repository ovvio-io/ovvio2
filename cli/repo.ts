import yargs from 'yargs';
import * as path from 'std/path/mod.ts';
import { JSONLogFile } from '../base/json-log.ts';
import { toAbsolutePath } from '../base/path.ts';
import { Commit } from '../repo/commit.ts';
import {
  ProgressIndicator,
  ProgressIndicatorType,
} from './progress-indicator.ts';
import { JSONObject } from '../base/interfaces.ts';

interface Arguments {
  path: string;
}

function dedupFile(srcPath: string): void {
  const dstPath = srcPath + '.tmp';
  const srcFile = new JSONLogFile(srcPath);
  const dstFile = new JSONLogFile(dstPath, true);
  const progressBar = new ProgressIndicator(ProgressIndicatorType.PERCENT);
  const seenIds = new Set<string>();
  let totalCount = 0;
  let duplicateCount = 0;
  console.log(`Scanning ${srcPath}...`);
  let pendingEntries: JSONObject[] = [];
  for (const _ of dstFile.open()) {
    // Force open the dst log
  }
  for (const json of srcFile.open((value) => progressBar.update(1, value))) {
    const commit = Commit.fromJS(json);
    ++totalCount;
    if (seenIds.has(commit.id)) {
      ++duplicateCount;
      continue;
    }
    seenIds.add(commit.id);
    pendingEntries.push(json);
    if (pendingEntries.length >= 50) {
      dstFile.appendSync(pendingEntries);
      pendingEntries = [];
    }
  }
  if (pendingEntries.length > 0) {
    dstFile.appendSync(pendingEntries);
  }
  srcFile.close();
  dstFile.close();
  console.log(
    `Done. Scanned ${totalCount.toLocaleString()} commits, Wrote ${seenIds.size.toLocaleString()} commits.`,
  );
  if (duplicateCount > 0) {
    console.log(
      `Found ${duplicateCount.toLocaleString()} duplicates (${Math.round(
        (100 * duplicateCount) / totalCount,
      )}%)`,
    );
  }
  Deno.renameSync(srcPath, srcFile + '-orig');
  Deno.renameSync(dstPath, srcPath);
  Deno.removeSync(srcFile + '-orig');
}

function dedupRepo(repoPath: string): void {
  for (const info of Deno.readDirSync(repoPath)) {
    if (info.isFile && info.name.endsWith('.jsonl')) {
      dedupFile(path.join(repoPath, info.name));
    }
  }
}

function dedupDir(dirPath: string): void {
  if (dirPath.endsWith('.repo')) {
    dedupRepo(dirPath);
    return;
  }
  for (const info of Deno.readDirSync(dirPath)) {
    if (info.isDirectory) {
      if (info.name.endsWith('.repo')) {
        dedupRepo(path.join(dirPath, info.name));
      } else {
        dedupDir(path.join(dirPath, info.name));
      }
    }
  }
}

export function main(): void {
  const args: Arguments = yargs(Deno.args)
    .command(
      'dedup <path>',
      'De-duplicate commits from the given repository file',
    )
    .demandCommand(1)
    .parse();
  const dirPath = toAbsolutePath(args.path);
  dedupDir(dirPath);
}

main();
