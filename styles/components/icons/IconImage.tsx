import IconBase from './IconBase.tsx';

const IconImage = ({ fill = '#9CB2CD', className }) => (
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
          id="CYSJlDlJRPCX6cHjMw9V"
          d="M18.462 3A2.544 2.544 0 0 1 21 5.538v12.924A2.544 2.544 0 0 1 18.462 21H5.538A2.538 2.538 0 0 1 3 18.462V5.538C3 4.138 4.134 3 5.538 3h12.924zm-.098 1.5H5.636c-.629 0-1.136.51-1.136 1.136v10.181l4.009-4.62 5.391 5.625.466-.61 2.757-3.584 2.377 3.186V5.636c0-.623-.513-1.136-1.136-1.136zm-4.864 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
        />
      </defs>
      <g fill="none" fillRule="evenodd">
        <path fill="transparent" d="M0 0h24v24H0z" />
        <use fill={fill} xlinkHref="#CYSJlDlJRPCX6cHjMw9V" />
      </g>
    </svg>
  </IconBase>
);
export default IconImage;
