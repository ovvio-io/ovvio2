import React from 'https://esm.sh/react@18.2.0';

export function TagIcon(props: { fill?: string; className?: string }) {
  const { fill = '#706B80', className } = props;
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.0575 8.685L9.3075 1.935C9.0375 1.665 8.6625 1.5 8.25 1.5H3C2.175 1.5 1.5 2.175 1.5 3V8.25C1.5 8.6625 1.665 9.0375 1.9425 9.315L8.6925 16.065C8.9625 16.335 9.3375 16.5 9.75 16.5C10.1625 16.5 10.5375 16.335 10.8075 16.0575L16.0575 10.8075C16.335 10.5375 16.5 10.1625 16.5 9.75C16.5 9.3375 16.3275 8.955 16.0575 8.685ZM9.75 15.0075L3 8.25V3H8.25V2.9925L15 9.7425L9.75 15.0075Z"
        fill={fill}
      />
      <path
        d="M4.875 6C5.49632 6 6 5.49632 6 4.875C6 4.25368 5.49632 3.75 4.875 3.75C4.25368 3.75 3.75 4.25368 3.75 4.875C3.75 5.49632 4.25368 6 4.875 6Z"
        fill={fill}
      />
    </svg>
  );
}
