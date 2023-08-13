import React from 'react';
import { IconProps } from './types.ts';

export interface IconCollapseExpandProps extends IconProps {
  on: boolean;
}

export function IconCollapseExpand(props: IconCollapseExpandProps) {
  if (props.on) {
    return (
      <svg
        className={props.className}
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g id="color=Blue, Size=Default" clipPath="url(#clip0_1820_20679)">
          <rect
            id="Rectangle"
            opacity="0.6"
            x="1"
            y="1"
            width="4"
            height="4"
            fill="#8BC5EE"
            stroke="#1960CF"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect
            id="Rectangle_2"
            opacity="0.6"
            x="11"
            y="11"
            width="4"
            height="4"
            fill="#8BC5EE"
            stroke="#1960CF"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            id="Vector 8"
            opacity="0.6"
            d="M3 5V11C3 12.1046 3.89543 13 5 13H11"
            stroke="#1960CF"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        <defs>
          <clipPath id="clip0_1820_20679">
            <rect width="16" height="16" fill="white" />
          </clipPath>
        </defs>
      </svg>
    );
  }
  return (
    <svg
      className={props.className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g id="color=Default, Size=Default" clipPath="url(#clip0_529_717)">
        <rect
          id="Rectangle"
          opacity="0.6"
          x="1"
          y="1"
          width="4"
          height="4"
          fill="#CCCCCC"
          stroke="#4D4D4D"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect
          id="Rectangle_2"
          opacity="0.6"
          x="11"
          y="11"
          width="4"
          height="4"
          fill="#CCCCCC"
          stroke="#4D4D4D"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          id="Vector 8"
          opacity="0.6"
          d="M3 5V11C3 12.1046 3.89543 13 5 13H11"
          stroke="#4D4D4D"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_529_717">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
