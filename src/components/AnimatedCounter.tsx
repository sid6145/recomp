import React, { useEffect, useState } from 'react';
import { useMotionValue, useSpring, animate } from 'framer-motion';

export interface AnimatedCounterProps {
  value: number;
  formatFn?: (val: number) => string;
  className?: string;
  stiffness?: number;
  damping?: number;
}

/**
 * AnimatedCounter:
 * Fluid numerical ticker utilizing Framer Motion's `useSpring` and `animate`.
 * Rolls numbers up/down smoothly instead of abruptly snapping, ensuring
 * high-framerate visual feedback on live biometric calorie telemetry.
 *
 * Strictly adheres to monospace typography with `tabular-nums` for rock-solid tabular alignment.
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  formatFn = (v) => Math.round(v).toLocaleString(),
  className = '',
  stiffness = 300,
  damping = 28,
}) => {
  const motionVal = useMotionValue(value);
  const springVal = useSpring(motionVal, { stiffness, damping });
  const [displayValue, setDisplayValue] = useState<string>(() => formatFn(value));

  useEffect(() => {
    // Smoothly animate motion value to the incoming target value
    const controls = animate(motionVal, value, {
      type: 'spring',
      stiffness,
      damping,
    });

    return () => controls.stop();
  }, [value, motionVal, stiffness, damping]);

  useEffect(() => {
    const unsubscribe = springVal.on('change', (latest) => {
      setDisplayValue(formatFn(latest));
    });
    return () => unsubscribe();
  }, [springVal, formatFn]);

  return (
    <span className={`font-mono tabular-nums inline-block ${className}`}>
      {displayValue}
    </span>
  );
};
