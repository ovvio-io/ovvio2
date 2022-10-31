import IconBase, { IconProps } from './IconBase.tsx';

const IconDropDown = ({ fill = '#CAC9D2', className }: IconProps) => (
  <IconBase size="small" className={className}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="6"
      height="4"
      viewBox="0 0 6 4"
    >
      <g fill="none" fillRule="nonzero">
        <path d="M-5-6h16v16H-5z" />
        <path fill={fill} d="M3 3.5L6 .666 5.295 0 3 2.163.705 0 0 .666z" />
      </g>
    </svg>
  </IconBase>
);
export default IconDropDown;
