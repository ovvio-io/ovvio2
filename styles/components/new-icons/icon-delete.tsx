import React from 'https://esm.sh/react@18.2.0';
import { IconSize, IconProps } from './types.ts';

export function IconDelete({ size = IconSize.Small, className }: IconProps) {
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
        d="M2.5 3V13C2.5 14.1046 3.39543 15 4.5 15H11.5C12.6046 15 13.5 14.1046 13.5 13V3"
        stroke="#3F3F3F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.7"
        d="M6 3V2C6 1.44772 6.44772 1 7 1H9C9.55228 1 10 1.44772 10 2V3"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        opacity="0.7"
        x1="15"
        y1="3"
        x2="1"
        y2="3"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        opacity="0.7"
        x1="6"
        y1="7"
        x2="6"
        y2="12"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        opacity="0.7"
        x1="10"
        y1="7"
        x2="10"
        y2="12"
        stroke="#4D4D4D"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
