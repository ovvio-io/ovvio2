import { LogEntry, LogStream } from './log.ts';
import { NormalizedLogEntry } from './entry.ts';
import { Repository, MemRepoStorage } from '../repo/repo.ts';
import { Record } from '../cfds/base/record.ts';
import { Scheme } from '../cfds/base/scheme.ts';

export class RepoLogStream implements LogStream {
  constructor(readonly repositories: Repository<MemRepoStorage>[]) {}

  appendEntry(e: NormalizedLogEntry<LogEntry>): void {
    let min = this.repositories[0];
    if (min.hasKey(e.logId)) {
      return;
    }
    for (let i = 1; i < this.repositories.length; ++i) {
      const r = this.repositories[i];
      if (r.hasKey(e.logId)) {
        return;
      }
      if (r.numberOfCommits() < min.numberOfCommits()) {
        min = r;
      }
    }
    min.setValueForKey(
      e.logId,
      new Record({
        scheme: Scheme.event(),
        data: {
          json: JSON.stringify(e),
        },
      }),
      undefined,
    );
  }
}
