import React from 'react';
import { brandLightTheme } from '../../theme.tsx';
import { IconProps, IconSize } from './types.ts';

interface IconBoardViewProps extends IconProps {
  isToggled: boolean;
}

export function IconBoardView({
  size = IconSize.Medium,
  className,
  isToggled,
}: IconBoardViewProps) {
  const color = isToggled
    ? brandLightTheme.colors.toggleButtonActiveIcon
    : brandLightTheme.colors.toggleButtonInactiveIcon;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 3C2.44772 3 2 3.44772 2 4L2 11C2 11.5523 2.44772 12 3 12H7C7.55229 12 8 11.5523 8 11V4C8 3.44772 7.55229 3 7 3L3 3Z"
        fill={color}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.4998 3C9.94747 3 9.49976 3.44772 9.49976 4L9.49976 20C9.49976 20.5523 9.94747 21 10.4998 21H14.4998C15.052 21 15.4998 20.5523 15.4998 20L15.4998 4C15.4998 3.44772 15.052 3 14.4998 3L10.4998 3Z"
        fill={color}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.0002 3C17.448 3 17.0002 3.44772 17.0002 4L17.0002 16C17.0002 16.5523 17.448 17 18.0002 17H22.0002C22.5525 17 23.0002 16.5523 23.0002 16V4C23.0002 3.44772 22.5525 3 22.0002 3L18.0002 3Z"
        fill={color}
      />
    </svg>
  );
}
