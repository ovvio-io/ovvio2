import React from 'react';

interface IconProps {
  rectColor: string;
  circleColor: string;
}

export const SelectIcon: React.FC<IconProps> = ({ rectColor, circleColor }) => {
  return (
    <svg
      width="52"
      height="24"
      viewBox="0 0 52 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="52" height="24" rx="12" fill={rectColor} />
      <circle cx="14" cy="12" r="8" fill={circleColor} />
      <path
        opacity="0.6"
        d="M12.8262 14.739L17 9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        opacity="0.6"
        d="M11 12.1304L12.826 14.739"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const SelectedIcon: React.FC<IconProps> = ({
  rectColor,
  circleColor,
}) => {
  return (
    <svg
      width="93"
      height="24"
      viewBox="0 0 93 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="41" width="52" height="24" rx="12" fill={rectColor} />

      <circle cx="55" cy="12" r="8" fill={circleColor} />
    </svg>
  );
};
