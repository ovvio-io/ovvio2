import IconBase, { IconProps } from './IconBase.tsx';

const IconDuplicate = ({ fill = '#9CB2CD', className }: IconProps) => (
  <IconBase size="big" className={className}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <path
        fill={fill}
        fillRule="evenodd"
        d="M16.063 7.116c.442 0 .821.379.821.82V21.18c0 .463-.379.821-.82.821H2.82C2.358 22 2 21.621 2 21.179V7.937c0-.463.379-.821.821-.821zm-.82 1.642h-11.6v11.6h11.6v-11.6zm-5.054 2.253c.19 0 .358.168.358.357v2.085h2.085c.19 0 .357.168.357.358v1.494c0 .19-.168.358-.357.358h-2.085v2.084c0 .19-.168.358-.358.358H8.695c-.19 0-.358-.168-.358-.358v-2.084H6.253c-.21 0-.358-.147-.358-.358v-1.494c0-.19.168-.358.358-.358h2.084v-2.085c0-.19.168-.357.358-.357zM21.18 13.2c.463 0 .821.358.821.821v2.042c0 .463-.379.821-.821.821h-2.042c-.463 0-.821-.379-.821-.82 0-.464.379-.822.82-.822h1.222v-1.22c0-.464.379-.822.82-.822zm0-5.726c.463 0 .821.379.821.82v2.295c0 .464-.379.822-.821.822-.463 0-.821-.38-.821-.822V8.295c0-.463.379-.821.82-.821zM9.979 2c.463 0 .821.358.821.821 0 .463-.379.821-.821.821H8.758v1.221c0 .463-.38.821-.821.821-.442 0-.821-.358-.821-.82V2.82c0-.463.379-.821.82-.821zm11.2 0c.463 0 .821.358.821.821v2.042c0 .463-.379.821-.821.821-.463 0-.821-.379-.821-.82V3.641h-1.221c-.463 0-.821-.358-.821-.82 0-.464.379-.822.82-.822zm-5.474 0c.463 0 .821.358.821.821 0 .463-.379.821-.82.821H13.41c-.443 0-.822-.358-.822-.82 0-.464.38-.822.822-.822z"
      />
    </svg>
  </IconBase>
);
export default IconDuplicate;
