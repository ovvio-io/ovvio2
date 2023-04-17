import React from 'react';
import { IconProps, IconSize } from './types.ts';

export function IconPinOff({ className, size = IconSize.Small }: IconProps) {
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
        opacity="0.6"
        d="M2.75 7.125L8.875 13.25L9.75 12.375L10.625 8.875L14.125 5.375L10.625 1.875L7.125 5.375L3.625 6.25L2.75 7.125Z"
        fill="#CCCCCC"
        stroke="#B3B3B3"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M1 15L5.8125 10.1875"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M2.75 7.125L8.875 13.25"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M8.875 13.25L9.75 12.375L10.625 8.875"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M10.625 8.875L14.125 5.375"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M2.75 7.125L3.625 6.25L7.125 5.375"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M10.625 1.875L7.125 5.375"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M9.74976 1L14.9998 6.25"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
