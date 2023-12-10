import React from 'react';
import { brandLightTheme as theme } from '../../theme.tsx';
import { IconProps, IconSize } from './types.ts';

export enum AddDueDateState {
  Default = 'default',
  Primary = 'primary',
}

const COLOR_MAP = {
  [AddDueDateState.Default]: {
    var1: theme.mono.m10,
    var2: theme.mono.m6,
    var3: theme.mono.m4,
  },
  [AddDueDateState.Primary]: {
    var1: theme.primary.p10,
    var2: theme.primary.p9,
    var3: theme.primary.p7,
  },
};

export interface IconAddDueDateProps extends IconProps {
  state?: AddDueDateState;
}

export function IconAddDueDate({
  size = IconSize.Small,
  className,
  state = AddDueDateState.Primary, // Set default state if not provided
  style = {},
}: IconAddDueDateProps) {
  const colors = COLOR_MAP[state];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ paddingRight: '8px', ...style }}
      fill="none"
    >
      <path
        opacity="0.6"
        d="M8 13H1"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M13 2H1"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M13 6H1"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M1 2L1 13"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M13 2L13 8"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M9 1L9 3"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M5 1L5 3"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M13 15L13 11"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M15 13L11 13"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
