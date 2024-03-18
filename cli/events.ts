import yargs from 'yargs';
import { JSONLogFile } from '../base/json-log.ts';
import { toAbsolutePath } from '../base/path.ts';
import { Commit } from '../repo/commit.ts';
import { SchemeNamespace } from '../cfds/base/scheme-types.ts';
import { NormalizedLogEntry } from '../logging/entry.ts';
import { mapIterable } from '../base/common.ts';
import {
  ProgressIndicator,
  ProgressIndicatorType,
} from './progress-indicator.ts';
import { ClientEventEntry } from '../logging/client-events.ts';
import { ClientMetricName, MetricLogEntry } from '../logging/metrics.ts';
import {
  OperationalError,
  OperationalErrorLogEntry,
  SystemErrorLogEntry,
} from '../logging/errors.ts';
import { DeveloperError } from '../logging/errors.ts';

function printMap(map: Map<string, number>): void {
  const maxNameLen = Math.max(
    ...Array.from(mapIterable(map.keys(), (s) => s.length)),
  );
  for (const [k, v] of Array.from(map.entries()).sort(
    (e1, e2) => e2[1] - e1[1],
  )) {
    let fixedWidthKey = `${k}`;
    while (fixedWidthKey.length < maxNameLen) {
      fixedWidthKey += ' ';
    }
    console.log(`${fixedWidthKey}  ${v}`);
  }
}

interface Arguments {
  path: string;
}

export function main(): void {
  const args: Arguments = yargs(Deno.args)
    .command('stats <path>', 'Extract stats from a given .jsonl file')
    .demandCommand(1)
    .parse();
  const logFile = new JSONLogFile(toAbsolutePath(args.path));
  const eventCounts = new Map<string, number>();
  const nsCounts = new Map<SchemeNamespace, number>();
  const progressBar = new ProgressIndicator(ProgressIndicatorType.PERCENT);
  const seenIds = new Set<string>();
  let totalCount = 0;
  let duplicateCount = 0;
  console.log(`Scanning...`);
  for (const json of logFile.open((value) => progressBar.update(1, value))) {
    const commit = Commit.fromJS(json);
    if (seenIds.has(commit.id)) {
      ++duplicateCount;
    }
    seenIds.add(commit.id);
    ++totalCount;
    const record = commit.record;
    if (!record) {
      continue;
    }
    const ns = record.scheme.namespace;
    nsCounts.set(ns, (nsCounts.get(ns) || 0) + 1);
    if (ns !== SchemeNamespace.EVENTS) {
      continue;
    }
    const entry = JSON.parse(record.get<string>('json')!) as NormalizedLogEntry<
      | ClientEventEntry
      | MetricLogEntry
      | OperationalErrorLogEntry
      | SystemErrorLogEntry
    >;
    const key = (entry.event ||
      entry.name ||
      entry.error ||
      'Unknown') as string;
    eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
  }
  logFile.close();
  console.log(`Done. Scanned ${totalCount.toLocaleString()} commits.`);
  if (duplicateCount > 0) {
    console.log(
      `Found ${duplicateCount.toLocaleString()} duplicates (${Math.round(
        (100 * duplicateCount) / totalCount,
      )}%)`,
    );
  }
  // console.log(`Namespaces:`);
  // printMap(nsCounts);
  console.log(`Events:`);
  printMap(eventCounts);
}

main();
