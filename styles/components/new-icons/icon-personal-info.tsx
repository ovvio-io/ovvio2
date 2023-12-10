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

export interface IconPersonalInfoProps extends IconProps {
  color?: IconColor.Supporting | IconColor.Primary;
}

export function IconPersonalInfo({
  color = IconColor.Supporting,
  size = IconSize.Small,
  style = {},
  className,
}: IconPersonalInfoProps) {
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
        opacity="0.7"
        d="M11 5C11 6.65685 9.65685 8 8 8C6.34315 8 5 6.65685 5 5"
        stroke={colors.var4}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5"
        stroke={colors.var4}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M2 15V14C2 10.6863 4.68629 8 8 8V8"
        stroke={colors.var4}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M14 15H2"
        stroke={colors.var4}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M14 15V14C14 10.6863 11.3137 8 8 8V8"
        stroke={colors.var4}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
