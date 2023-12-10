import React from 'react';
import { brandLightTheme as theme } from '../../theme.tsx';
import { IconColor, IconProps, IconSize } from './types.ts';

const COLOR_MAP = {
  [IconColor.Supporting]: {
    var1: theme.supporting.R1,
    var2: theme.supporting.R2,
    var3: theme.supporting.R3,
    var4: theme.supporting.R4,
  },
  [IconColor.Primary]: {
    var1: theme.primary.p8,
    var2: theme.primary.p9,
    var3: theme.primary.p10,
    var4: theme.primary.p7,
  },
};

export interface IconOrgProps extends IconProps {
  color?: IconColor.Supporting | IconColor.Primary;
}

export function IconOrg({
  color = IconColor.Supporting,
  size = IconSize.Small,
  style = {},
  className,
}: IconOrgProps) {
  const colors = COLOR_MAP[color];

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clip-path="url(#clip0_3564_3866)">
        <mask
          id="mask0_3564_3866"
          maskUnits="userSpaceOnUse"
          x="0"
          y="9"
          width="16"
          height="7"
        >
          <rect y="9" width="16" height="7" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask0_3564_3866)">
          <circle
            opacity="0.7"
            cx="8.00019"
            cy="8.05829"
            r="4.37616"
            stroke="#6C2C23"
            strokeWidth="2"
          />
          <path
            opacity="0.7"
            d="M6.16932 14.9593C6.28061 15.4045 6.6806 15.7168 7.13947 15.7168H8.86003C9.3189 15.7168 9.71888 15.4045 9.83018 14.9593L10.4242 12.5832C10.582 11.952 10.1046 11.3406 9.45407 11.3406H6.54543C5.89485 11.3406 5.4175 11.952 5.57528 12.5832L6.16932 14.9593Z"
            fill="#945A52"
          />
          <path
            opacity="0.7"
            d="M1.10832 9.92329C0.778441 10.2423 0.707975 10.7448 0.937408 11.1422L1.79769 12.6322C2.02713 13.0296 2.49758 13.2199 2.93875 13.0937L5.29358 12.4201C5.91907 12.2411 6.20987 11.522 5.88458 10.9586L4.43026 8.43966C4.10497 7.87625 3.33681 7.76854 2.86912 8.22076L1.10832 9.92329Z"
            fill="#945A52"
          />
          <path
            opacity="0.7"
            d="M13.0615 13.0937C13.5027 13.2199 13.9731 13.0296 14.2025 12.6322L15.0628 11.1422C15.2923 10.7448 15.2218 10.2422 14.8919 9.92326L13.1311 8.22073C12.6634 7.76851 11.8953 7.87622 11.57 8.43963L10.1157 10.9586C9.79037 11.522 10.0812 12.2411 10.7067 12.42L13.0615 13.0937Z"
            fill="#945A52"
          />
        </g>
        <path
          opacity="0.7"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.96786 4.9998C2.60196 4.98259 1.5 3.86998 1.5 2.5C1.5 1.11929 2.61929 0 4 0C4.63525 0 5.21516 0.236935 5.65618 0.627251C5.24555 1.1405 5 1.79158 5 2.5C5 2.85078 5.0602 3.1875 5.17085 3.50039C4.66974 3.906 4.2575 4.41705 3.96786 4.9998Z"
          fill="#945A52"
        />
        <path
          opacity="0.7"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.93488 8.5H1.34906C0.603993 8.5 0 7.89601 0 7.15094V7C0 4.79086 1.79086 3 4 3C4.37038 3 4.72901 3.05034 5.06941 3.14456C5.09602 3.26609 5.12999 3.38487 5.17085 3.50039C4.15163 4.32538 3.5 5.58659 3.5 7V7.40566C3.5 7.82936 3.66528 8.21446 3.93488 8.5Z"
          fill="#945A52"
        />
        <path
          opacity="0.7"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10.9999 2.5C10.9999 2.85078 10.9397 3.1875 10.8291 3.50039C11.3302 3.906 11.7424 4.41705 12.0321 4.9998C13.398 4.98259 14.4999 3.86998 14.4999 2.5C14.4999 1.11929 13.3806 0 11.9999 0C11.3647 0 10.7848 0.236933 10.3438 0.627249C10.7544 1.1405 10.9999 1.79158 10.9999 2.5Z"
          fill="#945A52"
        />
        <path
          opacity="0.7"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10.9305 3.14455C10.9039 3.26609 10.87 3.38487 10.8291 3.50039C11.8483 4.32538 12.4999 5.58659 12.4999 7V7.40566C12.4999 7.82936 12.3347 8.21446 12.0651 8.5H14.6509C15.396 8.5 15.9999 7.89601 15.9999 7.15094V7C15.9999 4.79086 14.2091 3 11.9999 3C11.6296 3 11.2709 3.05034 10.9305 3.14455Z"
          fill="#945A52"
        />
        <path
          opacity="0.7"
          d="M9.5 2.5C9.5 3.32843 8.82843 4 8 4C7.17157 4 6.5 3.32843 6.5 2.5C6.5 1.67157 7.17157 1 8 1C8.82843 1 9.5 1.67157 9.5 2.5Z"
          fill="#6C2C23"
          stroke="#6C2C23"
          strokeWidth="2"
        />
        <path
          opacity="0.7"
          d="M11 7.33333V7C11 5.34315 9.65685 4 8 4C6.34315 4 5 5.34315 5 7V7.33333C5 7.42538 5.07462 7.5 5.16667 7.5H10.8333C10.9254 7.5 11 7.42538 11 7.33333Z"
          fill="#6C2C23"
          stroke="#6C2C23"
          strokeWidth="2"
        />
      </g>
      <defs>
        <clipPath id="clip0_3564_3866">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
