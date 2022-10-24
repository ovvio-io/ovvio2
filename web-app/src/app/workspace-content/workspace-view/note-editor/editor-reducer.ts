import { Note } from '@ovvio/cfds/lib/client/graph/vertices';

export enum EditorActions {
  INVITE = 'INVITE',
  CREATE_TAG = 'CREATE_TAG',
  DELETE = 'DELETE',
  CLOSE = 'CLOSE',
}
export const initialState = {
  createTagOpen: false,
  tagFilter: '',
  taggedTask: null,
  inviteOpen: false,
  deleteDialogOpen: false,
};
interface ReducerState {
  createTagOpen: false;
  tagFilter: string;
  taggedTask: Note | null;
  inviteOpen: boolean;
  deleteDialogOpen: boolean;
}
export default function editorReducer(
  state: ReducerState,
  action: { type: EditorActions }
) {
  switch (action.type) {
    case EditorActions.INVITE: {
      return {
        ...initialState,
        inviteOpen: true,
      };
    }
    case EditorActions.DELETE: {
      return {
        ...initialState,
        deleteDialogOpen: true,
      };
    }
    case EditorActions.CLOSE: {
      return { ...initialState };
    }
    default: {
      throw new Error();
    }
  }
}
