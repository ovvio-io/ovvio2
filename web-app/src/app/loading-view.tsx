import React from 'react';
import { styleguide } from '../../../styles/styleguide.ts';
import { LogoIcon } from '../../../styles/components/logo.tsx';
import {
  cn,
  keyframes,
  makeStyles,
} from '../../../styles/css-objects/index.ts';

const breath = keyframes({
  from: {
    transform: 'scale(1.5)',
    opacity: 0.8,
  },
  to: {
    transform: 'scale(1.8)',
    opacity: 1,
  },
});

const useStyles = makeStyles((theme, resolveClass) => ({
  logo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',

    ...styleguide.transition.standard,
    transitionDuration: '1000ms',
    transitionProperty: 'all',
  },
  animated: {
    animation: `1s ${breath} infinite both`,
    animationDirection: 'alternate',
  },
}));

export default function LoadingView() {
  const styles = useStyles();
  return (
    <div className={cn(styles.logo)}>
      <div className={cn(styles.animated)}>
        <LogoIcon />
      </div>
    </div>
  );
}
