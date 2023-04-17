import React from 'react';
import IconBase, { IconProps } from './IconBase.tsx';

const IconAlignLeft = ({ fill = '#CAC9D2', className }: IconProps) => (
  <IconBase size="small" className={className}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 8 8"
    >
      <g fill="none" fillRule="evenodd">
        <path d="M-4-4h16v16H-4z" />
        <path
          fill={fill}
          d="M0 6.4v.8h5.6v-.8H0zm0-1.6v.8h8v-.8H0zm0-1.6V4h7.2v-.8H0zm0-1.6h8v.8H0v-.8zM0 0h4.8v.8H0V0z"
        />
      </g>
    </svg>
  </IconBase>
);
export default IconAlignLeft;
