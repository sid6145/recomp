import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Wind, Quote, Heart, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/store';
import { closeSOS } from '../store/sosSlice';
import { useHaptics } from '../hooks/useHaptics';
import { CinematicTransition } from '../utils/motionPresets';

const CBT_QUOTES = [
  'Cravings usually fade within 10 minutes. Give yourself time.',
  'Take a slow breath. Notice the urge without acting on it.',
  'Giving in quickly restarts the cycle. Waiting gives you control.',
  'A short pause now makes reaching your goals much easier.',
  'The craving will pass whether you eat or not.',
  'Focus on your breathing for a few moments.',
];

// Box Breathing Timing: Inhale (4s) -> Hold (4s) -> Exhale (6s) = 14s total cycle
const INHALE_DURATION = 4;
const HOLD_DURATION = 4;
const EXHALE_DURATION = 6;
const CYCLE_DURATION = INHALE_DURATION + HOLD_DURATION + EXHALE_DURATION; // 14 seconds

interface HoldToBypassButtonProps {
  onBypass: () => void;
  holdDurationMs?: number;
}

/**
 * Empathetic Friction Button:
 * Requires a continuous 5,000ms `onPointerDown` hold to trigger.
 * Wrapped in an SVG circle that visibly fills up as the user holds it,
 * accompanied by `useHaptics().heartbeat()` that slows its rhythm as the circle fills.
 */
