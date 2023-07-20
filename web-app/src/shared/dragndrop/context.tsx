import React, {
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { CANCELLATION_REASONS } from './index.ts';
import { DragPosition } from './droppable.tsx';

function generateId() {
  return ++_id;
}

interface DNDCallbacks {
  onDragStarted?: <T>(
    data: T,
    index: number,
    dropZone: string,
    placeholderStyle: {}
  ) => void;
  setDragOverIndex?: (
    index: number,
    dragPosition: DragPosition,
    dropZone: string
  ) => void;
  onDragCancelled?: (e: {
    reason: CANCELLATION_REASONS;
    context?: any;
  }) => void;
  onDrop?: <T>(
    item: T,
    relativeTo: T,
    dragPosition: DragPosition,
    index?: number
  ) => void;
}

interface DNDContext extends DNDCallbacks {
  id: string;
  state: DragAndDropState;
}

const dragCtx = React.createContext<DNDContext | null>(null);

let _id = 0;

const START_DRAG = 'START_DRAG';
const CANCEL_DRAG = 'CANCEL_DRAG';
const END_DRAG = 'END_DRAG';
const SET_OVER_INDEX = 'SET_OVER_INDEX';
const SET_DISABLED = 'SET_DISABLED';

type DNDAction =
  | {
      type: 'START_DRAG';
      payload: {
        data: any;
        index: number;
        dropZone: string;
        placeholderStyle?: {};
      };
    }
  | {
      type: 'CANCEL_DRAG';
    }
  | {
      type: 'END_DRAG';
    }
  | {
      type: 'SET_OVER_INDEX';
      payload: {
        dropZone: string;
        dragPosition: DragPosition;
        index: number;
      };
    }
  | {
      type: 'SET_DISABLED';
      payload: {
        disabled: boolean;
      };
    };

interface DragAndDropState {
  disabled: boolean;
  dragData: null | {
    data: any;
    index: number;
    dropZone: string;
    placeholderStyle: {};
  };
  dragOverData: null | {
    dropZone: string;
    dragPosition: DragPosition;
    index: number;
  };
}

function init(disabled: boolean): DragAndDropState {
  return {
    dragData: null,
    dragOverData: null,
    disabled,
  };
}
function dndReducer(
  state: DragAndDropState,
  action: DNDAction
): DragAndDropState {
  // if (state.disabled && type !== SET_DISABLED) {
  //   return state;
  // }
  switch (action.type) {
    case START_DRAG: {
      const { payload } = action;
      return {
        ...state,
        dragData: {
          data: payload.data,
          index: payload.index,
          dropZone: payload.dropZone,
          placeholderStyle: payload.placeholderStyle || {},
        },
        dragOverData: {
          dropZone: payload.dropZone,
          dragPosition: { y: 'bottom', x: 'right' },
          index: payload.index - 1,
        },
      };
    }
    case CANCEL_DRAG:
    case END_DRAG: {
      return {
        ...state,
        dragData: null,
        dragOverData: null,
      };
    }
    case SET_OVER_INDEX: {
      const { payload } = action;
      if (state.disabled) {
        return state;
      }
      if (
        payload.dropZone === state.dragData?.dropZone &&
        (payload.index === state.dragData.index ||
          payload.index === state.dragData.index - 1)
      ) {
        return {
          ...state,
          dragOverData: {
            index: state.dragData.index - 1,
            dragPosition: payload.dragPosition,
            dropZone: payload.dropZone,
          },
        };
      }
      return {
        ...state,
        dragOverData: {
          index: payload.index,
          dragPosition: payload.dragPosition,
          dropZone: payload.dropZone,
        },
      };
    }
    case SET_DISABLED: {
      const { payload } = action;
      if (payload.disabled === state.disabled) {
        return state;
      }
      return init(payload.disabled);
    }
    default:
      throw new Error('Unknown action type');
  }
}

interface DragAndDropProps extends DNDCallbacks {
  children: React.ReactNode;
  disabled?: boolean;
}

export function DragAndDropContext({
  children,
  onDragStarted = () => {},
  onDragCancelled = () => {},
  onDrop = () => {},
  disabled = false,
}: DragAndDropProps) {
  const [state, dispatch] = useReducer(dndReducer, disabled, init);
  const listeners = useRef({
    onDragStarted,
    onDragCancelled,
    onDrop,
  });
  const id = useMemo(() => `ctx_${generateId()}`, []);
  const ctx = useMemo<DNDContext>(
    () => ({
      id,
      onDragStarted(data, index, dropZone, placeholderStyle) {
        dispatch({
          type: START_DRAG,
          payload: {
            data,
            index,
            dropZone,
            placeholderStyle,
          },
        });
        listeners.current.onDragStarted(
          data,
          index,
          dropZone,
          placeholderStyle
        );
      },
      onDragCancelled(e) {
        dispatch({ type: CANCEL_DRAG });
        listeners.current.onDragCancelled(e);
      },
      onDrop(item, relativeTo, dragPosition, index) {
        dispatch({ type: END_DRAG });
        listeners.current.onDrop(item, relativeTo, dragPosition, index);
      },
      setDragOverIndex(
        index: number,
        dragPosition: DragPosition,
        dropZone: string
      ) {
        if (
          state.dragOverData &&
          state.dragOverData.index === index &&
          state.dragOverData.dropZone === dropZone //||
          // (!state.dragOverData &&
          //   state.dragData.dropZone === dropZone &&
          //   (state.dragData.index === index ||
          //     state.dragData.index - 1 === index))
        ) {
          return;
        }
        dispatch({
          type: SET_OVER_INDEX,
          payload: { index, dragPosition, dropZone },
        });
      },
      state,
    }),
    [id, state]
  );
  useEffect(() => {
    listeners.current = {
      onDragStarted,
      onDragCancelled,
      onDrop,
    };
  }, [onDragStarted, onDragCancelled, onDrop]);
  useEffect(() => {
    dispatch({
      type: SET_DISABLED,
      payload: { disabled },
    });
  }, [disabled]);
  return <dragCtx.Provider value={ctx}>{children}</dragCtx.Provider>;
}

export function useDndContext<T>(data: T) {
  const ctx = useContext(dragCtx);
  if (!ctx) {
    throw new Error(
      'Draggable and Droppable components must be descendant components of DragAndDropContext'
    );
  }
  const gid = useMemo(generateId, []);
  const id = `${ctx.id}:${gid}`;

  return { id, ctx };
}

export function isSameContext(myId: string, other: string) {
  const [ctxA] = myId.split(':');
  const [ctxB] = other.split(':');
  return ctxA === ctxB;
}
