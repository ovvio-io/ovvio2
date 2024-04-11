import * as path from 'std/path/mod.ts';
import { JSONLogFile } from '../base/json-log.ts';
import { JSONCyclicalEncoder } from '../base/core-types/encoding/json.ts';
import { Commit } from '../repo/commit.ts';
import { assert } from '../base/error.ts';

export class JSONLogRepoBackup {
  private readonly _commitIds: Set<string>;
  private _log: JSONLogFile | undefined;
  private _ready = false;

  constructor(
    readonly orgId: string,
    readonly repoPath: string,
    readonly processId: number,
  ) {
    this._commitIds = new Set();
  }

  get ready(): boolean {
    return this._ready;
  }

  *open(): Generator<Commit> {
    const repoPath = this.repoPath;
    // First, make sure the repository dir exists
    Deno.mkdirSync(repoPath, { recursive: true });
    for (const file of Deno.readDirSync(repoPath)) {
      const pid = processIdFromFileName(file.name);
      if (pid < 0 || pid === this.processId) {
        continue;
      }
      const logFile = new JSONLogFile(path.join(repoPath, file.name), false);
      for (const commit of loadCommitsFromJSONLog(this.orgId, logFile)) {
        if (!this._commitIds.has(commit.id)) {
          this._commitIds.add(commit.id);
          yield commit;
        }
      }
      logFile.close();
    }
    this._log = new JSONLogFile(
      path.join(repoPath, processIdToFileName(this.processId)),
      true,
    );
    for (const commit of loadCommitsFromJSONLog(this.orgId, this._log)) {
      if (!this._commitIds.has(commit.id)) {
        this._commitIds.add(commit.id);
        yield commit;
      }
    }
    this._ready = true;
  }

  appendCommits(commits: Commit[]): Promise<void> {
    const log = this._log;
    assert(log !== undefined, 'Backup not opened yet');
    commits = commits.filter((c) => !this._commitIds.has(c.id));
    if (!commits.length) {
      return Promise.resolve();
    }
    return log.append(commits.map((c) => JSONCyclicalEncoder.serialize(c)));
  }
}

const FILE_PREFIX = 'p';
const FILE_SUFFIX = '.jsonl';
function processIdFromFileName(name: string): number {
  if (!name.startsWith(FILE_PREFIX) || !name.endsWith(FILE_SUFFIX)) {
    return -1;
  }
  return parseInt(
    name.substring(FILE_PREFIX.length, name.length - FILE_SUFFIX.length),
  );
}

function processIdToFileName(processId: number): string {
  return `${FILE_PREFIX}${processId}${FILE_SUFFIX}`;
}

function* loadCommitsFromJSONLog(
  orgId: string,
  log: JSONLogFile,
): Generator<Commit> {
  for (const json of log.open()) {
    try {
      yield Commit.fromJS(orgId, json);
    } catch (err: any) {
      // Skip any bad commits
    }
  }
}
