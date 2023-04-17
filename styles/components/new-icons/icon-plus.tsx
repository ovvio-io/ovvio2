import React from 'react';
import { IconProps, IconSize } from './types.ts';

export function IconPlus({ className, size = IconSize.Small }: IconProps) {
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
        d="M0 8C0 3.58172 3.58172 0 8 0V0C12.4183 0 16 3.58172 16 8V8C16 12.4183 12.4183 16 8 16V16C3.58172 16 0 12.4183 0 8V8Z"
        fill="#E5E5E5"
      />
      <path
        opacity="0.6"
        d="M8 10L8 6"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M6 8L10 8"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
