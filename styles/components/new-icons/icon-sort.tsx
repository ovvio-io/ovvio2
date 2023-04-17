import React from 'react';
import { IconSize, IconProps } from './types.ts';

export function IconSort({ size = IconSize.Small, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.6"
        d="M9.00012 5H14.5001"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M9.00012 1H16.0001"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M9.00012 9H13.0001"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M4.79822 15.0254L1.99821 12.4004"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M7.59802 12.4004L4.79801 15.0254"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M4.79968 1V15"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
