import React from 'react';
import IconBase from './IconBase.tsx';

const IconNote = ({ fill = '#CAC9D2', className = '' }) => (
  <IconBase size="big" className={className}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <defs>
        <path
          id="N2VtB40Gt1V1kVaKakJ9"
          d="M14.625 0A3.375 3.375 0 0 1 18 3.375v8.068a2.25 2.25 0 0 1-.659 1.591l-4.307 4.307a2.25 2.25 0 0 1-1.591.659H3.375A3.375 3.375 0 0 1 0 14.625V3.375A3.375 3.375 0 0 1 3.375 0h11.25zm-2.25 16.409l4.034-4.034H13.5c-.621 0-1.124.504-1.125 1.125v2.909zM16 11V4a2.002 2.002 0 0 0-2-2H4a2.002 2.002 0 0 0-2 2v10a2.002 2.002 0 0 0 2 2h7v-3a2 2 0 0 1 2-2h3zm-2.625-4c.345 0 .625.224.625.5s-.28.5-.625.5h-8.75C4.28 8 4 7.776 4 7.5s.28-.5.625-.5h8.75zm0-3c.345 0 .625.224.625.5s-.28.5-.625.5h-8.75C4.28 5 4 4.776 4 4.5s.28-.5.625-.5h8.75z"
        />
      </defs>
      <g fill="none" fillRule="evenodd">
        <path fill="transparent" d="M0 0h24v24H0z" />
        <g transform="translate(3 3)">
          <mask id="2dLDbWdUYgX1cqm5VXkb" fill={fill}>
            <use xlinkHref="#N2VtB40Gt1V1kVaKakJ9" />
          </mask>
          <use
            fill={fill}
            fillRule="nonzero"
            xlinkHref="#N2VtB40Gt1V1kVaKakJ9"
          />
          <path
            fill={fill}
            d="M-3-3h24v24H-3z"
            mask="url(#2dLDbWdUYgX1cqm5VXkb)"
          />
        </g>
      </g>
    </svg>
  </IconBase>
);
export default IconNote;
