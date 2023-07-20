import React, {
  useReducer,
  useEffect,
  useMemo,
  useContext,
} from 'react';
import reducer, {
  getInitialState,
  SET_ITEMS,
} from './reducer';

const context = React.createContext();

export function MultiSelectContext({ items, children }) {
  const [state, dispatch] = useReducer(
    reducer,
    items,
    getInitialState
  );
  useEffect(() => {
    dispatch({
      type: SET_ITEMS,
      payload: { items },
    });
  }, [items]);
  const ctx = useMemo(() => {
    return {
      dispatch,
      state,
    };
  }, [state]);

  return (
    <context.Provider value={ctx}>
      {children}
    </context.Provider>
  );
}

export function useMultiSelectContext() {
  return useContext(context);
}
