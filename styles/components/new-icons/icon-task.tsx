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

export interface IconTaskProps extends IconProps {
  color: IconColor.Mono | IconColor.Primary;
}

export function IconTask({
  color = IconColor.Primary,
  size = IconSize.Small,
  style = {},
  className,
}: IconTaskProps) {
  const colorOpts = COLOR_MAP[color];

  return (
    <svg
      className={className}
      style={{ paddingRight: "8px", ...style }}
      width={size}
      height={size}
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_611_8550)">
        <path
          opacity="0.7"
          d="M15 14.5H2"
          stroke={colorOpts.var1}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M2 1.5V14.5"
          stroke={colorOpts.var3}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M2 1.5H15"
          stroke={colorOpts.var3}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.7"
          d="M15 1.5V14.5"
          stroke={colorOpts.var1}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.6"
          d="M7.32618 10.739L11.5 5"
          stroke={colorOpts.var1}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          opacity="0.6"
          d="M5.5 8.13037L7.32605 10.739"
          stroke={colorOpts.var3}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_611_8550">
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
