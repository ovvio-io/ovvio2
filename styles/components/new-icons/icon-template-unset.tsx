import React from 'react';
import { brandLightTheme as theme } from '../../theme.tsx';
import { IconProps, IconSize } from './types.ts';

export enum TemplateUnsetState {
  Default = 'default',
  Primary = 'primary',
}

const COLOR_MAP = {
  [TemplateUnsetState.Default]: {
    var1: theme.mono.m10,
    var2: theme.mono.m6,
    var3: theme.mono.m4,
  },
  [TemplateUnsetState.Primary]: {
    var1: theme.primary.p10,
    var2: theme.primary.p9,
    var3: theme.primary.p8,
  },
};

export interface IconTemplateUnsetProps extends IconProps {
  state?: TemplateUnsetState;
}

export function IconTemplateUnset({
  size = IconSize.Small,
  className,
  state = TemplateUnsetState.Primary,
  style = {},
}: IconTemplateUnsetProps) {
  const colors = COLOR_MAP[state];

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      style={{ paddingRight: '8px', ...style }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clip-path="url(#clip0_2752_1036)">
        <path
          opacity="0.6"
          d="M7.99999 15L1 11.5"
          stroke={colors.var1}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          opacity="0.6"
          d="M15 11.5L8 15"
          stroke={colors.var1}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          opacity="0.6"
          d="M7.99999 5L1 8.50003"
          stroke={colors.var3}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          opacity="0.6"
          d="M8 5L15 8.50003"
          stroke={colors.var3}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          opacity="0.6"
          d="M7.99999 12L1 8.50003"
          stroke={colors.var2}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          opacity="0.6"
          d="M15 8.50003L8 12"
          stroke={colors.var1}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.7656 1.54572H8.86719V7.78595C8.86719 8.14532 8.78711 8.4129 8.62695 8.58868C8.4668 8.76056 8.25977 8.8465 8.00586 8.8465C7.74805 8.8465 7.53711 8.75861 7.37305 8.58282C7.21289 8.40704 7.13281 8.14142 7.13281 7.78595V1.54572H5.23438C4.9375 1.54572 4.7168 1.48126 4.57227 1.35236C4.42773 1.21954 4.35547 1.04572 4.35547 0.830872C4.35547 0.608215 4.42969 0.432434 4.57812 0.303528C4.73047 0.174622 4.94922 0.110168 5.23438 0.110168H10.7656C11.0664 0.110168 11.2891 0.176575 11.4336 0.309387C11.582 0.4422 11.6562 0.616028 11.6562 0.830872C11.6562 1.04572 11.582 1.21954 11.4336 1.35236C11.2852 1.48126 11.0625 1.54572 10.7656 1.54572Z"
          fill={colors.var1}
        />
        <path
          d="M15 1L1.00005 14.8764"
          stroke={colors.var1}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_2752_1036">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
