import React from 'react';
import IconBase from './IconBase.tsx';

export interface IconOverflowProps {
  fill?: string;
  className?: string;
}
const IconOverflow = ({ fill = '#C7C7C7', className }: IconOverflowProps) => (
  <IconBase size="big" className={className}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <g fill="none" fillRule="evenodd">
        <path fill="transparent" d="M0 0h24v24H0z" />
        <path
          fill={fill}
          d="M14 18.222c0 .982-.895 1.778-2 1.778s-2-.796-2-1.778.895-1.778 2-1.778 2 .796 2 1.778zM14 12c0 .982-.895 1.778-2 1.778s-2-.796-2-1.778.895-1.778 2-1.778 2 .796 2 1.778zm0-6.222c0 .982-.895 1.778-2 1.778s-2-.796-2-1.778S10.895 4 12 4s2 .796 2 1.778z"
        />
      </g>
    </svg>
  </IconBase>
);
export default IconOverflow;
