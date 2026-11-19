import React, { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, animate } from 'framer-motion';
import { useMomentum } from '../context/MomentumContext';

export interface AnimatedNumberProps {
  value: number;
  formatFn?: (val: number) => string;
  className?: string;
  stiffness?: number;
  damping?: number;
  prefix?: string;
  suffix?: string;
}

/**
 * AnimatedNumber Component (src/components/AnimatedNumber.tsx)
 *
 * Implements rolling odometer telemetry with Zero-Re-Render direct DOM updates:
 * - Direct DOM manipulation via spanRef eliminates per-frame React re-renders.
 * - Tight spring settle thresholds (restDelta: 0.5, restSpeed: 5) prevent lingering sub-pixel compute frames.
 * - At >= 1.5x momentum: Smooth Framer Motion spring ticker interpolation.
 * - At 1.0x (standby): Snaps immediately with zero compute overhead.
 * - Strictly monospace font with tabular-nums for jitter-free alignment.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  formatFn = (v) => Math.round(v).toLocaleString(),
  className = '',
  stiffness = 420,
  damping = 26,
  prefix = '',
  suffix = '',
}) => {
  const { momentumTier } = useMomentum();
  const shouldAnimate = momentumTier >= 1.5;
  const spanRef = useRef<HTMLSpanElement>(null);

  const motionVal = useMotionValue(value);
  const springVal = useSpring(motionVal, {
    stiffness,
    damping,
    restDelta: 0.5,
    restSpeed: 5,
  });

  // When value changes, animate or snap based on momentum tier
  useEffect(() => {
    if (!shouldAnimate) {
      motionVal.set(value);
      if (spanRef.current) {
        spanRef.current.textContent = formatFn(value);
      }
      return;
    }

    const controls = animate(motionVal, value, {
      type: 'spring',
      stiffness,
      damping,
      restDelta: 0.5,
      restSpeed: 5,
    });

    return () => controls.stop();
  }, [value, shouldAnimate, motionVal, stiffness, damping, formatFn]);

  // Subscribe to spring value changes with zero React re-renders
  useEffect(() => {
    if (!shouldAnimate) {
      if (spanRef.current) {
        spanRef.current.textContent = formatFn(value);
      }
      return;
    }

    const unsubscribe = springVal.on('change', (latest) => {
      if (spanRef.current) {
        spanRef.current.textContent = formatFn(latest);
      }
    });

    return () => unsubscribe();
  }, [springVal, shouldAnimate, formatFn, value]);

  return (
    <span className={`font-mono tabular-nums inline-block ${className}`}>
      {prefix}
      <span ref={spanRef}>{formatFn(value)}</span>
      {suffix}
    </span>
  );
};
