import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useMomentum } from '../context/MomentumContext';

/**
 * UnstableOverdriveBanner Component (src/components/UnstableOverdriveBanner.tsx)
 *
 * Visible only when data-unstable="true":
 * Slim, high-contrast amber status pill warning the user of potential tier loss:
 * "OVERDRIVE UNSTABLE // {remainingProtein}g PROTEIN TO HOLD 3.0x"
 */
export const UnstableOverdriveBanner: React.FC = () => {
  const { isUnstable, remainingProtein } = useMomentum();

  return (
    <AnimatePresence>
      {isUnstable && (
        <motion.div
          key="unstable-banner"
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full flex items-center justify-center my-2 px-2"
        >
          <div
            data-testid="unstable-warning-pill"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-mono font-bold tracking-wider uppercase bg-amber-950/80 text-amber-300 border border-amber-500/50 shadow-[0_0_18px_rgba(245,158,11,0.35)] select-none animate-pulse"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              OVERDRIVE UNSTABLE // {remainingProtein}g PROTEIN TO HOLD 3.0x
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
