import React from 'react';
import { IconProps, IconSize } from './types.ts';

export function IconViewNote({ size = IconSize.Small, className }: IconProps) {
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
        d="M1 13V13.5C1 14.3284 1.67157 15 2.5 15V15C3.32843 15 4 14.3284 4 13.5V13"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M1 10V13"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M1 10H3.5"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M15 12V13C15 14.1046 14.1046 15 13 15H12"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M3 15H12"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M15 1V12"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M4 1H15"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M4 1V13"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M8.82617 10.739L12.2727 6"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M7 8.13037L8.82605 10.739"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
