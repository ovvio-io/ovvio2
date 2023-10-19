import React, { ChangeEvent } from 'react';
import {
  makeStyles,
  cn,
} from '../../../../../../../../styles/css-objects/index.ts';
import { styleguide } from '../../../../../../../../styles/styleguide.ts';

const SIZE = styleguide.gridbase * 2;

const useStyles = makeStyles(
  (theme) => ({
    checkbox: {
      display: 'inline-flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE * 0.5,
      background: theme.background[0],
    },
    input: {
      appearance: 'none',
      margin: 0,
    },
  }),
  'filter-checkbox_e52d7c'
);

export type FilterCheckboxState = 'on' | 'off' | 'partial';

export function getFilterCheckboxState(
  s: boolean | FilterCheckboxState
): FilterCheckboxState {
  if (typeof s === 'string') {
    return s;
  }
  return s ? 'on' : 'off';
}

export interface FilterCheckboxProps {
  checked: boolean | FilterCheckboxState;
  onChecked: () => void;
}

function CheckedIcon() {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.6"
        d="M2.82642 6.73901L7.00024 1"
        stroke="#3184DD"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M1.00024 4.13037L2.8263 6.73901"
        stroke="#1960CF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PartialIcon() {
  return (
    <svg
      width="8"
      height="2"
      viewBox="0 0 8 2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.6"
        d="M1 1L7 1"
        stroke="#1960CF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FilterCheckbox({ checked, onChecked }: FilterCheckboxProps) {
  const styles = useStyles();
  checked = getFilterCheckboxState(checked);
  const onChange = (e: ChangeEvent) => {
    e.stopPropagation();
    onChecked();
  };

  return (
    <label className={cn(styles.checkbox)}>
      {checked === 'on' && <CheckedIcon />}
      {checked === 'partial' && <PartialIcon />}
      <input
        onChange={onChange}
        className={cn(styles.input)}
        type="checkbox"
        checked={checked === 'on'}
      />
    </label>
  );
}
