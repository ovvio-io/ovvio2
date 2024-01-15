import React from 'react';
import { IconProps } from './types.ts';

export enum CheckAllState {
  Check = 'check',
  Uncheck = 'uncheck',
}

export interface IconCheckAllProps extends IconProps {
  state?: CheckAllState;
}

export function IconCheckAll({ className, state }: IconCheckAllProps) {
  switch (state) {
    case CheckAllState.Uncheck:
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ paddingRight: '8px' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clip-path="url(#clip0_3274_17293)">
            <path
              opacity="0.7"
              d="M15 15H3"
              stroke="#3184DD"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M3 3V15"
              stroke="#1960CF"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M3 3H15"
              stroke="#1960CF"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M15 3V15"
              stroke="#3184DD"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M2 2V14"
              stroke="#3184DD"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M2 2H14"
              stroke="#3184DD"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M1 1V13"
              stroke="#5793E0"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M1 1H13"
              stroke="#5793E0"
              stroke-width="2"
              stroke-linecap="round"
            />
          </g>
          <defs>
            <clipPath id="clip0_3274_17293">
              <rect width="16" height="16" fill="white" />
            </clipPath>
          </defs>
        </svg>
      );

    case CheckAllState.Check:
    default:
      return (
        <svg
          width="16"
          height="16"
          style={{ paddingRight: '8px' }}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clip-path="url(#clip0_2071_19867)">
            <path
              opacity="0.7"
              d="M15 15H3"
              stroke="#3184DD"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M3 3V15"
              stroke="#1960CF"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M3 3H15"
              stroke="#1960CF"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M15 3V15"
              stroke="#3184DD"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.6"
              d="M7.82617 11.739L12 6"
              stroke="#3184DD"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.6"
              d="M6 9.13037L7.82605 11.739"
              stroke="#1960CF"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M2 2V14"
              stroke="#3184DD"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M2 2H14"
              stroke="#3184DD"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M1 1V13"
              stroke="#5793E0"
              stroke-width="2"
              stroke-linecap="round"
            />
            <path
              opacity="0.7"
              d="M1 1H13"
              stroke="#5793E0"
              stroke-width="2"
              stroke-linecap="round"
            />
          </g>
          <defs>
            <clipPath id="clip0_2071_19867">
              <rect width="16" height="16" fill="white" />
            </clipPath>
          </defs>
        </svg>
      );
  }
}
