import { mapIterable, unionIter } from '../base/common.ts';
import { kDayMs, kWeekMs } from '../base/date.ts';
import { JSONObject } from '../base/interfaces.ts';
import { randomInt } from '../base/math.ts';
import { SchemeNamespace } from '../cfds/base/scheme-types.ts';
import { NoteType } from '../cfds/client/graph/vertices/note.ts';
import { ClientEventEntry } from '../logging/client-events.ts';
import { NormalizedLogEntry } from '../logging/entry.ts';
import { commitContentsIsRecord } from '../repo/commit.ts';
import { MemRepoStorage, Repository } from '../repo/repo.ts';
import { OrgRepositories } from './base.ts';

export interface UsageStats extends JSONObject {
  dau: number;
  wau: number;
  mau: number;
  dauEmails: string[];
  wauEmails: string[];
  mauEmails: string[];
  totalRepos: number;
  totalKeys: number;
  totalCommits: number;
  avgCommitsPerRepo: number;
  maxCommitsPerRepo: number;
  commitsOlderThan30Days: number;
  totalUsers: number;
  totalWorkspaces: number;
  totalTags: number;
  totalNotes: number;
  totalTasks: number;
  totalEvents: number;
  fullCommitsCount: number;
  fullCommitsSize: number;
  deltaCommitsCount: number;
  deltaCommitsSize: number;
  deltaCommitSavings: number;
  totalHeadsSize: number;
}

export function emptyUsageStats(): UsageStats {
  return {
    dau: 0,
    wau: 0,
    mau: 0,
    dauEmails: [],
    wauEmails: [],
    mauEmails: [],
    totalRepos: 0,
    totalKeys: 0,
    totalCommits: 0,
    avgCommitsPerRepo: 0,
    maxCommitsPerRepo: 0,
    commitsOlderThan30Days: 0,
    totalUsers: 0,
    totalWorkspaces: 0,
    totalTags: 0,
    totalNotes: 0,
    totalTasks: 0,
    totalEvents: 0,
    fullCommitsCount: 0,
    fullCommitsSize: 0,
    deltaCommitsCount: 0,
    deltaCommitsSize: 0,
    deltaCommitSavings: 0,
    totalHeadsSize: 0,
  };
}

export function usageStatsJoin(s1: UsageStats, s2: UsageStats): UsageStats {
  return {
    dau: s1.dau + s2.dau,
    wau: s1.wau + s2.wau,
    mau: s1.mau + s2.mau,
    dauEmails: Array.from(
      new Set(unionIter(s1.dauEmails, s2.dauEmails)),
    ).sort(),
    wauEmails: Array.from(
      new Set(unionIter(s1.wauEmails, s2.wauEmails)),
    ).sort(),
    mauEmails: Array.from(
      new Set(unionIter(s1.mauEmails, s2.mauEmails)),
    ).sort(),
    totalRepos: s1.totalRepos + s2.totalRepos,
    totalKeys: s1.totalKeys + s2.totalKeys,
    totalCommits: s1.totalCommits + s2.totalCommits,
    avgCommitsPerRepo: Math.round(
      (s1.avgCommitsPerRepo + s2.avgCommitsPerRepo) / 2,
    ),
    maxCommitsPerRepo: Math.max(s1.maxCommitsPerRepo, s2.maxCommitsPerRepo),
    commitsOlderThan30Days:
      s1.commitsOlderThan30Days + s2.commitsOlderThan30Days,
    totalUsers: s1.totalUsers + s2.totalUsers,
    totalWorkspaces: s1.totalWorkspaces + s2.totalWorkspaces,
    totalTags: s1.totalTags + s2.totalTags,
    totalNotes: s1.totalTags + s2.totalNotes,
    totalTasks: s1.totalTasks + s2.totalTasks,
    totalEvents: s1.totalEvents + s2.totalEvents,
    fullCommitsCount: s1.fullCommitsCount + s2.fullCommitsCount,
    fullCommitsSize: s2.fullCommitsSize + s2.fullCommitsSize,
    deltaCommitsCount: s1.deltaCommitsCount + s2.deltaCommitsCount,
    deltaCommitsSize: s1.deltaCommitsSize + s2.deltaCommitsSize,
    deltaCommitSavings: s1.deltaCommitSavings + s2.deltaCommitSavings,
    totalHeadsSize: s1.totalHeadsSize + s2.totalHeadsSize,
  };
}

interface StatsReducer {
  dauIds: Set<string>;
  wauIds: Set<string>;
  mauIds: Set<string>;
}

function processEvent(
  event: NormalizedLogEntry<ClientEventEntry>,
  reducer: StatsReducer,
  userId: string,
) {
  const dayTs = Date.now() - kDayMs;
  const weekTs = Date.now() - kWeekMs;
  const monthTs = Date.now() - 30 * kDayMs;
  if (event.timestamp >= monthTs) {
    reducer.mauIds.add(userId);
    if (event.timestamp >= weekTs) {
      reducer.wauIds.add(userId);
      if (event.timestamp >= dayTs) {
        reducer.dauIds.add(userId);
      }
    }
  }
}

