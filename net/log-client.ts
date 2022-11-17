import { mapIterable } from '../base/common.ts';
import { NormalizedLogEntry } from '../logging/entry.ts';
import { LogStream } from '../logging/stream.ts';
import { BaseClient, OnlineStatusHandler, SyncConfig } from './base-client.ts';
import { SyncMessage } from './types.ts';

export interface LogClientStorage {
  numberOfEntries(): number;

  entryIds(): Iterable<string>;
  persistEntries(entries: NormalizedLogEntry[]): number;
  entries(): Iterable<NormalizedLogEntry>;
}

export class LogClient
  extends BaseClient<NormalizedLogEntry>
  implements LogStream
{
  readonly storage: LogClientStorage;

  constructor(
    storage: LogClientStorage,
    serverUrl: string,
    syncConfig: SyncConfig,
    onlineHandler?: OnlineStatusHandler
  ) {
    super(serverUrl, syncConfig, onlineHandler);
    this.storage = storage;
  }

  protected buildSyncMessage(): SyncMessage<NormalizedLogEntry> {
    const storage = this.storage;
    return SyncMessage.build(
      this.previousServerFilter,
      mapIterable(storage.entries(), (e) => [e.logId, e]),
      storage.numberOfEntries(),
      this.previousServerSize,
      this.syncCycles
    );
  }

  protected persistPeerValues(values: NormalizedLogEntry[]): number {
    return this.storage.persistEntries(values);
  }

  localIds(): Iterable<string> {
    return this.storage.entryIds();
  }

  appendEntry(e: NormalizedLogEntry): void {
    this.storage.persistEntries([e]);
  }
}
