import React from 'react';
import IconBase from './IconBase.tsx';

const IconItalic = ({ fill = '#FFF', className = '' }) => (
  <IconBase size="big" className={className}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <g fill="none" fillRule="evenodd">
        <path fill="transparent" d="M0 0h24v24H0z" />
        <path fill={fill} d="M9 17l3.358-10H14l-3.358 10z" />
      </g>
    </svg>
  </IconBase>
);
export default IconItalic;
