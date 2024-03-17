import React from 'react';
import { brandLightTheme as theme } from '../../theme.tsx';
import { IconProps, IconSize } from './types.ts';

export enum DueDateState {
  None = 'none',
  Late = 'late',
  Clear = 'clear',
  Today = 'today',
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
  [DueDateState.Clear]: {
    var1: theme.secondary.s7,
    var2: theme.secondary.s5,
    var3: theme.secondary.s7,
  },
  [DueDateState.Today]: {
    var1: theme.secondary.s7,
    var2: theme.secondary.s5,
    var3: theme.secondary.s7,
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

  switch (state) {
    case DueDateState.Today:
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            opacity="0.6"
            d="M14 14H1"
            stroke="#F9B55A"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M14 2H1"
            stroke="#F9B55A"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M1 2L1 14"
            stroke="#F9B55A"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M14 2L14 14"
            stroke="#F9B55A"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M10 1L10 3"
            stroke="#F9B55A"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M5 1L5 3"
            stroke="#F9B55A"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M14 6H1"
            stroke="#EFD2AB"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case DueDateState.Clear:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          style={{ paddingRight: '8px' }}
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
        >
          <path
            opacity="0.6"
            d="M14 14H1"
            stroke="#1960CF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M14 2H1"
            stroke="#1960CF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M1 2L1 14"
            stroke="#1960CF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M14 2L14 14"
            stroke="#1960CF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M10 1L10 3"
            stroke="#1960CF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M5 1L5 3"
            stroke="#1960CF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M14 6H1"
            stroke="#5793E0"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case DueDateState.Late:
      return (
        <svg
          className={className}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            opacity="0.6"
            d="M14 14H1"
            stroke="#B11A04"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M14 2H1"
            stroke="#B11A04"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M1 2L1 14"
            stroke="#B11A04"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M14 2L14 14"
            stroke="#B11A04"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M10 1L10 3"
            stroke="#B11A04"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M5 1L5 3"
            stroke="#B11A04"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M14 6H1"
            stroke="#E24716"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case DueDateState.None:
    default:
      return (
        <svg
          className={className}
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            opacity="0.6"
            d="M14 14H1"
            stroke="#262626"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M14 2H1"
            stroke="#262626"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M1 2L1 14"
            stroke="#262626"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M14 2L14 14"
            stroke="#262626"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M10 1L10 3"
            stroke="#262626"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M5 1L5 3"
            stroke="#262626"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            opacity="0.6"
            d="M14 6H1"
            stroke="#8C8C8C"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
  }

  // return (
  //   <svg
  //     className={className}
  //     width={size}
  //     height={size}
  //     viewBox="0 0 16 16"
  //     fill="none"
  //     xmlns="http://www.w3.org/2000/svg"
  //   >
  //     <path
  //       opacity="0.6"
  //       d="M8 15C11.866 15 15 11.866 15 8"
  //       stroke={colors.var1}
  //       strokeWidth="2"
  //       strokeLinecap="round"
  //     />
  //     <path
  //       opacity="0.6"
  //       d="M8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1"
  //       stroke={colors.var2}
  //       strokeWidth="2"
  //       strokeLinecap="round"
  //     />
  //     <path
  //       opacity="0.6"
  //       d="M15 8C15 4.13401 11.866 1 8 1"
  //       stroke={colors.var3}
  //       strokeWidth="2"
  //       strokeLinecap="round"
  //     />
  //     <path
  //       opacity="0.6"
  //       d="M8 8L10.5 10.5"
  //       stroke={colors.var3}
  //       strokeWidth="2"
  //       strokeLinecap="round"
  //     />
  //     <path
  //       opacity="0.6"
  //       d="M8 4.54541V7.99996"
  //       stroke={colors.var1}
  //       strokeWidth="2"
  //       strokeLinecap="round"
  //     />
  //   </svg>
  // );
}
