import React from 'react';
import { makeStyles, cn, keyframes } from '../css-objects/index.ts';

import { styleguide } from '../styleguide.ts';

const rotator = keyframes(
  {
    '0%': {
      transform: 'rotate(0deg)',
    },
    '100%': {
      transform: 'rotate(270deg)',
    },
  },
  'spinner-view_56211d'
);
const offset = 187;

const dash = keyframes(
  {
    '0%': {
      strokeDashoffset: `${offset}`,
    },
    '50%': {
      strokeDashoffset: `${offset / 4}`,
      transform: 'rotate(135deg)',
    },
    '100%': {
      strokeDashoffset: `${offset}`,
      transform: 'rotate(450deg)',
    },
  },
  'spinner-view_93a725'
);

const duration = '1.47s';

const useStyles = makeStyles((theme) => ({
  spinner: {
    animation: `${rotator} ${duration} linear infinite`,
  },
  path: {
    strokeDasharray: `${offset}`,
    strokeDashoffset: 0,
    transformOrigin: 'center',
    animation: `${dash} ${duration} ease-in-out infinite`,
    stroke: theme.primary[500],
  },
}));

export interface SpinnerViewProps {
  size?: number;
  color?: string;
}
export const SpinnerView = ({
  size = styleguide.gridbase * 8,
  color = undefined,
}: SpinnerViewProps) => {
  const styles = useStyles();
  const props: any = {};
  const style: any = {};
  if (color) {
    props.stroke = color;
    style.stroke = color;
  }
  return (
    <svg
      className={cn(styles.spinner)}
      width={size}
      height={size}
      viewBox="0 0 66 66"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className={cn(styles.path)}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        cx="33"
        cy="33"
        r="30"
        style={style}
        {...props}
      />
    </svg>
  );
};
export default SpinnerView;
