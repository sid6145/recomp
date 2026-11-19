import React, { useEffect, useState } from 'react';
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
 * Implements rolling odometer telemetry:
 * - At >= 1.5x momentum: Smooth Framer Motion spring ticker interpolation.
 * - At 1.0x (standby): Snaps immediately with zero lag.
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

  const motionVal = useMotionValue(value);
  const springVal = useSpring(motionVal, { stiffness, damping });
  const [displayValue, setDisplayValue] = useState<string>(() => formatFn(value));

  // When value changes, animate or snap based on momentum tier
  useEffect(() => {
    if (!shouldAnimate) {
      motionVal.set(value);
      setDisplayValue(formatFn(value));
      return;
    }

    const controls = animate(motionVal, value, {
      type: 'spring',
      stiffness,
      damping,
    });

    return () => controls.stop();
  }, [value, shouldAnimate, motionVal, stiffness, damping, formatFn]);

  // Subscribe to spring value changes
  useEffect(() => {
    if (!shouldAnimate) return;

    const unsubscribe = springVal.on('change', (latest) => {
      setDisplayValue(formatFn(latest));
    });

    return () => unsubscribe();
  }, [springVal, shouldAnimate, formatFn]);

  return (
    <span className={`font-mono tabular-nums inline-block ${className}`}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};
