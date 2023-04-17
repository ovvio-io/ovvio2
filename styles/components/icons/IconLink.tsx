import React from 'react';
import IconBase from './IconBase.tsx';

interface IconLinkProps {
  fill?: string;
  className?: string;
  width?: string;
  height?: string;
}
const IconLink = ({
  fill = '#CAC9D2',
  className,
  width = '11',
  height = '6',
}: IconLinkProps) => (
  <IconBase size="big" className={className}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 11 6"
    >
      <g fill="none" fillRule="nonzero">
        <path d="M14-5H-2v16h16z" />
        <path
          fill={fill}
          d="M5 4.286h1.714a.428.428 0 1 0 0-.857H5a1.287 1.287 0 0 1-1.286-1.286c0-.709.577-1.286 1.286-1.286h3.857c.709 0 1.286.577 1.286 1.286 0 .408-.199.797-.533 1.04a.43.43 0 0 0 .505.693A2.15 2.15 0 0 0 11 2.143 2.145 2.145 0 0 0 8.857 0H5a2.145 2.145 0 0 0-2.143 2.143c0 1.181.961 2.143 2.143 2.143zM2.857 6h3.857a2.145 2.145 0 0 0 2.143-2.143 2.145 2.145 0 0 0-2.143-2.143H5a.428.428 0 1 0 0 .857h1.714c.71 0 1.286.577 1.286 1.286 0 .709-.577 1.286-1.286 1.286H2.857a1.287 1.287 0 0 1-1.286-1.286c0-.408.2-.797.533-1.04a.429.429 0 0 0-.504-.693 2.15 2.15 0 0 0-.886 1.733C.714 5.04 1.676 6 2.857 6z"
        />
      </g>
    </svg>
  </IconBase>
);
export default IconLink;
