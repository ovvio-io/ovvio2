import React from 'react';
import { IconProps, IconSize } from './types.ts';

export function IconGroup({ size = IconSize.Small, className }: IconProps) {
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
        opacity="0.7"
        d="M1 1H15"
        stroke="#262626"
        stroke-width="2"
        stroke-linecap="round"
      />
      <path
        opacity="0.7"
        d="M1 15H15"
        stroke="#262626"
        stroke-width="2"
        stroke-linecap="round"
      />
      <path
        opacity="0.7"
        d="M15 1L15 15"
        stroke="#262626"
        stroke-width="2"
        stroke-linecap="round"
      />
      <path
        opacity="0.7"
        d="M1 1L0.999999 15"
        stroke="#262626"
        stroke-width="2"
        stroke-linecap="round"
      />
      <rect
        opacity="0.7"
        x="4.5"
        y="4.5"
        width="2"
        height="2"
        stroke="#262626"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <rect
        opacity="0.7"
        x="4.5"
        y="9.5"
        width="2"
        height="2"
        stroke="#262626"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <rect
        opacity="0.7"
        x="9.5"
        y="4.5"
        width="2"
        height="2"
        stroke="#262626"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <rect
        opacity="0.7"
        x="9.5"
        y="9.5"
        width="2"
        height="2"
        stroke="#262626"
        stroke-width="2"
        stroke-linejoin="round"
      />
    </svg>
  );
}
