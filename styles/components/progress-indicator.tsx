import React from 'react';
import { brandLightTheme as theme } from '../theme.tsx';
import { randomInt } from '../../base/math.ts';
import { CanvasAnimation } from './canvas-animation.tsx';
import { easeInOutSine } from '../../base/time.ts';

export interface IndeterminateProgressIndicatorProps {
  className?: string;
}

export function IndeterminateProgressIndicator(
  props?: IndeterminateProgressIndicatorProps,
) {
  return (
    <CanvasAnimation
      render={(ctx, width, height, phase) => {
        const lineWidth = 2.0;
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = theme.primary.p3;
        ctx.beginPath();
        ctx.arc(
          width / 2.0,
          height / 2.0,
          Math.min(width, height) / 2.0 - lineWidth,
          0,
          2 * Math.PI,
        );
        ctx.stroke();

        const start = -Math.PI / 2 + easeInOutSine(phase) * 2 * Math.PI;
        ctx.strokeStyle = theme.primary.p8;
        ctx.beginPath();
        ctx.arc(
          width / 2.0,
          height / 2.0,
          Math.min(width, height) / 2.0 - lineWidth,
          start,
          start + 0.4 * Math.PI,
        );
        ctx.stroke();
      }}
      durationMs={randomInt(950, 1050)}
      repeat={true}
      width={16}
      height={16}
      className={props?.className}
      randomOffset={true}
    />
  );
}
