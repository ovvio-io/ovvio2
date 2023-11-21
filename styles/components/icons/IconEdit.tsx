import IconBase, { IconProps } from './IconBase.tsx';

const IconEdit = ({ fill = '#9CB2CD', className }: IconProps) => (
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
        d="M18.453 19.272h-.019v-7.663l1.724-1.748v9.66c0 .826-.663 1.479-1.478 1.479H5.478A1.473 1.473 0 0 1 4 19.521V6.654c0-.807.663-1.479 1.478-1.479h9.395l-1.724 1.748H5.724v12.349h12.729zm-7.032-8.1l5.8-5.88 2.518 2.552-5.8 5.88-2.518-2.553zm-1.625 1.647l.625-.634 2.52 2.535-.625.634a.538.538 0 0 1-.265.153l-2.274.557c-.397.077-.738-.269-.644-.653l.512-2.324a.621.621 0 0 1 .151-.268zm12.048-7.874a.55.55 0 0 1 0 .768l-1.118 1.133-2.52-2.554 1.118-1.134a.532.532 0 0 1 .758 0l1.762 1.787z"
      />
    </svg>
  </IconBase>
);
export default IconEdit;
