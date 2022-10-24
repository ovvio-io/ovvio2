import React from 'react';

export function AssigneesIcon(props: { fill?: string, className?: string }) {
  const { fill = '#706B80', className } = props;
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.25 9C12.9075 9 14.25 7.6575 14.25 6C14.25 4.3425 12.9075 3 11.25 3C9.5925 3 8.25 4.3425 8.25 6C8.25 7.6575 9.5925 9 11.25 9ZM11.25 4.5C12.075 4.5 12.75 5.175 12.75 6C12.75 6.825 12.075 7.5 11.25 7.5C10.425 7.5 9.75 6.825 9.75 6C9.75 5.175 10.425 4.5 11.25 4.5ZM11.25 10.5C9.2475 10.5 5.25 11.505 5.25 13.5V15H17.25V13.5C17.25 11.505 13.2525 10.5 11.25 10.5ZM6.75 13.5C6.915 12.96 9.2325 12 11.25 12C13.275 12 15.6 12.9675 15.75 13.5H6.75ZM4.5 11.25V9H6.75V7.5H4.5V5.25H3V7.5H0.75V9H3V11.25H4.5Z" fill={fill} />
    </svg>
  );
}