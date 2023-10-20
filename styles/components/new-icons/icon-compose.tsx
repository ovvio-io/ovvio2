import React from "react";
import { IconProps, IconSize } from "./types.ts";

export function IconCompose({ size = IconSize.Small, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_1176_37502)">
        <path
          opacity="0.7"
          d="M5 13.2578L2.87868 11.1365"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M5 13.2578L14.8995 3.35832"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M10.6565 3.35817L12.7778 5.47949"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M12.657 1.35817L14.7783 3.47949"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M2.87854 11.1362L12.778 1.23674"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M2.87868 11.1365L5 13.2578"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M1.81825 14.3182L5.00023 13.2576"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M1.81842 14.3184L2.87908 11.1364"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.6"
          d="M12.5962 3.53996L14.364 5.30773C15.145 6.08878 15.145 7.35511 14.364 8.13615L13.6568 8.84326"
          stroke="#F5F9FB"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1176_37502">
          <rect
            width="16"
            height="16"
            fill="white"
            transform="translate(0.5)"
          />
        </clipPath>
      </defs>
    </svg>
  );
}
