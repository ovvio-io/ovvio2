import yargs from 'yargs';
import * as path from 'std/path/mod.ts';
import * as fs from 'std/fs/mod.ts';
import { JSONLogFile } from '../base/json-log.ts';
import { toAbsolutePath } from '../base/path.ts';
import { Commit } from '../repo/commit.ts';
import {
  ProgressIndicator,
  ProgressIndicatorType,
} from './progress-indicator.ts';
import { JSONObject } from '../base/interfaces.ts';
import {
  MemRepoStorage,
  Repository,
  RepositoryType,
  kRepositoryTypes,
} from '../repo/repo.ts';
import { TrustPool, generateSession } from '../auth/session.ts';
import { assert } from '../base/error.ts';
import { OrgRepositories } from '../analytics/base.ts';
import { prettyJSON } from '../base/common.ts';
import {
  UsageStats,
  emptyUsageStats,
  generateUsageStats,
  usageStatsJoin,
  usageStatsToPlainText,
} from '../analytics/usgae.tsx';
import { setGlobalLoggerStreams } from '../logging/log.ts';
import { EmailService, sendEmail } from '../net/server/email.ts';
import { reportToHTML } from '../analytics/report.tsx';

const REPO_DIR_EXT = '.repo';

interface Arguments {
  path: string;
}

function populateRepoFromLog(
  logPath: string,
  repo: Repository<MemRepoStorage>,
): void {
  const logFile = new JSONLogFile(logPath, false);
  for (const json of logFile.open()) {
    try {
      const commit = Commit.fromJS(repo.trustPool.orgId, json);
      repo.persistVerifiedCommits([commit]);
    } catch (_: unknown) {}
  }
  logFile.close();
}

async function loadRepoFromPath(
  repoDir: string,
  trustPool: TrustPool,
): Promise<Repository<MemRepoStorage> | undefined> {
  if (path.extname(repoDir) !== REPO_DIR_EXT) {
    return;
  }
  if (!(await fs.exists(repoDir, { isDirectory: true }))) {
    return;
  }
  const repoId = path.basename(repoDir, REPO_DIR_EXT);
  const result = new Repository(
    new MemRepoStorage(),
    trustPool,
    Repository.namespacesForType(Repository.parseId(repoId)[0]),
  );
  for await (const info of Deno.readDir(repoDir)) {
    if (info.isFile && path.extname(info.name) === '.jsonl') {
      populateRepoFromLog(path.join(repoDir, info.name), result);
    }
  }
  return result;
}

async function loadOrgFromPath(orgPath: string): Promise<OrgRepositories> {
  const trustPool = new TrustPool(
    path.basename(orgPath),
    await generateSession(),
  );
  const result = new Map<string, Repository<MemRepoStorage>>();
  const pathsToLoad: string[] = [];

  for (const storage of kRepositoryTypes) {
    for await (const info of Deno.readDir(path.join(orgPath, storage))) {
      if (info.isDirectory && path.extname(info.name) === REPO_DIR_EXT) {
        pathsToLoad.push(path.join(orgPath, storage, info.name));
      }
    }
  }

  const progressBar = new ProgressIndicator(ProgressIndicatorType.PERCENT);
  for (const repoPath of pathsToLoad) {
    const repo = await loadRepoFromPath(repoPath, trustPool);
    if (repo) {
      result.set(
        Repository.id(
          path.basename(path.dirname(repoPath)) as RepositoryType,
          path.basename(repoPath, REPO_DIR_EXT),
        ),
        repo,
      );
    }
    progressBar.update(pathsToLoad.length, result.size);
  }
  progressBar.update(pathsToLoad.length, pathsToLoad.length);
  console.log('');
  return result;
}

function dedupFile(srcPath: string): void {
  const dstPath = srcPath + '.tmp';
  const srcFile = new JSONLogFile(srcPath, false);
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
    const commit = Commit.fromJS((json.org as string) || 'localhost', json);
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

async function sendUsageReport(tenantPath: string): Promise<void> {
  const domains = [
    'baluka',
    'oberson-arch',
    'precise-todo-demo',
    'precisetodo',
    'ranandmorris',
    'ysla',
    'ztlv',
  ];
  const report = new Map<string, UsageStats>();
  for (const orgId of domains) {
    const orgPath = path.join(tenantPath, orgId);
    if (await fs.exists(orgPath, { isDirectory: true })) {
      console.log(`Scanning ${orgId}...`);
      const orgRepos = await loadOrgFromPath(orgPath);
      const stats = generateUsageStats(orgRepos);
      report.set(orgId, stats);
    }
  }
  if (
    await sendEmail({
      type: 'AnalyticsReport',
      to: [
        'ofri@ovvio.io',
        'nadav@ovvio.io',
        'yarden@ovvio.io',
        'maayan@ovvio.io',
        'amit.s@ovvio.io',
      ],
      subject: 'Ovvio Usage Report - precise-arch',
      plaintext: '',
      html: reportToHTML(report),
    })
  ) {
    console.log('Report Sent');
  } else {
    console.error('Email sending failed');
  }
}

export function main(): void {
  yargs(Deno.args)
    .command({
      command: 'dedup <path>',
      desc: 'De-duplicate commits from the given repository',
      handler: (args: Arguments) => {
        const dirPath = toAbsolutePath(args.path);
        dedupDir(dirPath);
      },
    })
    .command({
      command: 'stats <path>',
      desc: 'Computes analytics data for the given org directory',
      handler: async (args: Arguments) => {
        setGlobalLoggerStreams([]);
        await sendUsageReport(toAbsolutePath(args.path));
        Deno.exit();
      },
    })
    .demandCommand(1)
    .parse();
}

main();
