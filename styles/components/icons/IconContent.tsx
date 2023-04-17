import React from 'react';
import { useTheme } from '../../theme.tsx';
import IconBase, { IconProps } from './IconBase.tsx';

export function IconContent({ fill, className }: IconProps) {
  const theme = useTheme();
  fill = fill || theme.background.placeholderText;
  return (
    <IconBase size="small" className={className}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14 2V7.33333C14 11.0152 11.0152 14 7.33333 14H2L2 2L14 2Z"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 14C6 14 8.66667 14 8.66667 11.3333V9.66667C8.66667 9.11438 9.11438 8.66667 9.66667 8.66667H11.3333C11.3333 8.66667 14 8.66667 14 6"
          stroke={fill}
        />
      </svg>
    </IconBase>
  );
}
