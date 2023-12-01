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

export interface IconNotificationProps extends IconProps {
  color?: IconColor.Primary | IconColor.Mono;
}

export function IconNotification({
  color = IconColor.Primary,
  size = IconSize.Small,
  className,
  style = {},
}: IconNotificationProps) {
  const colorOpts = COLOR_MAP[color];

  return (
    <svg
      style={{ ...style, marginLeft: '16px', marginRight: '16px' }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        opacity="0.6"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.7526 6.01123C15.3779 6.01123 18.3168 8.95052 18.3168 12.5758C18.3168 13.4933 18.3168 14.3775 18.3168 15.1282C18.3168 18.4103 20.5049 19.5044 20.5049 19.5044L3.00027 19.5044C3.00027 19.5044 5.18834 18.4103 5.18834 15.1282C5.18834 14.3775 5.18834 13.4933 5.18834 12.5758C5.18834 8.95052 8.12725 6.01123 11.7526 6.01123Z"
        fill="#FBEAC8"
        stroke="#F9B55A"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M20.5049 19.5044L3.00026 19.5044"
        stroke="#F9B55A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M18.3169 15.1282C18.3169 14.3775 18.3169 13.4933 18.3169 12.5758C18.3169 8.95052 15.378 6.01123 11.7527 6.01123V6.01123C8.12734 6.01123 5.18843 8.95052 5.18843 12.5758C5.18843 13.4933 5.18843 14.3775 5.18843 15.1282"
        stroke="#FDB797"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M18.3168 15.1284C18.3168 18.4105 20.5049 19.5046 20.5049 19.5046"
        stroke="#E24716"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M2.99991 19.5046C2.99991 19.5046 5.18799 18.4105 5.18799 15.1284"
        stroke="#F1804A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.6"
        d="M9.26598 19.5044C9.26598 20.9875 10.4683 22.1898 11.9514 22.1898C13.4344 22.1898 14.6367 20.9875 14.6367 19.5044"
        stroke="#F9B55A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        opacity="0.6"
        cx="11.951"
        cy="4.68537"
        r="1.68537"
        stroke="#F9B55A"
        strokeWidth="2"
      />
    </svg>
  );
}
