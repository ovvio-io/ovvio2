import { LogEntry, LogStream } from './log.ts';
import { NormalizedLogEntry } from './entry.ts';
import { Repository, MemRepoStorage } from '../repo/repo.ts';
import { Record } from '../cfds/base/record.ts';
import { Scheme } from '../cfds/base/scheme.ts';

export class RepoLogStream implements LogStream {
  constructor(readonly repository: Repository<MemRepoStorage>) {}

  appendEntry(e: NormalizedLogEntry<LogEntry>): void {
    if (!this.repository.hasKey(e.logId)) {
      this.repository.setValueForKey(
        e.logId,
        new Record({
          scheme: Scheme.event(),
          data: {
            json: JSON.stringify(e),
          },
        }),
      );
    }
  }
}
