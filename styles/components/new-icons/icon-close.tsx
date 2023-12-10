import React from 'react';
import { brandLightTheme as theme } from '../../theme.tsx';
import { IconColor, IconProps, IconSize } from './types.ts';
import { COLORS } from '../color-picker.tsx';

const COLOR_MAP = {
  [IconColor.Mono]: {
    var1: theme.mono.m4,
    var2: theme.mono.m3,
  },
  [IconColor.Primary]: {
    var1: theme.primary.p9,
    var2: theme.primary.p10,
  },
};

export interface IconCloseProps extends IconProps {
  color: IconColor.Mono | IconColor.Primary;
}

export function IconClose({
  color = IconColor.Primary,
  size = IconSize.Small,
  style = {},
  className,
}: IconCloseProps) {
  const colors = COLOR_MAP[color];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
    >
      <path
        opacity="0.6"
        d="M7.4495 7.44981L2.49976 2.50006"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M2.49976 7.50006L7.4495 2.55031"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
