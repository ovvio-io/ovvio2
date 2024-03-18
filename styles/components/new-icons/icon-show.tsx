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

export interface IconShowProps extends IconProps {
  color?: IconColor.Primary | IconColor.Mono;
}

export function IconShow({
  color,
  size = IconSize.Small,
  style = {},
  className,
}: IconShowProps) {
  color = color === undefined ? IconColor.Mono : color;

  const colors = COLOR_MAP[color];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ paddingRight: '8px', ...style }}
      width="16"
      height="11"
      viewBox="0 0 16 11"
      fill="none"
    >
      <path
        opacity="0.7"
        d="M15 5.2C15 5.2 12.9 1 8 1C3.1 1 1 5.2 1 5.2"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M15 5.19999C15 5.19999 12.9 9.39999 8 9.39999C3.1 9.39999 1 5.19999 1 5.19999"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.8"
        d="M10 5.2C10 6.30457 9.10457 7.2 8 7.2C6.89543 7.2 6 6.30457 6 5.2"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M10 5.2C10 4.09543 9.10457 3.2 8 3.2C6.89543 3.2 6 4.09543 6 5.2"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
