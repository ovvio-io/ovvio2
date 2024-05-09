import { mapIterable, unionIter } from '../base/common.ts';
import { kDayMs, kWeekMs } from '../base/date.ts';
import { JSONObject } from '../base/interfaces.ts';
import { SchemeNamespace } from '../cfds/base/scheme-types.ts';
import { ClientEventEntry } from '../logging/client-events.ts';
import { NormalizedLogEntry } from '../logging/entry.ts';
import { MemRepoStorage, Repository } from '../repo/repo.ts';
import { OrgRepositories } from './base.ts';

export interface UsageStats extends JSONObject {
  dau: number;
  wau: number;
  mau: number;
  dauEmails: string[];
  wauEmails: string[];
  mauEmails: string[];
  scanSize: number;
}

export function emptyUsageStats(): UsageStats {
  return {
    dau: 0,
    wau: 0,
    mau: 0,
    dauEmails: [],
    wauEmails: [],
    mauEmails: [],
    scanSize: 0,
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
    scanSize: s1.scanSize + s2.scanSize,
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
  for (const [repoId, repo] of repositories) {
    const [storage, id] = Repository.parseId(repoId);
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
  outStats.scanSize = eventCount;
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
