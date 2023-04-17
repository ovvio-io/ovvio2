import React from 'react';
import IconBase from './IconBase.tsx';

interface IconBackProps {
  fill?: string;
  className?: string;
}
const IconBack = ({ fill = '#D7E3F1', className }: IconBackProps) => (
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
          d="M9 12l4.858-5L15 8.175 11.291 12 15 15.825 13.858 17z"
        />
      </g>
    </svg>
  </IconBase>
);
export default IconBack;
