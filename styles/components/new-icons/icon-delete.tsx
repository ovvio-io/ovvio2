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

export interface IconDeleteProps extends IconProps {
  color?: IconColor.Primary | IconColor.Mono;
}

export function IconDelete({
  color = IconColor.Primary,
  size = IconSize.Small,
  style = {},
  className,
}: IconDeleteProps) {
  const colors = COLOR_MAP[color];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ paddingRight: '8px', ...style }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_2726_2943)">
        <path
          opacity="0.7"
          d="M2.5 3V13C2.5 14.1046 3.39543 15 4.5 15H11.5C12.6046 15 13.5 14.1046 13.5 13V3"
          stroke={colors.var3}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M6 3V2C6 1.44772 6.44772 1 7 1H9C9.55228 1 10 1.44772 10 2V3"
          stroke={colors.var2}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          opacity="0.7"
          x1="15"
          y1="3"
          x2="1"
          y2="3"
          stroke={colors.var2}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          opacity="0.7"
          x1="6"
          y1="7"
          x2="6"
          y2="12"
          stroke={colors.var2}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          opacity="0.7"
          x1="10"
          y1="7"
          x2="10"
          y2="12"
          stroke={colors.var2}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_2726_2943">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
