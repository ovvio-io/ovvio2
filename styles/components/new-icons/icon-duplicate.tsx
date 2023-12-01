import React from 'react';
import { IconProps, IconSize } from './types.ts';
import { brandLightTheme as theme } from '../../theme.tsx';

export enum DuplicateState {
  None = 'none',
  Late = 'late',
  Blue = 'blue',
}

const COLOR_MAP = {
  [DuplicateState.None]: {
    var1: theme.mono.m5,
    var2: theme.mono.m6,
    var3: theme.mono.m4,
  },
  [DuplicateState.Late]: {
    var1: theme.supporting.O3,
    var2: theme.supporting.O4,
    var3: theme.supporting.O2,
  },
  [DuplicateState.Blue]: {
    var1: theme.primary.p10,
    var2: theme.primary.p9,
    var3: theme.primary.p8,
  },
};

export interface DuplicateStateProps extends IconProps {
  state?: DuplicateState;
}

export function IconDuplicate({
  size = IconSize.Small,
  className,
  state = DuplicateState.Blue,
  style = {},
}: DuplicateStateProps) {
  const colors = COLOR_MAP[state];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ paddingRight: '8px', ...style }}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        opacity="0.7"
        d="M14 15H5"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M5 4V15"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M2 1V12"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M5 4H14"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M2 1H11"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M14 4V15"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        opacity="0.7"
        x1="11"
        y1="1"
        x2="11"
        y2="4"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        opacity="0.7"
        x1="2"
        y1="12"
        x2="5"
        y2="12"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
