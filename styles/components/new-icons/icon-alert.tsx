import React from 'react';
import { IconProps } from './types.ts';

export function IconAlert({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g id="Icon/Alert" clip-path="url(#clip0_3393_238001)">
        <circle
          id="Ellipse 53"
          opacity="0.8"
          cx="8"
          cy="8"
          r="7"
          stroke="#E24716"
          strokeWidth="2"
        />
        <g id="Group 11319">
          <circle
            id="Ellipse 41"
            cx="8"
            cy="12"
            r="1"
            transform="rotate(-90 8 12)"
            fill="#B11A04"
          />
        </g>
        <path
          id="Line 85"
          d="M8 4L8 9"
          stroke="#B11A04"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_3393_238001">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
