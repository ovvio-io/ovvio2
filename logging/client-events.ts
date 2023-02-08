import { ToggleAction } from '../web-app/src/app/workspaces-bar/ws-selection-utils.ts';
import { BaseLogEntry } from './entry.ts';

export type ClientEvent =
  | 'SessionAlive'
  | 'SessionEnd'
  | 'AttachmentDownloadSuccess'
  | 'MetadataChanged'
  | 'VertexMoved'
  | 'Click'
  | 'FilterChange'
  | 'Start'
  | 'End'
  | 'Cancel'
  | 'Navigation'
  | 'Create'
  | 'Delete';

export type SettingsType = 'settings:workspace' | 'settings:tags';

export type EditorUISource = 'editor:task-cta' | 'editor:key-down';

export type UISource =
  | 'list'
  | 'title'
  | 'board'
  | 'child-item'
  | 'bar:workspace'
  | 'invite'
  | 'click-outside'
  | 'close-button'
  | SettingsType
  | EditorUISource;

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

export type UIFlow = 'create' | 'delete' | 'permissions' | 'edit' | 'dnd';

export type NavigationType = 'tab' | 'close' | 'open';

export type Reason = 'not-supported' | 'denied';

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
  reason?: Reason;
  routeInfo?: string;
  action?: ToggleAction;
  flag?: boolean;
  flow?: UIFlow;
  id?: string;
}
