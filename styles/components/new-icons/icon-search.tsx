import React from 'react';
import { brandLightTheme as theme } from '../../theme.tsx';
import { IconColor, IconProps, IconSize } from './types.ts';

const COLOR_MAP = {
  [IconColor.Mono]: {
    var1: theme.mono.m4,
    var2: theme.mono.m3,
    var3: theme.mono.m4,
  },
  [IconColor.Primary]: {
    var1: theme.primary.p8,
    var2: theme.primary.p9,
    var3: theme.primary.p10,
  },
};

export interface IconSearchProps extends IconProps {
  color?: IconColor.Primary | IconColor.Mono;
}

export function IconSearch({
  color = IconColor.Primary,
  size = IconSize.Small,
  style = {},
  className,
}: IconSearchProps) {
  const colors = COLOR_MAP[color];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ paddingRight: '8px', ...style }}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        opacity="0.6"
        d="M9.80029 11.5C7.03887 11.5 4.80029 9.26142 4.80029 6.5"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M9.80029 11.5C12.5617 11.5 14.8003 9.26142 14.8003 6.5C14.8003 3.73858 12.5617 1.5 9.80029 1.5"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M4.80029 6.5C4.80029 3.73858 7.03887 1.5 9.80029 1.5"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.8"
        d="M7.61817 5.86146C8.07141 4.55726 9.49609 3.86741 10.8003 4.32065"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M6.38818 9.91211L1.30029 14.5"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
