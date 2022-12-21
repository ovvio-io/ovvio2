import { BaseLogEntry } from './entry.ts';

export type ClientEvent =
  | 'SessionAlive'
  | 'SessionEnd'
  | 'AttachmentDownloadSuccess'
  | 'MetadataChanged'
  | 'VertexMoved';

export type UISource = 'list' | 'title' | 'board' | 'child-item';

export type MetadataType = 'attachment' | 'assignee' | 'tag';

export interface ClientEventEntry extends BaseLogEntry {
  severity: 'INFO';
  event: ClientEvent;
  foreground?: boolean;
  uiSource?: UISource;
  vertex?: string;
  metadataType?: MetadataType;
  added?: string;
  removed?: string;
  origin?: string;
}
