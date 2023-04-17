import React from 'react';
import { useTheme } from '../../theme.tsx';
import IconBase from './IconBase.tsx';

interface IconProps {
  fill?: string;
  className?: string;
}
function IconNotifications({ fill, className }: IconProps) {
  const theme = useTheme();

  return (
    <IconBase size="small" className={className}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 12 12"
      >
        <path
          fill={fill || theme.background.text}
          fillRule="evenodd"
          d="M11.647 8.03h-.396a.702.702 0 0 1-.681-.521 10.777 10.777 0 0 1-.335-2.7c0-1.628-.586-3.523-3.136-3.99A.357.357 0 0 1 6.8.473v-.12A.353.353 0 0 0 6.448 0h-.706a.353.353 0 0 0-.353.353v.121a.35.35 0 0 1-.293.342C2.53 1.278 1.94 3.177 1.94 4.81c0 1.131-.171 2.063-.337 2.7a.702.702 0 0 1-.681.52h-.57A.353.353 0 0 0 0 8.382v.706c0 .195.158.353.353.353H3.08c.167 0 .314.117.344.282C3.663 11.019 4.727 12 6 12c1.273 0 2.337-.98 2.575-2.277a.348.348 0 0 1 .344-.282h2.728A.353.353 0 0 0 12 9.088v-.706a.353.353 0 0 0-.353-.353zM3.353 4.808c0-1.804.824-2.617 2.735-2.685 1.912.068 2.736.88 2.736 2.685 0 1.125.148 2.074.315 2.786a.352.352 0 0 1-.343.434H3.38a.352.352 0 0 1-.343-.434c.166-.712.315-1.661.315-2.786zM6 10.589c-.591 0-1.083-.496-1.19-1.148h2.38c-.107.652-.599 1.147-1.19 1.147z"
        />
      </svg>
    </IconBase>
  );
}

export default IconNotifications;