const HoldToBypassButton: React.FC<HoldToBypassButtonProps> = ({
  onBypass,
  holdDurationMs = 5000,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const haptics = useHaptics();

  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentProgressRef = useRef<number>(0);

  // SVG Ring Geometry
  const size = 96;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const cancelPress = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    haptics.cancel();
    startTimeRef.current = null;
    currentProgressRef.current = 0;
    setIsPressing(false);
    setProgress(0);
  }, [haptics]);

  /**
   * Adaptive Heartbeat Rhythm:
   * As the circle fills (0% -> 100%), the interval between beats slows down
   * from an agitated 240ms down to a grounded 950ms, delivering parasympathetic biofeedback.
   */
  const triggerHeartbeatCycle = useCallback(() => {
    if (!startTimeRef.current) return;

    const prog = currentProgressRef.current;
    // Intensity parameter for haptic: decreases from 0.9 (urgent) to 0.2 (calm)
    const intensity = Math.max(0.2, 0.9 - (prog / 100) * 0.7);
    haptics.heartbeat(intensity);

    // Interval between lub-dub beats: slows from 240ms (at 0%) to 950ms (at 100%)
    const nextInterval = 240 + Math.pow(prog / 100, 1.3) * 710;

    heartbeatTimerRef.current = setTimeout(() => {
      if (startTimeRef.current !== null) {
        triggerHeartbeatCycle();
      }
    }, nextInterval);
  }, [haptics]);

  const startPress = useCallback(
    (e: React.PointerEvent) => {
      // Capture pointer so dragging slightly doesn't abort press unexpectedly
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Fallback for environments lacking pointer capture
      }

      startTimeRef.current = performance.now();
      setIsPressing(true);
      currentProgressRef.current = 0;
      setProgress(0);

      // Start initial dynamic heartbeat pulse
      triggerHeartbeatCycle();

      const step = (now: number) => {
        if (!startTimeRef.current) return;
        const elapsed = now - startTimeRef.current;
        const currentProg = Math.min(100, (elapsed / holdDurationMs) * 100);
        currentProgressRef.current = currentProg;
        setProgress(currentProg);

        if (currentProg < 100) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          // Completed continuous 5,000ms friction gate
          cancelPress();
          haptics.warning();
          onBypass();
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    },
    [holdDurationMs, onBypass, cancelPress, triggerHeartbeatCycle, haptics]
  );

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative inline-flex items-center justify-center">
        {/* Circular Progress SVG Ring */}
        <svg
          className="w-24 h-24 -rotate-90 pointer-events-none"
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-neutral-800/80"
          />

          {/* Active Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#sos-bypass-gradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-75 ease-linear"
          />

          <defs>
            <linearGradient id="sos-bypass-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#00FF41" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Physical Hold Button */}
        <motion.button
          type="button"
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => e.preventDefault()}
          whileTap={{ scale: 0.94 }}
          className={`absolute w-18 h-18 rounded-full flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer border ${
            isPressing
              ? 'bg-rose-950/90 border-rose-500/70 shadow-[0_0_25px_rgba(244,63,94,0.45)]'
              : 'bg-neutral-900 border-white/10 hover:border-white/20 shadow-xl'
          }`}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isPressing ? 'text-rose-400 animate-pulse' : 'text-neutral-400'
            }`}
          />
          <span className="text-[9px] font-mono font-bold tracking-tight text-neutral-200 uppercase mt-0.5 leading-tight">
            Hold
          </span>
          <span className="text-[8px] font-mono text-neutral-400 tabular-nums">
            {isPressing ? `${Math.max(0, 5 - Math.floor((progress / 100) * 5))}s` : '5s'}
          </span>
        </motion.button>
      </div>

      <div className="flex flex-col items-center text-center space-y-0.5">
        <span className="text-xs font-mono tracking-wider text-neutral-200 uppercase font-bold">
          I Choose to Eat This
        </span>
        <span className="text-[10px] font-sans text-neutral-400">
          Hold button for 5 seconds to dismiss
        </span>
      </div>
    </div>
  );
};

interface MetamorphosisVisualizerProps {
  timeLeft: number; // 600 down to 0
  phase: 'Inhale' | 'Hold' | 'Exhale';
  cycleProgress: number; // 0 to 1 inside current 14s cycle
}

/**
 * Metamorphosis Visualizer:
 * Starts as a chaotic, fast-moving jagged shape and slowly interpolates
 * into a perfectly round, slowly pulsing circle over a 10-minute countdown.
 * Synchronized with box breathing rhythm: 4s in, 4s hold, 6s out.
 */
const MetamorphosisVisualizer: React.FC<MetamorphosisVisualizerProps> = ({
  timeLeft,
  phase,
}) => {
  // calmFactor: 0.0 = peak chaotic spike (at 600s), 1.0 = serene perfect circle (at 0s)
  const calmFactor = Math.min(1, Math.max(0, 1 - timeLeft / 600));

  // Box Breathing Target Scale
  const targetScale = phase === 'Inhale' ? 1.35 : phase === 'Hold' ? 1.35 : 1.0;
  const transitionDuration = phase === 'Exhale' ? 6 : 4;

  // Generate 24 vertices for the jagged -> circular interpolation
  const numVertices = 24;
  const baseRadius = 88;
  const center = 110;

  // Path generator for the morphing shape
  const polygonPoints = useMemo(() => {
    const points: string[] = [];
    for (let i = 0; i < numVertices; i++) {
      const angle = (i * 2 * Math.PI) / numVertices;
      // High-frequency alternating jagged spikes when calmFactor is 0
      // Spikes smoothly decay to 0 as calmFactor approaches 1
      const spikeFactor = i % 2 === 0 ? 0.32 : -0.22;
      const currentRadius = baseRadius * (1 + spikeFactor * (1 - calmFactor));
      const x = center + currentRadius * Math.cos(angle);
      const y = center + currentRadius * Math.sin(angle);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return points.join(' ');
  }, [calmFactor]);

  return (
    <div className="relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80 my-auto">
      {/* Ambient Breathing Glow Aura */}
      <motion.div
        animate={{
          scale: [1, targetScale * 1.15, 1],
          opacity: [0.2, 0.45, 0.2],
        }}
        transition={{
          duration: transitionDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-600/20 via-indigo-600/25 to-blue-600/20 blur-3xl pointer-events-none transform-gpu will-change-transform"
      />

      {/* Chaotic Jagged Shape -> Smooth Circling Metamorphosis */}
      <motion.div
        animate={{
          scale: targetScale,
          // Fast rotation when chaotic, slow peaceful rotation when calm
          rotate: 360,
        }}
        transition={{
          scale: {
            duration: transitionDuration,
            ease: 'easeInOut',
          },
          rotate: {
            duration: 4 + (1 - calmFactor) * 20, // 24s -> 4s
            repeat: Infinity,
            ease: 'linear',
          },
        }}
        className="absolute w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center pointer-events-none"
      >
        <svg
          viewBox="0 0 220 220"
          className="w-full h-full drop-shadow-[0_0_25px_rgba(6,182,212,0.25)]"
        >
          {calmFactor >= 0.98 ? (
            // Perfectly round circle when countdown approaches end
            <circle
              cx={center}
              cy={center}
              r={baseRadius}
              className="fill-cyan-950/20 stroke-cyan-400/40"
              strokeWidth="2"
            />
          ) : (
            // Jagged morphing polygon interpolating into circle
            <polygon
              points={polygonPoints}
              className="fill-cyan-950/25 stroke-cyan-400/50 transition-all duration-1000 ease-out"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </motion.div>

      {/* Inner Box Breathing Sanctuary Core */}
      <motion.div
        animate={{
          scale: targetScale * 0.92,
        }}
        transition={{
          duration: transitionDuration,
          ease: 'easeInOut',
        }}
        className="relative z-10 w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-white/10 bg-neutral-900/85 backdrop-blur-2xl shadow-[0_0_40px_rgba(99,102,241,0.25)] flex flex-col items-center justify-center p-4 text-center"
      >
        <Wind className="w-6 h-6 text-cyan-400 mb-1" />
        <span className="text-lg sm:text-xl font-black tracking-tight text-neutral-100 font-mono uppercase">
          {phase}
        </span>
        <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest mt-0.5 tabular-nums">
          {phase === 'Inhale' ? '4s' : phase === 'Hold' ? '4s' : '6s'}
        </span>
      </motion.div>
    </div>
  );
};

/**
 * The SOS Craving Engine (SOSModal.tsx)
 *
 * Design Specification:
 * - Environmental Shift: Full-screen overlay forcing `overflow-hidden` on body.
 *   Cross-fades background to `bg-gradient-to-b from-neutral-950 to-blue-950/50`
 *   via Framer Motion's `CinematicTransition` ({ duration: 1.5, ease: [0.16, 1, 0.3, 1] }).
 * - Metamorphosis Visualizer: Starts as a chaotic, fast-moving jagged shape and slowly interpolates
 *   into a perfectly round, slowly pulsing circle (box breathing: 4s in, 4s hold, 6s out) over 10-minute timer.
 * - Empathetic Friction Button: "Hold to Bypass" / "I Choose to Eat This" requiring 5,000ms hold.
 *   Wrapped in an SVG circle with `useHaptics.heartbeat()` that slows its rhythm as the circle fills.
 */
export const SOSModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const isSOSActive = useAppSelector((state) => state.sos.isSOSActive);

  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes (600s)
  const [quoteIndex, setQuoteIndex] = useState<number>(0);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [cycleProgress, setCycleProgress] = useState<number>(0);

  // 1. Environmental Shift: Lock body overflow on mount
  useEffect(() => {
    if (isSOSActive) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setTimeLeft(600);
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isSOSActive]);

  // 2. 10:00 Countdown Timer
  useEffect(() => {
    if (!isSOSActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isSOSActive, timeLeft]);

  // 3. Rotate Cognitive Defusion prompts every 30s
  useEffect(() => {
    if (!isSOSActive) return;
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % CBT_QUOTES.length);
    }, 30000);
    return () => clearInterval(interval);
  }, [isSOSActive]);

  // 4. Box Breathing Timing Engine (14s loop: 4s Inhale, 4s Hold, 6s Exhale)
  useEffect(() => {
    if (!isSOSActive) return;

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed = (elapsed + 1) % CYCLE_DURATION;
      setCycleProgress(elapsed / CYCLE_DURATION);

      if (elapsed < INHALE_DURATION) {
        setBreathPhase('Inhale');
      } else if (elapsed < INHALE_DURATION + HOLD_DURATION) {
        setBreathPhase('Hold');
      } else {
        setBreathPhase('Exhale');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSOSActive]);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [timeLeft]);

  const handleBypass = () => {
    dispatch(closeSOS());
  };

  const handleClose = () => {
    dispatch(closeSOS());
  };

  const content = (
    <AnimatePresence>
      {isSOSActive && (
        <motion.div
          key="sos-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={CinematicTransition}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-between p-6 sm:p-10 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] bg-gradient-to-b from-neutral-950 via-slate-950 to-blue-950/50 backdrop-blur-3xl text-neutral-100 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="SOS Craving Intervention Engine"
        >
          {/* Subtle developer-tool telemetry grid pattern */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]" />

          {/* Dismiss / Close cross button for emergency manual exit (min 44px touch target) */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-[calc(1.5rem+env(safe-area-inset-top,0px))] right-6 min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer border border-white/5 z-20 flex items-center justify-center"
            title="Exit SOS Mode"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Header & 10:00 Digital Counter */}
          <header className="relative z-10 w-full max-w-md flex flex-col items-center text-center pt-2 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Craving Pause
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                10-Minute Timer
              </span>
              <div className="text-6xl sm:text-7xl font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-neutral-100 via-neutral-200 to-neutral-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] tabular-nums">
                {formattedTime}
              </div>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto font-sans">
                Most cravings peak and fade within 10 minutes. Take deep breaths.
              </p>
            </div>
          </header>

          {/* Center: Metamorphosis Visualizer */}
          <div className="relative z-10 my-auto">
            <MetamorphosisVisualizer
              timeLeft={timeLeft}
              phase={breathPhase}
              cycleProgress={cycleProgress}
            />
          </div>

          {/* CBT Cognitive Defusion Psychological Prompt */}
          <div className="relative z-10 w-full max-w-md px-4 py-3 rounded-2xl bg-neutral-900/70 border border-white/5 backdrop-blur-xl text-center space-y-1 my-3">
            <div className="flex items-center justify-center gap-1.5 text-cyan-400 text-[10px] font-mono uppercase tracking-wider">
              <Quote className="w-3 h-3" /> Reminder
            </div>
            <p className="text-xs text-neutral-300 italic font-sans leading-relaxed">
              &ldquo;{CBT_QUOTES[quoteIndex]}&rdquo;
            </p>
          </div>

          {/* Bottom: Empathetic Friction Bypass Button */}
          <footer className="relative z-10 w-full max-w-xs pt-2 pb-4 flex flex-col items-center">
            <HoldToBypassButton onBypass={handleBypass} />
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
};
