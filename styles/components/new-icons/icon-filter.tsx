import React from 'react';
import { IconSize, IconProps } from './types.ts';

export function IconFilter({ size = IconSize.Small, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        opacity="0.6"
        cx="2.75"
        cy="11.125"
        r="1.75"
        transform="rotate(-90 2.75 11.125)"
        stroke="#262626"
        strokeWidth="2"
      />
      <path
        opacity="0.6"
        d="M2.75 15.5L2.75 12.875"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M2.75 9.375L2.75 1.5"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        opacity="0.6"
        cx="13.25"
        cy="11.125"
        r="1.75"
        transform="rotate(-90 13.25 11.125)"
        stroke="#262626"
        strokeWidth="2"
      />
      <path
        opacity="0.6"
        d="M13.25 15.5L13.25 12.875"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M13.25 9.375L13.25 1.5"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        opacity="0.6"
        cx="8"
        cy="5.875"
        r="1.75"
        transform="rotate(-90 8 5.875)"
        stroke="#262626"
        strokeWidth="2"
      />
      <path
        opacity="0.6"
        d="M8 15.5L8 7.625"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M8 4.125L8 1.5"
        stroke="#262626"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
