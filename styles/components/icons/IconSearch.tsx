import React from 'react';
import { useTheme } from '../../theme.tsx';
import IconBase, { IconProps } from './IconBase.tsx';

function IconSearch({ fill, className }: IconProps) {
  const theme = useTheme();
  return (
    <IconBase size="small" className={className}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        width="13"
        height="13"
        viewBox="0 0 13 13"
      >
        <defs>
          <path
            id="tfXusaWMJq0N0hr3UpoO"
            d="M9.96 10.764c-1.885 1.72-4.756 1.645-6.554-.228-1.875-1.953-1.875-5.119 0-7.072a4.665 4.665 0 0 1 6.788 0c1.642 1.71 1.846 4.352.611 6.294l3.688 3.842-.905.942-3.628-3.778zM9.29 9.593c1.375-1.432 1.375-3.754 0-5.186a3.421 3.421 0 0 0-4.978 0c-1.375 1.432-1.375 3.754 0 5.186a3.421 3.421 0 0 0 4.978 0z"
          />
        </defs>
        <use
          fill={fill || theme.background.text}
          fillRule="nonzero"
          transform="translate(-2 -2)"
          xlinkHref="#tfXusaWMJq0N0hr3UpoO"
        />
      </svg>
    </IconBase>
  );
}

export default IconSearch;
