import { MouseEvent } from 'react';

export type ToggleAction = 'single' | 'range' | 'clearOthers' | 'clearAll';

export type SelectionItem = string;

export interface SelectionResult {
  actionType: ToggleAction;
  toggleType: 'selected' | 'deselected';
  allSelectedItems: SelectionItem[];
}

export function toggleSelectionItem(
  items: SelectionItem[],
  toggled: SelectionItem,
  selectedKeys: SelectionItem[],
  lastSelectedKey?: string,
  actionType: ToggleAction = 'single'
): SelectionResult {
  const toggledIndex = items.findIndex((x) => x === toggled);
  if (toggledIndex === -1) {
    debugger;
    return {
      actionType: 'clearAll',
      toggleType: 'deselected',
      allSelectedItems: [],
    };
  }

  if ((!lastSelectedKey && actionType === 'range') || !actionType) {
    actionType = 'single';
  }

  switch (actionType) {
    case 'range': {
      const lastSelectedIndex = items.findIndex((x) => x === lastSelectedKey);
      const slice = items.slice(
        Math.min(lastSelectedIndex, toggledIndex),
        Math.max(lastSelectedIndex, toggledIndex) + 1
      );
      const selected = selectedKeys.includes(toggled);
      let allSelectedItems = selectedKeys;
      if (selected) {
        allSelectedItems = selectedKeys.filter((x) => !slice.includes(x));
      } else {
        allSelectedItems = Array.from(new Set([...selectedKeys, ...slice]));
      }
      return {
        actionType: 'range',
        toggleType: selected ? 'selected' : 'deselected',
        allSelectedItems,
      };
    }
    case 'clearOthers': {
      return {
        actionType: 'clearOthers',
        toggleType: 'selected',
        allSelectedItems: [toggled],
      };
    }

    case 'clearAll':
      return {
        actionType: 'clearAll',
        toggleType: 'deselected',
        allSelectedItems: [],
      };

    case 'single':
    default: {
      const newSelected = selectedKeys.filter((x) => x !== toggled);
      const toggleType =
        newSelected.length === selectedKeys.length ? 'selected' : 'deselected';
      if (toggleType === 'selected') {
        newSelected.push(toggled);
      }
      return {
        actionType: 'single',
        toggleType,
        allSelectedItems: newSelected,
      };
    }
  }
}

export function toggleActionFromEvent(e: MouseEvent): ToggleAction {
  if (e.ctrlKey) {
    return 'clearOthers';
  }
  if (e.shiftKey) {
    return 'range';
  }
  return 'single';
}
