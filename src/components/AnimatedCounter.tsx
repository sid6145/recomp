import React from 'react';
import { AnimatedNumber, type AnimatedNumberProps } from './AnimatedNumber';

export interface AnimatedCounterProps extends AnimatedNumberProps {}

/**
 * AnimatedCounter: Alias / wrapper around AnimatedNumber for backwards compatibility.
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = (props) => {
  return <AnimatedNumber {...props} />;
};
