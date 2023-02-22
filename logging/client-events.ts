import { NoteStatus } from '../cfds/base/scheme-types.ts';
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

export type EditorUISource =
  | 'editor'
  | 'editor:task-cta'
  | 'editor:key-down'
  | 'editor:title'
  | 'editor:body'
  | 'editor:legend'
  | 'editor:tooltip';

export type ToolbarUISource =
  | 'toolbar'
  | 'toolbar:filterButton'
  | 'toolbar:compose';

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
  | EditorUISource
  | ToolbarUISource;

export type MetadataType =
  | 'attachment'
  | 'assignee'
  | 'tag'
  | 'pin'
  | 'hide'
  | 'name'
  | 'status';

export type DataType = 'workspace' | 'note' | 'task' | 'tag' | 'tag-category';

export type UIStatus = 'started' | 'ended' | 'cancelled';

export type FilterType =
  | 'workspace'
  | 'tag'
  | 'assignee'
  | 'sortBy:priority'
  | 'sortBy:created'
  | 'sortBy:modified'
  | 'sortBy:due'
  | 'groupBy:assignee'
  | 'groupBy:workspace'
  | 'groupBy:tag';

export type UIFlow =
  | 'create'
  | 'delete'
  | 'permissions'
  | 'edit'
  | 'dnd'
  | 'search';

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
  status?: UIStatus | NoteStatus;
  reason?: Reason;
  routeInfo?: string;
  action?: ToggleAction;
  flag?: boolean;
  flow?: UIFlow;
  id?: string;
}
