import IconBase, { IconProps } from './IconBase.tsx';

export function IconList({ fill, className }: IconProps) {
  return (
    <IconBase size="small" className={className}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M2 3H14" stroke={fill} strokeLinecap="round" />
        <path d="M2 8H14" stroke={fill} strokeLinecap="round" />
        <path d="M2 13H14" stroke={fill} strokeLinecap="round" />
      </svg>
    </IconBase>
  );
}
