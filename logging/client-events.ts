import { BaseLogEntry } from './entry.ts';

export type ClientEvent =
  | 'SessionAlive'
  | 'SessionEnd'
  | 'AttachmentRemoved'
  | 'AttachmentDownloadSuccess';

export type UI_SOURCE = 'list' | 'title' | 'board' | 'child-item';

export interface ClientEventEntry extends BaseLogEntry {
  severity: 'INFO';
  event: ClientEvent;
  foreground?: boolean;
  uiSource?: UI_SOURCE;
  vertex?: string;
}
