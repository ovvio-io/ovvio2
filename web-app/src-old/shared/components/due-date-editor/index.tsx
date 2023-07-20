import React, { useReducer, useMemo, useContext, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '../../../../../styles/components/dialog/index.tsx';
import { makeStyles, cn } from '../../../../../styles/css-objects/index.ts';
import { DatePicker } from '../../../../../styles/components/inputs/index.ts';
import { styleguide } from '../../../../../styles/styleguide.ts';
import { Note } from '../../../../../cfds/client/graph/vertices/note.ts';
import { VertexManager } from '../../../../../cfds/client/graph/vertex-manager.ts';
import { useLogger } from '../../../core/cfds/react/logger.tsx';
import { assert } from '../../../../../base/error.ts';

const useStyles = makeStyles((theme) => ({
  datePicker: {
    margin: 'auto',
    marginTop: styleguide.gridbase * 3,
    maxWidth: styleguide.gridbase * 47,
    width: '100%',
  },
}));

interface DueDate {
  edit: (card: Note) => void;
}

const dueDateContext = React.createContext<DueDate | undefined>(undefined);

export function useDueDate(): DueDate {
  const dd = useContext(dueDateContext);
  assert(dd !== undefined);
  return dd;
}

function dueDateReducer(
  state: DueDataState,
  action: DueDataAction
): DueDataState {
  switch (action.type) {
    case 'close': {
      return {
        open: false,
      };
    }
    case 'edit': {
      return {
        card: action.card,
        open: true,
      };
    }
    default:
      throw new Error(`Unknown action type ${action.type}`);
  }
}

interface DueDataAction {
  type: string;
  card?: Note;
}

interface DueDataState {
  card?: Note;
  open: boolean;
}

export default function DueDateEditor({ children }: React.PropsWithChildren) {
  const styles = useStyles();
  const logger = useLogger();
  const [state, dispatch] = useReducer(dueDateReducer, {
    open: false,
  });

  const value = useMemo<DueDate>(
    () => ({
      edit: (card) => {
        dispatch({ type: 'edit', card });
      },
    }),
    []
  );
  const onDateSelected = useCallback(
    (card: Note, date: Date) => {
      const manager = card.manager as VertexManager<Note>;
      const proxy = manager.getVertexProxy();
      proxy.dueDate = date;

      logger.log({
        severity: 'INFO',
        event: 'MetadataChanged',
        type: 'due',
        vertex: card.key,
      });

      dispatch({ type: 'close' });
    },
    [logger, dispatch]
  );

  const onClose = useCallback(
    (card: Note) => {
      logger.log({
        severity: 'INFO',
        event: 'Cancel',
        flow: 'datePicker',
        vertex: card.key,
      });
      dispatch({ type: 'close' });
    },
    [logger, dispatch]
  );

  return (
    <dueDateContext.Provider value={value}>
      {children}
      <Dialog
        open={state.open}
        onClickOutside={() => onClose(state.card!)}
        onClose={() => onClose(state.card!)}
      >
        {state.card && (
          <DialogContent>
            <DialogHeader>Calendar</DialogHeader>
            <DatePicker
              className={cn(styles.datePicker)}
              value={state.card.dueDate}
              onChange={(date) => {
                onDateSelected(state.card!, date);
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </dueDateContext.Provider>
  );
}
