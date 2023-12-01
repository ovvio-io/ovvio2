import React from 'react';
import { IconProps, IconSize, IconColor } from './types.ts';
import { brandLightTheme as theme } from '../../theme.tsx';

export interface IconUngroupProps extends IconProps {
  color?: IconColor.Primary | IconColor.Mono | String;
}

export function IconUngroup({
  size = IconSize.Small,
  color,
  className,
}: IconUngroupProps) {
  const checkColor = color === 'blue' ? theme.primary.p9 : theme.mono.m5;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={checkColor}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.7"
        d="M1 1H15"
        stroke={checkColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M1 15H15"
        stroke={checkColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M15 1L15 15"
        stroke={checkColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M1 1L0.999999 15"
        stroke={checkColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        opacity="0.7"
        x="4.5"
        y="4.5"
        width="2"
        height="2"
        stroke={checkColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect
        opacity="0.7"
        x="4.5"
        y="9.5"
        width="2"
        height="2"
        stroke={checkColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect
        opacity="0.7"
        x="9.5"
        y="4.5"
        width="2"
        height="2"
        stroke={checkColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect
        opacity="0.7"
        x="9.5"
        y="9.5"
        width="2"
        height="2"
        stroke={checkColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M15 1L1.00005 14.8764"
          stroke={checkColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </svg>
  );
}
