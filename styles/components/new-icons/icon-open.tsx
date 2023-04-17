import React from 'react';
import { IconProps, IconSize } from './types.ts';

export function IconOpen({ size = IconSize.Small, className }: IconProps) {
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
        d="M12.8999 1.5V6.65"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M1 1.5H12.9"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M1 1.5V13"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M4.1 13V13.15C4.1 14.006 3.40604 14.7 2.55 14.7V14.7C1.69396 14.7 1 14.006 1 13.15V13"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M4.1001 7.35V13"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.8"
        d="M15 7.35V12.5"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.8"
        d="M12.5 14.7H13C14.1046 14.7 15 13.8046 15 12.7V12.5"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M2.7998 14.7H12.4998"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.8"
        d="M4.1001 7.35H15.0001"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
