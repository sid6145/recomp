import type { Transition } from 'framer-motion';

/**
 * Agentic Developer-Tool Motion Preset:
 * Hyper-efficient, high-frequency, responsive spring physics.
 * Applied for fast UI toggles, searching, bottom sheets, and interactive micro-actions.
 */
export const AgenticTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
};

/**
 * Dark-Luxury Cinematic Motion Preset:
 * Atmospheric, heavy, expansive fluid curve.
 * Applied for SOS background shifts, modal transitions, and the 3D telemetry flip.
 */
export const CinematicTransition: Transition = {
  duration: 1.5,
  ease: [0.16, 1, 0.3, 1],
};
