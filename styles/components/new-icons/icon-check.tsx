import React from 'https://esm.sh/react@18.2.0';
import { brandLightTheme as theme } from '../../theme.tsx';
import { IconSize, IconProps, IconColor } from './types.ts';

export interface IconCheckProps extends IconProps {
  color?: IconColor.Primary | IconColor.Mono;
}

const COLOR_MAP = {
  [IconColor.Primary]: {
    var1: theme.primary.p9,
    var2: theme.primary.p10,
  },
  [IconColor.Mono]: {
    var1: theme.mono.m5,
    var2: theme.mono.m4,
  },
};

export function IconCheck({
  size = IconSize.Small,
  className,
  color = IconColor.Mono,
}: IconCheckProps) {
  const colorMap = COLOR_MAP[color];
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.6"
        d="M6.3335 11.3333L11.6668 4"
        stroke={colorMap.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M4 8L6.33333 11.3333"
        stroke={colorMap.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
