import React from 'https://esm.sh/react@18.2.0';
import { brandLightTheme as theme } from '../../theme.tsx';
import { IconProps, IconSize } from './types.ts';

export enum DueDateState {
  None = 'none',
  Late = 'late',
}

const COLOR_MAP = {
  [DueDateState.None]: {
    var1: theme.mono.m5,
    var2: theme.mono.m6,
    var3: theme.mono.m4,
  },
  [DueDateState.Late]: {
    var1: theme.supporting.O3,
    var2: theme.supporting.O4,
    var3: theme.supporting.O2,
  },
};

export interface IconDueDateProps extends IconProps {
  state?: DueDateState;
}

export function IconDueDate({
  size = IconSize.Small,
  className,
  state = DueDateState.None,
}: IconDueDateProps) {
  const colors = COLOR_MAP[state];

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.6"
        d="M8 15C11.866 15 15 11.866 15 8"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M15 8C15 4.13401 11.866 1 8 1"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M8 8L10.5 10.5"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M8 4.54541V7.99996"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
