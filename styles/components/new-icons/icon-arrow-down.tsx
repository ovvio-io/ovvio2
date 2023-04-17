import React from 'react';
import { IconProps, IconSize } from './types.ts';

export function IconArrowDown({ size = IconSize.Small, className }: IconProps) {
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
        opacity="0.8"
        d="M10 8L6 4"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.8"
        d="M6 12L10 8"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
