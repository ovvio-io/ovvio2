import React from 'react';

export enum IconSize {
  XSmall = 4,
  Small = 16,
  Medium = 24,
}

export enum IconColor {
  Primary = 'primary',
  Secondary = 'secondary',
  Mono = 'mono',
  Supporting = 'supporting',
}

export interface IconProps {
  size?: IconSize;
  className?: string;
  style?: React.CSSProperties;
}
