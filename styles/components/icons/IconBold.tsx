import React from 'react';
import IconBase, { IconProps } from './IconBase.tsx';

const IconBold = ({ fill = '#FFF', className = '' }: IconProps) => (
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
          d="M8 17V7h3.604c.55 0 1.059.038 1.527.115.469.077.878.212 1.229.406.35.195.625.45.824.767.2.317.299.716.299 1.197a2.558 2.558 0 0 1-.372 1.304 2.405 2.405 0 0 1-.428.52 1.57 1.57 0 0 1-.574.338v.062c.27.06.517.156.744.283.226.128.425.29.598.483.172.195.307.422.404.683.097.26.145.56.145.897 0 .511-.105.951-.315 1.32-.21.367-.501.672-.873.912s-.805.419-1.3.537a6.92 6.92 0 0 1-1.6.176H8zm2.376-5.997h1.115c.582 0 1.005-.107 1.269-.322.264-.215.396-.501.396-.859 0-.388-.135-.665-.404-.828-.27-.164-.685-.246-1.245-.246h-1.131v2.255zm0 4.249h1.341c1.304 0 1.956-.45 1.956-1.35 0-.44-.162-.754-.485-.943-.323-.19-.814-.284-1.47-.284h-1.342v2.577z"
        />
      </g>
    </svg>
  </IconBase>
);
export default IconBold;
