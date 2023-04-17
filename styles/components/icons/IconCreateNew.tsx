import React from 'react';
import IconBase from './IconBase.tsx';

interface IconCreateNewProps {
  fill?: string;
  opacity?: number;
  className?: string;
}

export default React.forwardRef<HTMLDivElement, IconCreateNewProps & any>(
  function IconCreateNew(
    { fill = '#11082B', opacity = 0.6, className = '' },
    ref
  ) {
    return (
      <IconBase size="big" className={className} ref={ref}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          width="18"
          height="18"
          viewBox="0 0 18 18"
        >
          <defs>
            <path
              id="create-new"
              d="M18.462 3A2.544 2.544 0 0 1 21 5.538v12.924A2.544 2.544 0 0 1 18.462 21H5.538A2.538 2.538 0 0 1 3 18.462V5.538C3 4.138 4.134 3 5.538 3h12.924zm-.098 1.5H5.636c-.629 0-1.136.51-1.136 1.136v12.728c0 .627.507 1.136 1.136 1.136h12.728c.623 0 1.136-.513 1.136-1.136V5.636c0-.623-.513-1.136-1.136-1.136zM17 13h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"
            />
          </defs>
          <use
            fill={fill}
            fillOpacity={opacity}
            fillRule="nonzero"
            transform="translate(-3 -3)"
            xlinkHref="#create-new"
          />
        </svg>
      </IconBase>
    );
  }
);
