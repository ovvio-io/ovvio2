import React from 'react';
import { IconProps } from './types.ts';

interface IconMoreProps extends IconProps {
  color?: string;
}

export function IconMore({ className, color = '#4D4D4D' }: IconMoreProps) {
  return (
    <svg
      className={className}
      width="4"
      height="16"
      viewBox="0 0 4 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="2" cy="2" r="2" fill={color} />{' '}
      <circle cx="2" cy="8" r="2" fill={color} />{' '}
      <circle cx="2" cy="14" r="2" fill={color} />{' '}
    </svg>
  );
}
