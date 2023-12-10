import React from 'react';
import { brandLightTheme as theme } from '../../theme.tsx';
import { IconProps, IconSize } from './types.ts';

export enum DueDateState {
  Default = 'default',
  Today = 'today',
  OverDue = 'overdue',
  Done = 'done',
  Clear = 'clear',
}

const COLOR_MAP = {
  [DueDateState.Default]: {
    var1: theme.mono.m4,
    var2: theme.mono.m10,
  },
  [DueDateState.Today]: {
    var1: theme.secondary.s5,
    var2: theme.secondary.s6,
  },
  [DueDateState.OverDue]: {
    var1: theme.supporting.O3,
    var2: theme.supporting.O4,
  },
};

export interface IconDueDateProps extends IconProps {
  state?: DueDateState;
}

export function IconDueDate({
  size = IconSize.Small,
  className,
  state = DueDateState.Default,
  style = {},
}: IconDueDateProps) {
  const colors = COLOR_MAP[state];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      style={{ paddingRight: '8px', ...style }}
      viewBox="0 0 15 15"
      fill="none"
    >
      <path
        opacity="0.6"
        d="M14 14H1"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M14 2H1"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M1 2L1 14"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M14 2L14 14"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M10 1L10 3"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M5 1L5 3"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M14 6H1"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
