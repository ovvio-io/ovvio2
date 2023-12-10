import React from 'react';
import { brandLightTheme as theme } from '../../theme.tsx';
import { IconColor, IconProps, IconSize } from './types.ts';

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

export interface IconSettingsProps extends IconProps {
  color?: IconColor.Mono | IconColor.Primary;
}

export function IconSettings({
  color = IconColor.Primary,
  size = IconSize.Small,
  style = {},
  className,
}: IconSettingsProps) {
  const colors = COLOR_MAP[color];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ paddingRight: '8px', ...style }}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle
        opacity="0.7"
        cx="8.00019"
        cy="8.05828"
        r="4.37616"
        stroke={colors.var3}
        strokeWidth="2"
      />
      <path
        opacity="0.7"
        d="M6.16981 1.15747C6.2811 0.712299 6.68109 0.400002 7.13995 0.400002H8.86052C9.31939 0.400002 9.71937 0.712299 9.83066 1.15747L10.4247 3.53363C10.5825 4.16477 10.1051 4.77616 9.45456 4.77616H6.54591C5.89534 4.77616 5.41798 4.16477 5.57577 3.53363L6.16981 1.15747Z"
        fill={colors.var3}
      />
      <path
        opacity="0.7"
        d="M6.16981 14.9591C6.2811 15.4043 6.68109 15.7166 7.13995 15.7166H8.86052C9.31939 15.7166 9.71937 15.4043 9.83066 14.9591L10.4247 12.5829C10.5825 11.9518 10.1051 11.3404 9.45456 11.3404H6.54591C5.89534 11.3404 5.41798 11.9518 5.57577 12.5829L6.16981 14.9591Z"
        fill={colors.var1}
      />
      <path
        opacity="0.7"
        d="M13.061 3.02268C13.5022 2.89647 13.9726 3.08672 14.2021 3.48411L15.0623 4.97417C15.2918 5.37156 15.2213 5.8741 14.8914 6.19307L13.1306 7.8956C12.6629 8.34782 11.8948 8.24012 11.5695 7.6767L10.1152 5.15774C9.78988 4.59433 10.0807 3.87523 10.7062 3.6963L13.061 3.02268Z"
        fill={colors.var1}
      />
      <path
        opacity="0.7"
        d="M1.10832 9.9235C0.778441 10.2425 0.707975 10.745 0.937408 11.1424L1.79769 12.6325C2.02713 13.0298 2.49758 13.2201 2.93875 13.0939L5.29358 12.4203C5.91907 12.2413 6.20987 11.5222 5.88458 10.9588L4.43026 8.43987C4.10497 7.87645 3.33681 7.76874 2.86912 8.22096L1.10832 9.9235Z"
        fill={colors.var1}
      />
      <path
        opacity="0.7"
        d="M1.10881 6.19307C0.778929 5.87411 0.708463 5.37156 0.937897 4.97417L1.79818 3.48411C2.02761 3.08672 2.49806 2.89648 2.93924 3.02268L5.29407 3.6963C5.91955 3.87523 6.21035 4.59433 5.88507 5.15774L4.43074 7.6767C4.10546 8.24012 3.3373 8.34783 2.86961 7.89561L1.10881 6.19307Z"
        fill={colors.var2}
      />
      <path
        opacity="0.7"
        d="M13.0615 13.0939C13.5027 13.2201 13.9731 13.0298 14.2025 12.6324L15.0628 11.1424C15.2923 10.745 15.2218 10.2425 14.8919 9.92349L13.1311 8.22096C12.6634 7.76874 11.8953 7.87645 11.57 8.43986L10.1157 10.9588C9.79037 11.5222 10.0812 12.2413 10.7067 12.4203L13.0615 13.0939Z"
        fill={colors.var1}
      />
    </svg>
  );
}
