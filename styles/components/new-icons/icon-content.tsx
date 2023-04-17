import React from 'react';
import { IconProps, IconSize } from './types.ts';

export function IconContent({ className, size = IconSize.Small }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.6"
        d="M3.99832 6.31999H13.9983"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M3.99832 2.98673H13.9983"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M3.99832 9.65348H13.9983"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M3.99832 12.9867H13.9983"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
