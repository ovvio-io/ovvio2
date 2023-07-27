import React from 'react';
import { IconProps } from './types.ts';

export function IconMore(props: IconProps) {
  return (
    <svg
      className={props.className}
      width="4"
      height="16"
      viewBox="0 0 4 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="2" cy="2" r="2" fill="#4D4D4D" />
      <circle cx="2" cy="8" r="2" fill="#4D4D4D" />
      <circle cx="2" cy="14" r="2" fill="#4D4D4D" />
    </svg>
  );
}
