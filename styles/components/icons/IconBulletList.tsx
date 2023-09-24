import React from 'react';
import IconBase, { IconProps } from './IconBase.tsx';

const IconBulletList = ({ fill = '#FFF', className }: IconProps) => (
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
          d="M8.4 15.889H18V17H8.4v-1.111zm0-2.222H18v1.11H8.4v-1.11zm0-2.223H18v1.112H8.4v-1.112zm0-2.222H18v1.111H8.4v-1.11zM8.4 7H18v1.111H8.4V7zM6 15.889h1.2V17H6v-1.111zm0-2.222h1.2v1.11H6v-1.11zm0-2.223h1.2v1.112H6v-1.112zm0-2.222h1.2v1.111H6v-1.11zM6 7h1.2v1.111H6V7z"
        />
      </g>
    </svg>
  </IconBase>
);
export default IconBulletList;
