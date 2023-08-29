import React from 'react';
import { IconProps, IconSize } from './types.ts';

export function IconAttachment({
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
        opacity="0.6"
        d="M9.64043 5.0444C10.2254 4.45991 11.1764 4.45991 11.7614 5.0444C12.3464 5.62939 12.3464 6.58087 11.7614 7.16585L5.79639 12.9237"
        // stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M5.79639 8.89188L9.64043 5.04439"
        // stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M5.79624 12.9237C4.81976 13.9002 3.2378 13.9002 2.26132 12.9237C1.28484 11.9477 1.22815 9.99204 2.20463 9.01606L8.07373 3.23189"
        // stroke="#8C8C8C"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M8.07373 3.2319C9.45278 1.73189 12.2612 1.98602 13.5076 3.23191"
        // stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M13.5074 3.23189C14.7538 4.47778 15.2612 7.04438 13.5074 8.79767L8.76123 13.5444"
        // stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
