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
  | 'FilterChange'
  | 'Start'
  | 'End'
  | 'Cancel'
  | 'Navigation'
  | 'Create';

export type SettingsType = 'settings:workspace' | 'settings:tags';

export type UISource =
  | 'list'
  | 'title'
  | 'board'
  | 'child-item'
  | 'bar:workspace'
  | 'invite'
  | 'click-outside'
  | 'close-button'
  | SettingsType;

export type MetadataType =
  | 'attachment'
  | 'assignee'
  | 'tag'
  | 'pin'
  | 'hide'
  | 'name';

export type DataType = 'workspace' | 'note' | 'task' | 'tag' | 'tag-category';

export type UIStatus = 'started' | 'ended' | 'cancelled';

export type FilterType = 'workspace' | 'tag' | 'assignee';

export type UIFlow = 'create' | 'delete' | 'permissions' | 'edit';

export type NavigationType = 'tab' | 'close' | 'open';

export interface ClientEventEntry extends BaseLogEntry {
  severity: 'INFO';
  event: ClientEvent;
  foreground?: boolean;
  source?: UISource;
  destination?: UISource;
  vertex?: string;
  type?: MetadataType | FilterType | DataType | NavigationType;
  added?: string | string[] | 'ALL';
  removed?: string | string[] | 'ALL';
  origin?: string;
  status?: UIStatus;
  reason?: string;
  routeInfo?: string;
  action?: ToggleAction;
  flag?: boolean;
  flow?: UIFlow;
}
