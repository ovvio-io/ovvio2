export const TOGGLE_SELECTED = 'TOGGLE_SELECTED';
export const SET_ITEMS = 'SET_ITEMS';
export const TOGGLE_SELECT_ALL = 'TOGGLE_SELECT_ALL';

export function getInitialState(items, lastItems = {}) {
  const stateItems = {};
  let inSelection = false;
  let allSelected = true;

  for (let item of items) {
    const selected = !!lastItems[item.key];
    stateItems[item.key] = selected;
    inSelection = inSelection || selected;
    allSelected = allSelected && selected;
  }

  return {
    allItems: items,
    items: stateItems,
    selectedItems: items.filter(x => stateItems[x.key]),
    inSelection,
    allSelected,
  };
}

export default function multiSelectReducer(state, action) {
  const { type, payload } = action;
  let newState;
  switch (type) {
    case TOGGLE_SELECTED: {
      const key = payload.item.key;
      const items = {
        ...state.items,
        [key]: !state.items[key],
      };

      const vals = Object.values(items);

      newState = {
        ...state,
        items,
        selectedItems: state.allItems.filter(
          x => items[x.key]
        ),
        inSelection: vals.some(x => x),
        allSelected: vals.every(x => x),
      };
      break;
    }
    case SET_ITEMS: {
      return getInitialState(payload.items, state.items);
    }
    case TOGGLE_SELECT_ALL: {
      const items = {};
      for (let key of Object.keys(state.items)) {
        items[key] = !state.allSelected;
      }

      newState = {
        ...state,
        items,
        selectedItems: state.allItems.filter(
          x => items[x.key]
        ),
        inSelection: !state.allSelected,
        allSelected: !state.allSelected,
      };
      break;
    }
    default: {
      throw new Error(`Unknown action type ${type}`);
    }
  }

  newState.selectedItems = newState.allItems.filter(
    x => newState.items[x.ey]
  );

  return newState;
}
