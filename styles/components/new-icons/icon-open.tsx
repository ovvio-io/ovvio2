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

export interface IconOpenProps extends IconProps {
  color?: IconColor.Primary | IconColor.Mono;
}

export function IconOpen({
  color = IconColor.Primary,
  size = IconSize.Small,
  style = {},
  className,
}: IconOpenProps) {
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
      <g clipPath="url(#clip0_2726_8814)">
        <path
          opacity="0.7"
          d="M12.8999 1.5V6.65"
          stroke={colors.var3}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0. 7"
          d="M1 1.5H12.9"
          stroke={colors.var3}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M1 1.5V13"
          stroke={colors.var2}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M4.1 13V13.15C4.1 14.006 3.40604 14.7 2.55 14.7V14.7C1.69396 14.7 1 14.006 1 13.15V13"
          stroke={colors.var2}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M4.1001 7.34998V13"
          stroke={colors.var2}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.8"
          d="M15 7.34998V12.5"
          stroke={colors.var3}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.8"
          d="M12.5 14.7H13C14.1046 14.7 15 13.8046 15 12.7V12.5"
          stroke={colors.var1}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M2.7998 14.7H12.4998"
          stroke={colors.var1}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.8"
          d="M4.1001 7.34998H15.0001"
          stroke={colors.var1}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_2726_8814">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
