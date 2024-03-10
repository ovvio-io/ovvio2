import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { randomInt } from '../../base/math.ts';

export type CanvasAnimationRenderer = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  phase: number,
) => boolean | void;

export interface CanvasAnimationProps {
  width: number;
  height: number;
  render: CanvasAnimationRenderer;
  durationMs: number;
  repeat?: boolean; // Defaults to false
  reverse?: boolean; // Defaults to false
  timingFunction?: (x: number) => number; // Defaults to linear
  className?: string;
  randomOffset?: boolean; // Defaults to false
}

function linearTiming(x: number): number {
  return x;
}

export function CanvasAnimation({
  width,
  height,
  render,
  durationMs,
  repeat,
  reverse,
  timingFunction,
  className,
  randomOffset,
}: CanvasAnimationProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  let animationId = 0;
  let startTime = 0;
  let cycleCount = 0;
  const totalFrames = Math.floor(60 * durationMs);
  const startOffset = useMemo(
    () =>
      randomOffset === true
        ? randomInt(0, Math.floor(60 * durationMs) * 0.17) / totalFrames
        : 0,
    [durationMs, randomOffset],
  );

  const renderWrapper = useCallback(
    (now: DOMHighResTimeStamp) => {
      const ctx = ref.current?.getContext('2d');
      if (!ctx) {
        return;
      }
      ctx.save();
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.clearRect(0, 0, width, height);
      const phase =
        startOffset +
        Math.max(
          0,
          Math.min(1, startTime === 0 ? 0 : (now - startTime) / durationMs),
        );

      const shouldRepeat =
        render(
          ctx,
          width,
          height,
          (timingFunction || linearTiming)(
            cycleCount % 2 === 1 && reverse ? 1.0 - phase : phase,
          ),
        ) || repeat;
      if (phase < 1 || shouldRepeat) {
        if (startTime === 0) {
          startTime = now;
        }
        if (phase >= 1) {
          startTime = 0;
          ++cycleCount;
        }
        animationId = requestAnimationFrame(renderWrapper);
      } else {
        animationId = 0;
        startTime = 0;
      }
      ctx.restore();
    },
    [render, ref, durationMs, repeat, width, height],
  );

  useEffect(() => {
    if (!ref) {
      return;
    }
    animationId = requestAnimationFrame(renderWrapper);
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = 0;
        startTime = 0;
      }
    };
  }, [renderWrapper, ref]);

  return (
    <canvas
      ref={ref}
      width={`${width * devicePixelRatio}px`}
      height={`${height * devicePixelRatio}px`}
      style={{ width: `${width}px`, height: `${height}px` }}
      className={className}
    />
  );
}
