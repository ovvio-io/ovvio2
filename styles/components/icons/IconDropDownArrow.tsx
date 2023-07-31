import React from 'react';
import IconBase, { IconProps } from './IconBase.tsx';

const IconDropDownArrow = ({ fill = '#11082B', className = '' }: IconProps) => (
  <IconBase size="small" className={className}>
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
          d="M12 16l-6-5.668L7.41 9 12 13.327 16.59 9 18 10.332z"
        />
      </g>
    </svg>
  </IconBase>
);
export default IconDropDownArrow;
