import IconBase, { IconProps } from './IconBase.tsx';

export function IconBoard({ fill, className }: IconProps) {
  return (
    <IconBase size="small" className={className}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="2"
          y="2"
          width="4.36364"
          height="4.36364"
          stroke={fill}
          strokeLinejoin="round"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9.63636 2L14 2V6.36364H9.63636V2Z"
          stroke={fill}
          strokeLinejoin="round"
        />
        <rect
          x="2"
          y="9.63636"
          width="4.36364"
          height="4.36364"
          stroke={fill}
          strokeLinejoin="round"
        />
        <rect
          x="9.63636"
          y="9.63636"
          width="4.36364"
          height="4.36364"
          stroke={fill}
          strokeLinejoin="round"
        />
      </svg>
    </IconBase>
  );
}
