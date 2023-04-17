import React from 'react';
import IconBase from './IconBase.tsx';

interface IconAttachmentProps {
  fill?: string;
  className?: string;
  size?: 'big' | 'small';
}
const IconAttachment = ({
  fill = '#9CB2CD',
  className,
  size = 'big',
}: IconAttachmentProps) => (
  <IconBase size={size} className={className}>
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 4.125V12.75C12 14.4075 10.6575 15.75 9 15.75C7.3425 15.75 6 14.4075 6 12.75L6 3.375C6 2.34 6.84 1.5 7.875 1.5C8.91 1.5 9.75 2.34 9.75 3.375V11.25C9.75 11.6625 9.4125 12 9 12C8.5875 12 8.25 11.6625 8.25 11.25V4.125H7.125L7.125 11.25C7.125 12.285 7.965 13.125 9 13.125C10.035 13.125 10.875 12.285 10.875 11.25V3.375C10.875 1.7175 9.5325 0.375 7.875 0.375C6.2175 0.375 4.875 1.7175 4.875 3.375L4.875 12.75C4.875 15.03 6.72 16.875 9 16.875C11.28 16.875 13.125 15.03 13.125 12.75V4.125H12Z"
        fill={fill}
      />
    </svg>
  </IconBase>
);
export default IconAttachment;
