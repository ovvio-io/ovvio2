import React from 'react';
import { IconProps, IconSize } from './types.ts';

export function IconExportMail({
  size = IconSize.Small,
  className,
}: IconProps) {
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
        d="M1 15H15"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M1 6L6.83752 1.83034C7.53292 1.33363 8.46708 1.33363 9.16248 1.83034L15 6"
        stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M15 6L15 15"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M14.982 14.982L9.80005 9.8"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M0.999904 14.982L6.18188 9.8"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M1 6L0.999999 15"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.8"
        d="M1 6L6.83752 10.1697C7.53292 10.6664 8.46708 10.6664 9.16248 10.1697L15 6"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