export function generateUsageStats(
  repositories: OrgRepositories,
  outStats?: UsageStats,
): UsageStats {
  const reducer: StatsReducer = {
    dauIds: new Set<string>(),
    wauIds: new Set<string>(),
    mauIds: new Set<string>(),
  };
  let eventCount = 0;
  let totalCommits = 0;
  let maxCommitsPerRepo = 0;
  let commitsOlderThan30Days = 0;
  let fullCommitsCount = 0;
  let fullCommitsSize = 0;
  let deltaCommitsCount = 0;
  let deltaCommitsSize = 0;
  let deltaCommitSavings = 0;
  let totalHeadsSize = 0;
  let totalKeys = 0;
  const deltaSavingsSampleRate = 100;
  const now = Date.now();
  const countByNamespace = new Map<string, number>();
  for (const [repoId, repo] of repositories) {
    const [storage, id] = Repository.parseId(repoId);
    const numCommits = repo.numberOfCommits();
    totalCommits += numCommits;
    maxCommitsPerRepo = Math.max(maxCommitsPerRepo, numCommits);
    for (const c of repo.commits()) {
      if (c.timestamp.getTime() < now - 30 * kDayMs) {
        ++commitsOlderThan30Days;
      }
      if (storage !== 'events') {
        const commitSize = JSON.stringify(c.toJS()).length;
        if (commitContentsIsRecord(c.contents)) {
          ++fullCommitsCount;
          fullCommitsSize += commitSize;
        } else {
          ++deltaCommitsCount;
          deltaCommitsSize += commitSize;
          if (
            randomInt(0, deltaSavingsSampleRate) === 0 &&
            repo.hasRecordForCommit(c)
          ) {
            const record = repo.recordForCommit(c);
            deltaCommitSavings +=
              JSON.stringify(record.toJS()).length -
              JSON.stringify(c.contents.edit.toJS()).length;
          }
        }
      }
    }
    for (const k of repo.keys()) {
      const record = repo.valueForKey(k);
      let ns: string = record.scheme.namespace;
      if (ns === SchemeNamespace.NOTES) {
        ns = record.get<string>('type')!;
      }
      countByNamespace.set(ns, (countByNamespace.get(ns) || 0) + 1);
      totalHeadsSize += JSON.stringify(record.toJS()).length;
      ++totalKeys;
    }
    if (storage !== 'events') {
      continue;
    }
    const userId = id.split('--')[0];
    for (const key of repo.keys()) {
      const head = repo.headForKey(key);
      if (!head) {
        continue;
      }
      const record = repo.recordForCommit(head);
      if (record.scheme.namespace !== SchemeNamespace.EVENTS) {
        continue;
      }
      const entry = JSON.parse(
        record.get<string>('json')!,
      ) as NormalizedLogEntry<ClientEventEntry>;
      processEvent(entry, reducer, userId);
      ++eventCount;
    }
  }
  if (!outStats) {
    outStats = emptyUsageStats();
  }
  outStats.dau = reducer.dauIds.size;
  outStats.wau = reducer.wauIds.size;
  outStats.mau = reducer.mauIds.size;
  const sysDir = repositories.get(Repository.sysDirId)!;
  outStats.dauEmails = Array.from(
    new Set(
      mapIterable(
        reducer.dauIds,
        (id) => sysDir.valueForKey(id).get('email').split('@')[1],
      ),
    ),
  ).sort();
  outStats.wauEmails = Array.from(
    new Set(
      mapIterable(
        reducer.wauIds,
        (id) => sysDir.valueForKey(id).get('email').split('@')[1],
      ),
    ),
  ).sort();
  outStats.mauEmails = Array.from(
    new Set(
      mapIterable(
        reducer.mauIds,
        (id) => sysDir.valueForKey(id).get('email').split('@')[1],
      ),
    ),
  ).sort();
  outStats.totalRepos = repositories.size;
  outStats.totalKeys = totalKeys;
  outStats.totalCommits = totalCommits;
  outStats.maxCommitsPerRepo = maxCommitsPerRepo;
  outStats.avgCommitsPerRepo = Math.round(totalCommits / repositories.size);
  outStats.commitsOlderThan30Days = commitsOlderThan30Days;
  outStats.totalUsers = countByNamespace.get(SchemeNamespace.USERS) || 0;
  outStats.totalWorkspaces =
    countByNamespace.get(SchemeNamespace.WORKSPACE) || 0;
  outStats.totalTags = countByNamespace.get(SchemeNamespace.TAGS) || 0;
  outStats.totalNotes = countByNamespace.get(NoteType.Note) || 0;
  outStats.totalTasks = countByNamespace.get(NoteType.Task) || 0;
  outStats.totalEvents = countByNamespace.get(SchemeNamespace.EVENTS) || 0;
  outStats.fullCommitsCount = fullCommitsCount;
  outStats.fullCommitsSize = fullCommitsSize;
  outStats.deltaCommitsCount = deltaCommitsCount;
  outStats.deltaCommitsSize = deltaCommitsSize;
  outStats.deltaCommitSavings = deltaCommitSavings * deltaSavingsSampleRate;
  outStats.totalHeadsSize = totalHeadsSize;
  return outStats;
}

export function usageStatsToPlainText(data: UsageStats): string {
  let result = '';
  result += `Active Users Past 24 Hours: ${data.dau.toLocaleString()} (${data.dauEmails.join(
    ', ',
  )})\n`;
  result += `Active Users Past 7 Days: ${data.wau.toLocaleString()} (${data.wauEmails.join(
    ', ',
  )})\n`;
  result += `Active Users Past 30 Days: ${data.mau.toLocaleString()} (${data.mauEmails.join(
    ', ',
  )})\n`;
  return result;
}
