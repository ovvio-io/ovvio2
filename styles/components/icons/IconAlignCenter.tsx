import IconBase, { IconProps } from './IconBase.tsx';

const IconAlignCenter = ({ fill = '#CAC9D2', className }: IconProps) => (
  <IconBase size="small" className={className}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="8"
      height="8"
      viewBox="0 0 8 8"
    >
      <g fill="none" fillRule="evenodd">
        <path d="M-4-4h16v16H-4z" />
        <path
          fill={fill}
          d="M0 7.111V8h8v-.889H0zm0-1.778v.89h8v-.89H0zm0-1.777v.888h8v-.888H0zm0-1.778h8v.889H0v-.89zM0 0h8v.889H0V0z"
        />
      </g>
    </svg>
  </IconBase>
);
export default IconAlignCenter;
