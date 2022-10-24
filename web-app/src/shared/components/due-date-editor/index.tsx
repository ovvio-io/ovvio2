import React, { useReducer, useMemo, useContext, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@ovvio/styles/lib/components/dialog';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { DatePicker } from '@ovvio/styles/lib/components/inputs';
import { styleguide } from '@ovvio/styles/lib';
import { Note } from '@ovvio/cfds/lib/client/graph/vertices';
import { useEventLogger } from 'core/analytics';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';

const useStyles = makeStyles(theme => ({
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

const dueDateContext = React.createContext<DueDate>(undefined);

export function useDueDate() {
  return useContext(dueDateContext);
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

export default function DueDateEditor({ children }) {
  const styles = useStyles();
  const eventLogger = useEventLogger();
  const [state, dispatch] = useReducer(dueDateReducer, {
    open: false,
  });

  const value = useMemo<DueDate>(
    () => ({
      edit: card => {
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

      eventLogger.cardAction('CARD_SET_DUE_DATE_COMPLETED', card, {});

      dispatch({ type: 'close' });
    },
    [eventLogger, dispatch]
  );

  const onClose = useCallback(
    (card: Note) => {
      eventLogger.cardAction('CARD_SET_DUE_DATE_CANCELED', card, {});
      dispatch({ type: 'close' });
    },
    [eventLogger, dispatch]
  );

  return (
    <dueDateContext.Provider value={value}>
      {children}
      <Dialog
        open={state.open}
        onClickOutside={() => onClose(state.card)}
        onClose={() => onClose(state.card)}
      >
        {state.card && (
          <DialogContent>
            <DialogHeader>Calendar</DialogHeader>
            <DatePicker
              className={cn(styles.datePicker)}
              value={state.card.dueDate}
              onChange={date => {
                onDateSelected(state.card, date);
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </dueDateContext.Provider>
  );
}
