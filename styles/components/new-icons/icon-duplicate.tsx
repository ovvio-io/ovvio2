import React from 'https://esm.sh/react@18.2.0';
import { IconProps, IconSize } from './types.ts';

export function IconDuplicate({ size = IconSize.Small, className }: IconProps) {
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
        d="M14 15H5"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M5 4V15"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M2 1V12"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M5 4H14"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M2 1H11"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M14 4V15"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        opacity="0.7"
        x1="11"
        y1="1"
        x2="11"
        y2="4"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        opacity="0.7"
        x1="2"
        y1="12"
        x2="5"
        y2="12"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
