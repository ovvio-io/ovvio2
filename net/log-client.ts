import { Dictionary } from '../base/collections/dict.ts';
import { mapIterable } from '../base/common.ts';
import { NormalizedLogEntry } from '../logging/entry.ts';
import { LogStream } from '../logging/stream.ts';
import { BaseClient, BaseClientStorage, SyncConfig } from './base-client.ts';
import { SyncMessage } from './types.ts';

export interface LogClientStorage extends BaseClientStorage {
  persistEntries(entries: NormalizedLogEntry[]): Promise<void | number>;
  entries(): AsyncIterable<NormalizedLogEntry>;
}

export class LogClient
  extends BaseClient<NormalizedLogEntry>
  implements LogStream
{
  readonly storage: LogClientStorage;
  readonly entries: Dictionary<string, NormalizedLogEntry>;

  constructor(
    storage: LogClientStorage,
    serverUrl: string,
    syncConfig: SyncConfig
  ) {
    super(serverUrl, syncConfig);
    this.storage = storage;
    this.entries = new Map();
    this.loadAllEntries().then(() => {
      this.ready = true;
    });
  }

  protected buildSyncMessage(): SyncMessage<NormalizedLogEntry> {
    return SyncMessage.build(
      this.previousServerFilter,
      this.entries.entries(),
      this.entries.size,
      this.previousServerSize,
      this.syncCycles
    );
  }

  protected async persistPeerValues(
    values: NormalizedLogEntry[]
  ): Promise<number> {
    const entries = this.entries;
    let persistedCount = 0;
    for (const e of values) {
      if (!entries.has(e.logId)) {
        ++persistedCount;
      }
      entries.set(e.logId, e);
    }
    const writeCount = await this.storage.persistEntries(values);
    return typeof writeCount === 'number' ? writeCount : persistedCount;
  }

  private async loadAllEntries(): Promise<void> {
    const entries = this.entries;
    for await (const e of this.storage.entries()) {
      entries.set(e.logId, e);
    }
  }

  localIds(): Iterable<string> {
    return this.entries.keys();
  }

  appendEntry(e: NormalizedLogEntry): void {
    this.storage.persistEntries([e]);
    this.entries.set(e.logId, e);
  }
}
