import { useCallback, useRef } from 'react';

export interface UseHapticsReturn {
  tick: () => void;
  heartbeat: (intensity?: number) => void;
  success: () => void;
  warning: () => void;
  cancel: () => void;
  isSupported: boolean;
}

/**
 * Reusable Web Vibration API haptics hook for recomp.
 * Supplies sensory biofeedback for both agentic micro-actions (typing/logging)
 * and deep cinematic physiological interventions (SOS craving engine).
 */
export function useHaptics(): UseHapticsReturn {
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSupported = typeof window !== 'undefined' && 'vibrate' in navigator;

  const cancel = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (isSupported) {
      try {
        navigator.vibrate(0);
      } catch {
        // Silently catch browser policy errors
      }
    }
  }, [isSupported]);

  /**
   * Micro-tap: Exactly 10ms light tick for typing, keystrokes, log selections, and incremental inputs.
   */
  const tick = useCallback(() => {
    if (isSupported) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignored in non-vibration or security-restricted frames
      }
    }
  }, [isSupported]);

  /**
   * Dynamic heartbeat pulse for the SOS Craving Engine.
   * Emulates biological lub-dub cardiac rhythm. When intensity is provided (0.0 - 1.0),
   * pulse duration and pause adjust dynamically to match urgency / calming down.
   */
  const heartbeat = useCallback(
    (intensity: number = 0.5) => {
      if (!isSupported) return;
      try {
        // Clamped intensity between 0.1 and 1.0
        const clamped = Math.max(0.1, Math.min(1.0, intensity));
        const pulseA = Math.round(20 + clamped * 25); // 22ms - 45ms
        const pause = Math.round(50 + (1 - clamped) * 40); // 50ms - 90ms
        const pulseB = Math.round(15 + clamped * 20); // 17ms - 35ms

        navigator.vibrate([pulseA, pause, pulseB]);
      } catch {
        // Ignored
      }
    },
    [isSupported]
  );

  /**
   * Success double-pulse for log confirmations and database updates.
   */
  const success = useCallback(() => {
    if (isSupported) {
      try {
        navigator.vibrate([20, 35, 20]);
      } catch {
        // Ignored
      }
    }
  }, [isSupported]);

  /**
   * Warning heavy buzz for caloric threshold exceeded or emergency alert.
   */
  const warning = useCallback(() => {
    if (isSupported) {
      try {
        navigator.vibrate(45);
      } catch {
        // Ignored
      }
    }
  }, [isSupported]);

  return {
    tick,
    heartbeat,
    success,
    warning,
    cancel,
    isSupported,
  };
}
