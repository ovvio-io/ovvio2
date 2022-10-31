import IconBase, { IconProps } from './IconBase.tsx';

const IconAlignRight = ({ fill = '#CAC9D2', className }: IconProps) => (
  <IconBase size="small" className={className}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="8"
      height="8"
      viewBox="0 0 8 8"
    >
      <g fill="none" fillRule="evenodd">
        <path d="M12-4H-4v16h16z" />
        <path
          fill={fill}
          d="M8 7.111H2.4V8H8v-.889zm0-1.778H0v.89h8v-.89zm0-1.777H.8v.888H8v-.888zm0-1.778H0v.889h8v-.89zM8 0H3.2v.889H8V0z"
        />
      </g>
    </svg>
  </IconBase>
);
export default IconAlignRight;
