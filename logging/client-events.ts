import { BaseLogEntry } from './entry.ts';

export type ClientEvent = 'SESSION_ALIVE' | 'SESSION_END';

export interface ClientEventEntry extends BaseLogEntry {
  severity: 'INFO';
  event: ClientEvent;
  foreground?: boolean;
}
