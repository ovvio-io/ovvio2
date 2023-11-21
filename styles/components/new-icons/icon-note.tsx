import React from "react";
import { brandLightTheme as theme } from "../../theme.tsx";
import { IconColor, IconProps, IconSize } from "./types.ts";

const COLOR_MAP = {
  [IconColor.Mono]: {
    var1: theme.mono.m4,
    var2: theme.mono.m3,
    var3: theme.mono.m4,
  },
  [IconColor.Primary]: {
    var1: theme.primary.p9,
    var2: theme.primary.p8,
    var3: theme.primary.p10,
  },
};

export interface IconNoteProps extends IconProps {
  color?: IconColor.Primary | IconColor.Mono;
}

export function IconNote({
  color = IconColor.Primary,
  size = IconSize.Small,
  className,
  style = {},
}: IconNoteProps) {
  const colorOpts = COLOR_MAP[color];

  return (
    <svg
      className={className}
      style={{ paddingRight: "8px", ...style }}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_970_30419)">
        <path
          opacity="0.7"
          d="M1 13V13.5C1 14.3284 1.67157 15 2.5 15V15C3.32843 15 4 14.3284 4 13.5V13"
          stroke={colorOpts.var1}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M1 10V13"
          stroke={colorOpts.var1}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M1 10H3.5"
          stroke={colorOpts.var1}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M15 12V13C15 14.1046 14.1046 15 13 15H12"
          stroke={colorOpts.var2}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M3 15H12"
          stroke={colorOpts.var2}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M15 1V12"
          stroke={colorOpts.var3}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M4 1H15"
          stroke={colorOpts.var3}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M4 1V13"
          stroke={colorOpts.var1}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          opacity="0.7"
          x1="12"
          y1="5"
          x2="7"
          y2="5"
          stroke={colorOpts.var3}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          opacity="0.7"
          x1="12"
          y1="8"
          x2="7"
          y2="8"
          stroke={colorOpts.var3}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          opacity="0.7"
          x1="12"
          y1="11"
          x2="7"
          y2="11"
          stroke={colorOpts.var3}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_970_30419">
          <rect width="15.9983" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
