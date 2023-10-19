import { MouseEvent } from 'react';

export enum ToggleAction {
  Single = 'single',
  Range = 'range',
  ClearOthers = 'clearOthers',
}

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
  actionType = ToggleAction.Single
): SelectionResult {
  const toggledIndex = items.findIndex(x => x === toggled);
  if (toggledIndex === -1) {
    // debugger;
    return;
  }

  if ((!lastSelectedKey && actionType === ToggleAction.Range) || !actionType) {
    actionType = ToggleAction.Single;
  }

  switch (actionType) {
    case ToggleAction.Range: {
      const lastSelectedIndex = items.findIndex(x => x === lastSelectedKey);
      const slice = items.slice(
        Math.min(lastSelectedIndex, toggledIndex),
        Math.max(lastSelectedIndex, toggledIndex) + 1
      );
      const selected = selectedKeys.includes(toggled);
      let allSelectedItems = selectedKeys;
      if (selected) {
        allSelectedItems = selectedKeys.filter(x => !slice.includes(x));
      } else {
        allSelectedItems = Array.from(new Set([...selectedKeys, ...slice]));
      }
      return {
        actionType: ToggleAction.Range,
        toggleType: selected ? 'selected' : 'deselected',
        allSelectedItems,
      };
    }
    case ToggleAction.ClearOthers: {
      return {
        actionType: ToggleAction.ClearOthers,
        toggleType: 'selected',
        allSelectedItems: [toggled],
      };
    }
    case ToggleAction.Single:
    default: {
      const newSelected = selectedKeys.filter(x => x !== toggled);
      const toggleType =
        newSelected.length === selectedKeys.length ? 'selected' : 'deselected';
      if (toggleType === 'selected') {
        newSelected.push(toggled);
      }
      return {
        actionType: ToggleAction.Single,
        toggleType,
        allSelectedItems: newSelected,
      };
    }
  }
}

export function toggleActionFromEvent(e: MouseEvent) {
  if (e.ctrlKey) {
    return ToggleAction.ClearOthers;
  }
  if (e.shiftKey) {
    return ToggleAction.Range;
  }
  return ToggleAction.Single;
}
