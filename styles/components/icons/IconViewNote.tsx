import IconBase from './IconBase.tsx';

const IconViewNote = ({ fill = '#9CB2CD', className = '' }) => (
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
          id="CbvZO8nhAkJkVgXgaqQa"
          d="M17.625 3A3.375 3.375 0 0 1 21 6.375v8.068a2.25 2.25 0 0 1-.659 1.591l-4.307 4.307a2.25 2.25 0 0 1-1.591.659H6.375A3.375 3.375 0 0 1 3 17.625V6.375A3.375 3.375 0 0 1 6.375 3h11.25zm-2.25 16.409l4.034-4.034H16.5c-.621 0-1.124.504-1.125 1.125v2.909zM19 14V7a2.002 2.002 0 0 0-2-2H7a2.002 2.002 0 0 0-2 2v10a2.002 2.002 0 0 0 2 2h7v-3a2 2 0 0 1 2-2h3zM7 7h7v7H7V7zm6.06.955H8v5.102h5.06V7.955zM9.91 11.04l2.339-2.29v1.226L9.911 12.25c-.415-.387-.746-.71-1.161-1.113v-1.21l1.161 1.113z"
        />
      </defs>
      <g fill="none" fillRule="evenodd">
        <path fill="transparent" d="M0 0h24v24H0z" />
        <use fill={fill} xlinkHref="#CbvZO8nhAkJkVgXgaqQa" />
      </g>
    </svg>
  </IconBase>
);
export default IconViewNote;
