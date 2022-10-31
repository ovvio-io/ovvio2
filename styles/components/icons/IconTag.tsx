import IconBase from './IconBase.tsx';

const IconTag = ({ fill = '#9CB2CD' }) => (
  <IconBase size="big">
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
          d="M16.789 10.899l-.699 3.283h2.793v1.683h-3.132L14.874 20h-1.716l.878-4.135H9.827L8.95 20H7.234l.878-4.135H5v-1.683h3.45L9.15 10.9H6.137V9.196h3.371L10.386 5H12.1l-.878 4.196h4.21L16.31 5h1.715l-.877 4.196H20v1.703h-3.211zm-1.716 0h-4.209l-.698 3.283h4.209l.698-3.283z"
        />
      </g>
    </svg>
  </IconBase>
);

export default IconTag;
