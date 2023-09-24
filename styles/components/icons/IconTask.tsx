import React from 'react';
import IconBase from './IconBase.tsx';

const IconTask = ({ fill = '#CFCED5', className = '' }) => {
  return (
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
            d="M6 6h12v12H6V6zm10.883 1.153h-9.73v9.73h9.73v-9.73zm-6.162 6.054L15.8 8.09v2.739l-5.08 5.08a162.95 162.95 0 0 1-2.523-2.486v-2.702l2.523 2.486z"
          />
        </g>
      </svg>
    </IconBase>
  );
};
export default IconTask;
