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

export interface IconArchiveProps extends IconProps {
  color?: IconColor.Supporting | IconColor.Primary;
}

export function IconArchive({
  color = IconColor.Supporting,
  size = IconSize.Small,
  style = {},
  className,
}: IconArchiveProps) {
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
        d="M7.99999 1L1 4.50003"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M8 1L15 4.50003"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M7.99999 11.5L1 8"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M15 8L8 11.5"
        stroke={colors.var4}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M7.99999 15L1 11.5"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M15 11.5L8 15"
        stroke={colors.var4}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M7.99999 7.99996L1 4.5"
        stroke={colors.var3}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M15 4.5L8 7.99996"
        stroke={colors.var4}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
