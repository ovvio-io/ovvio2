import { DragAndDropContext } from './context';
import { Draggable } from './draggable';
import { Droppable } from './droppable';
import CANCELLATION_REASONS from './cancellation-reasons';
export { DragAndDropContext, Draggable, Droppable, CANCELLATION_REASONS };

export enum DragSource {
  List = 'LIST',
  AssigneeBoard = 'ASSIGNEE_BOARD',
  WorkspaceBoard = 'WORKSPACE_BOARD',
  NoteBoard = 'NOTE_BOARD',
  TagBoard = 'TAG_BOARD',
  DueDateBoard = 'DUE_DATE_BOARD',
  ChildTag = 'CHILD_TAG',
}
