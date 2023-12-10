import React from 'react';
import { brandLightTheme as theme } from '../../theme.tsx';
import { IconColor, IconProps, IconSize } from './types.ts';

const COLOR_MAP = {
  [IconColor.Supporting]: {
    var1: theme.supporting.R1,
    var2: theme.supporting.R2,
    var3: theme.supporting.R3,
    var4: theme.supporting.R4,
  },
  [IconColor.Primary]: {
    var1: theme.primary.p8,
    var2: theme.primary.p9,
    var3: theme.primary.p10,
    var4: theme.primary.p7,
  },
};

export interface IconMenuCloseProps extends IconProps {
  color?: IconColor.Supporting | IconColor.Primary;
}

export function IconMenuClose({
  color = IconColor.Supporting,
  size = IconSize.Small,
  style = {},
  className,
}: IconMenuCloseProps) {
  const colors = COLOR_MAP[color];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        opacity="0.6"
        d="M5 8L11 14"
        stroke="#F5F9FB"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M11 2L5 8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
