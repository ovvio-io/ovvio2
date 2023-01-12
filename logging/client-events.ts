import { ToggleAction } from '../web-app/src/app/workspaces-bar/ws-selection-utils.ts';
import { BaseLogEntry } from './entry.ts';

export type ClientEvent =
  | 'SessionAlive'
  | 'SessionEnd'
  | 'AttachmentDownloadSuccess'
  | 'MetadataChanged'
  | 'VertexMoved'
  | 'ItemDrag'
  | 'Click'
  | 'FilterChange';

export type UISource =
  | 'list'
  | 'title'
  | 'board'
  | 'child-item'
  | 'workspace-bar';

export type MetadataType = 'attachment' | 'assignee' | 'tag' | 'pin' | 'hide';

export type UIStatus = 'started' | 'ended' | 'cancelled';

export type FilterType = 'workspace' | 'tag' | 'assignee';

export interface ClientEventEntry extends BaseLogEntry {
  severity: 'INFO';
  event: ClientEvent;
  foreground?: boolean;
  uiSource?: UISource;
  vertex?: string;
  type?: MetadataType | FilterType;
  added?: string | string[] | 'ALL';
  removed?: string | string[] | 'ALL';
  origin?: string;
  uiStatus?: UIStatus;
  reason?: string;
  routeInfo?: string;
  action?: ToggleAction;
  flag?: boolean;
}
