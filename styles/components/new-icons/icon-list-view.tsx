import React from 'react';
import { brandLightTheme } from '../../theme.tsx';
import { IconProps, IconSize } from './types.ts';

export interface IconListViewProps extends IconProps {
  isToggled: boolean;
}

export function IconListView({
  size = IconSize.Medium,
  className,
  isToggled,
}: IconListViewProps) {
  const color = isToggled
    ? brandLightTheme.colors.toggleButtonActiveIcon
    : brandLightTheme.colors.toggleButtonInactiveIcon;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.99988 5.47693H20.723"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M2.99988 12.0004H20.723"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M2.99988 18.5228H20.723"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
