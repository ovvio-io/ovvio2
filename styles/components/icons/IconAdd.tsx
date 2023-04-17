import React from 'react';
import IconBase from './IconBase.tsx';

interface IconAddProps {
  fill?: string;
  size?: number;
  className?: string;
}
const IconAdd = ({ fill = '#FFF', size = 17, className }: IconAddProps) => (
  <IconBase size="big" className={className}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 17 17"
    >
      <g fill="none" fillRule="evenodd">
        <path d="M-4-4h24v24H-4z" />
        <path
          fill={fill}
          d="M7.25 7.25V0h2.417v7.25h7.25v2.417h-7.25v7.25H7.25v-7.25H0V7.25h7.25z"
        />
      </g>
    </svg>
  </IconBase>
);
export default IconAdd;
