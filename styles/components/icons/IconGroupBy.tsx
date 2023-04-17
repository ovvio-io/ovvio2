import React from 'react';
import IconBase, { IconProps } from './IconBase.tsx';
import { brandLightTheme as theme } from '../../theme.tsx';

export function IconGroupBy({ fill, className }: IconProps) {
  fill = fill || theme.colors.text;
  return (
    <IconBase size="small" className={className}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="4.25"
          y="4.25"
          width="5.41667"
          height="5.41667"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.66667 6.33333H11.75V11.75H6.33333V9.66667"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="13.5"
          y="0.5"
          width="2"
          height="2"
          stroke={fill}
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        <rect
          x="13.5"
          y="13.5"
          width="2"
          height="2"
          stroke={fill}
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        <rect
          x="0.5"
          y="0.5"
          width="2"
          height="2"
          stroke={fill}
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        <rect
          x="0.5"
          y="13.5"
          width="2"
          height="2"
          stroke={fill}
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        <path d="M14.5 2.5L14.5 13.5" stroke={fill} />
        <path d="M1.5 2.5L1.5 13.5" stroke={fill} />
        <path d="M2.5 1.5L13.5 1.5" stroke={fill} />
        <path d="M2.5 14.5L13.5 14.5" stroke={fill} />
      </svg>
    </IconBase>
  );
}
