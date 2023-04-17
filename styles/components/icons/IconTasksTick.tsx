import React from 'react';
import IconBase from './IconBase.tsx';

const IconTasksTick = ({ fill = '#FFF', className = '' }) => (
  <IconBase size="small" className={className}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <defs>
        <path
          id="CmD7fCLyboAxfO0lGjMH"
          d="M5 11L0 6l1.41-1.41L5 8.17 12.59.58 14 2z"
        />
      </defs>
      <g fill="none" fillRule="evenodd">
        <path fill="transparent" d="M0 0h24v24H0z" />
        <g transform="translate(5 6)">
          <mask id="mdKKrzUnlCliP8Ta5DAN" fill={fill}>
            <use xlinkHref="#CmD7fCLyboAxfO0lGjMH" />
          </mask>
          <path
            fill={fill}
            d="M-3-4h20v20H-3z"
            mask="url(#mdKKrzUnlCliP8Ta5DAN)"
          />
        </g>
      </g>
    </svg>
  </IconBase>
);
export default IconTasksTick;
