import React from 'react';
import { brandLightTheme as theme } from '../../theme.tsx';
import { IconProps, IconSize } from './types.ts';

export enum HideState {
  Default = 'default',
  Primary = 'primary',
}

const COLOR_MAP = {
  [HideState.Default]: {
    var1: theme.mono.m4,
    var2: theme.mono.m10,
  },
  [HideState.Primary]: {
    var1: theme.primary.p10,
    var2: theme.primary.p9,
  },
};

export interface IconHideProps extends IconProps {
  state?: HideState;
  color?: HideState.Primary | HideState.Default;
}

export function IconHide({
  color,
  size = IconSize.Small,
  className,
  state = HideState.Primary,
  style = {},
}: IconHideProps) {
  const colors = COLOR_MAP[state];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="8"
      style={{ paddingRight: '8px', ...style }}
      viewBox="0 0 16 8"
      fill="none"
    >
      <path
        opacity="0.7"
        d="M13.5999 1C13.5999 1 13.3757 1.46715 12.8999 2.06011C12.4473 2.62416 11.7672 3.30206 10.8359 3.8C10.0664 4.21143 9.12549 4.5 7.9999 4.5C6.87431 4.5 5.93341 4.21143 5.16393 3.8C4.28234 3.32863 3.62577 2.69599 3.1743 2.15133C2.64747 1.51577 2.3999 1 2.3999 1"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M3.17439 2.15132L1 3.09999"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M3.17439 2.15132L1 3.09999"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M5.16413 3.8L3.1001 5.9"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M5.16413 3.8L3.1001 5.9"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M12.8999 2.0601L14.9999 3.09999"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M12.8999 2.0601L14.9999 3.09999"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M10.8359 3.8L12.55 5.9"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M10.8359 3.8L12.55 5.9"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M8 4.5V6.95"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M8 4.5V6.95"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
