import React from "react";
import { brandLightTheme as theme } from "../../theme.tsx";
import { IconSize, IconProps } from "./types.ts";

export enum IconCheckState {
  None = "none",
  Blue = "blue",
}
export interface IconCheckProps extends IconProps {
  state?: IconCheckState;
}

const COLOR_MAP = {
  [IconCheckState.Blue]: {
    var1: theme.primary.p9,
    var2: theme.primary.p10,
  },
  [IconCheckState.None]: {
    var1: theme.mono.m5,
    var2: theme.mono.m4,
  },
};

export function IconCheck({
  size = IconSize.Small,
  className,
  state = IconCheckState.Blue,
  style = {},
}: IconCheckProps) {
  const colors = COLOR_MAP[state];

  return (
    <svg
      className={className}
      style={{ padding: "8px", ...style }}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.6"
        d="M6.3335 11.3333L11.6668 4"
        stroke={colors.var1}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M4 8L6.33333 11.3333"
        stroke={colors.var2}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
