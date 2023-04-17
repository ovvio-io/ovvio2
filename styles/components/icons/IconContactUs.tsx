import React from 'react';
import IconBase from './IconBase.tsx';

interface IconContactUsProps {
  fill?: string;
  className?: string;
}
const IconContactUs = ({ fill = '#9CB2CD', className }: IconContactUsProps) => (
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
          d="M18 7a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h11zm-7.147 4.859L7.611 16H17.5l-3.195-3.993-1.57 1.419-1.882-1.567zM7 8.65v6.508l3.084-3.939L7 8.65zm11 .023l-2.951 2.663L18 15.024V8.673zM17.252 8H7.781l4.927 4.102L17.252 8z"
        />
      </g>
    </svg>
  </IconBase>
);
export default IconContactUs;
