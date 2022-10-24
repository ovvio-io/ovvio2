import { ParentTagState } from './state';

import { cn, makeStyles } from '@ovvio/styles/lib/css-objects';
import { styleguide } from '@ovvio/styles';
import { ChangeEvent } from 'react';

const SIZE = styleguide.gridbase * 2;

const useStyles = makeStyles(
  theme => ({
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

export interface FilterCheckboxProps {
  checked: boolean | ParentTagState;
  onChecked: () => void;
}

function getChecked(checked: boolean | ParentTagState) {
  switch (checked) {
    case ParentTagState.None:
    case ParentTagState.Some:
      return false;
    case ParentTagState.All:
      return true;
    default:
      return !!checked;
  }
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
  const isChecked = getChecked(checked);
  const onChange = (e: ChangeEvent) => {
    e.stopPropagation();
    onChecked();
  };

  return (
    <label className={cn(styles.checkbox)}>
      {isChecked && <CheckedIcon />}
      {checked === ParentTagState.Some && <PartialIcon />}
      <input
        onChange={onChange}
        className={cn(styles.input)}
        type="checkbox"
        checked={isChecked}
      />
    </label>
  );
}
