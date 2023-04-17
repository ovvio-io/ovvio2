import React from 'react';
import IconBase from './IconBase.tsx';

interface IconCloseProps {
  fill?: string;
  className?: string;
  size?: 'small' | 'big';
}
const IconClose = ({
  fill = '#D7E3F1',
  className,
  size = 'big',
}: IconCloseProps) => (
  <IconBase size={size} className={className}>
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
          d="M12 10.769l4.514-4.514a.87.87 0 1 1 1.23 1.231L13.232 12l4.514 4.514a.87.87 0 0 1-1.231 1.231L12 13.231l-4.514 4.514a.87.87 0 0 1-1.23-1.231L10.768 12 6.255 7.486a.87.87 0 1 1 1.231-1.23L12 10.768z"
        />
      </g>
    </svg>
  </IconBase>
);
export default IconClose;
