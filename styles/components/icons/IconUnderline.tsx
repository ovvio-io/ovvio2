import React from 'react';
import IconBase from './IconBase.tsx';

const IconUnderline = ({ fill = '#FFF', className = '' }) => (
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
          d="M11.828 16.452c-1.242 0-2.19-.356-2.845-1.067C8.328 14.673 8 13.539 8 11.982V7h2.17v5.196c0 .91.142 1.547.426 1.907.284.361.694.541 1.232.541s.953-.18 1.247-.54c.293-.361.44-.997.44-1.908V7h2.082v4.982c0 1.557-.32 2.69-.96 3.403-.64.711-1.577 1.067-2.809 1.067zm-3.828.9h8V18H8v-.647z"
        />
      </g>
    </svg>
  </IconBase>
);
export default IconUnderline;
