import React from 'react';
import { IconProps, IconSize } from './types.ts';
import { brandLightTheme as theme } from '../../theme.tsx';

export enum IconState {
  None = 'none',
  Blue = 'blue',
}

const COLOR_MAP = {
  [IconState.None]: {
    var1: theme.mono.m5,
    var2: theme.mono.m6,
    var3: theme.mono.m4,
  },

  [IconState.Blue]: {
    var1: theme.primary.p10,
    var2: theme.primary.p9,
    var3: theme.primary.p7,
  },
};

export interface ComposeStateProps extends IconProps {
  state?: IconState;
}

export function IconCompose2({
  size = IconSize.Small,
  className,
  state = IconState.Blue,
  style = {},
}: ComposeStateProps) {
  const colors = COLOR_MAP[state];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={style}
    >
      <path
        opacity="0.7"
        d="M4.5 13.2578L2.37868 11.1365"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M4.5 13.2578L14.3995 3.35832"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M10.1565 3.35817L12.2778 5.47949"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M12.157 1.35817L14.2783 3.47949"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M2.37842 11.1362L12.2779 1.23674"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M2.37868 11.1365L4.5 13.2578"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M1.31825 14.3182L4.50023 13.2576"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M1.31836 14.3184L2.37902 11.1364"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M12.0961 3.53996L13.8638 5.30773C14.6449 6.08878 14.6449 7.35511 13.8638 8.13615L13.1567 8.84326"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
