import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseLongPressOptions {
  duration?: number; // duration in ms, default 5000
  onComplete: () => void;
}

export interface UseLongPressReturn {
  progress: number; // 0 to 100
  isPressing: boolean;
  handlers: {
    onMouseDown: () => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onTouchStart: () => void;
    onTouchEnd: () => void;
    onTouchCancel: () => void;
  };
  reset: () => void;
}

/**
 * Custom hook for high-friction physical long press confirmation.
 * Requires continuous hold for the specified duration (e.g., 5,000ms).
 * If the user releases early, progress instantly resets to 0.
 */
export function useLongPress({
  duration = 5000,
  onComplete,
}: UseLongPressOptions): UseLongPressReturn {
  const [progress, setProgress] = useState<number>(0);
  const [isPressing, setIsPressing] = useState<boolean>(false);

  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isCompleteRef = useRef<boolean>(false);

  const reset = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTimeRef.current = null;
    isCompleteRef.current = false;
    setIsPressing(false);
    setProgress(0);
  }, []);

  const step = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const currentProgress = Math.min(100, (elapsed / duration) * 100);
      setProgress(currentProgress);

      if (elapsed >= duration) {
        if (!isCompleteRef.current) {
          isCompleteRef.current = true;
          setIsPressing(false);
          setProgress(100);
          onComplete();
        }
      } else {
        animationFrameRef.current = requestAnimationFrame(step);
      }
    },
    [duration, onComplete]
  );

  const start = useCallback(() => {
    reset();
    setIsPressing(true);
    animationFrameRef.current = requestAnimationFrame(step);
  }, [reset, step]);

  const stop = useCallback(() => {
    if (!isCompleteRef.current) {
      reset();
    }
  }, [reset]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    progress,
    isPressing,
    handlers: {
      onMouseDown: start,
      onMouseUp: stop,
      onMouseLeave: stop,
      onTouchStart: start,
      onTouchEnd: stop,
      onTouchCancel: stop,
    },
    reset,
  };
}
