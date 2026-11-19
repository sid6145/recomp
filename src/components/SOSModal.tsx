import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Sparkles, CheckCircle2, X, Trophy } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/store';
import { closeSOS } from '../store/sosSlice';
import { addDodgedLog } from '../db/dodgedLogs';
import { useHaptics } from '../hooks/useHaptics';
import { useMomentum } from '../context/MomentumContext';
import { playLogTick } from '../utils/soundEngine';

const MOTIVATIONAL_QUOTES = [
  'A craving peaks in 10 minutes. Regret lasts all week.',
  "You aren't actually hungry—you're just bored, tired, or stressed. Ride the wave.",
  'Hunger is just the feeling of your body switching fuel sources.',
  "You didn't come this far to trade your progress for 3 minutes of sugar.",
  'Survive this timer and you literally level up.',
];

const QUICK_DODGE_PRESETS = [
  { label: 'Sweets / Dessert', calories: 350 },
  { label: 'Fried Street Food', calories: 450 },
  { label: 'Late Night Snack', calories: 250 },
  { label: 'Sugary Drink', calories: 180 },
];

// 4s Inhale, 4s Hold, 4s Exhale = 12s cycle
const INHALE_DURATION = 4;
const HOLD_DURATION = 4;
const EXHALE_DURATION = 4;
const TOTAL_CYCLE = INHALE_DURATION + HOLD_DURATION + EXHALE_DURATION; // 12s

interface SOSTimerLeafProps {
  onTimeUp: () => void;
}

/**
 * Isolated Leaf Component for 10-Minute Countdown & Breathing Ring.
 * Encapsulates the 1s and breathing intervals to prevent re-rendering parent tree.
 */
const SOSTimerLeaf: React.FC<SOSTimerLeafProps> = React.memo(({ onTimeUp }) => {
  const haptics = useHaptics();
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes (600s)
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathSeconds, setBreathSeconds] = useState<number>(4);

  // 10-Minute Countdown Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          haptics.success();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeUp, haptics]);

  // 12-Second Box Breathing Loop (4s Inhale, 4s Hold, 4s Exhale)
  useEffect(() => {
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed = (elapsed + 1) % TOTAL_CYCLE;

      if (elapsed < INHALE_DURATION) {
        setBreathPhase('Inhale');
        setBreathSeconds(INHALE_DURATION - elapsed);
      } else if (elapsed < INHALE_DURATION + HOLD_DURATION) {
        setBreathPhase('Hold');
        setBreathSeconds(INHALE_DURATION + HOLD_DURATION - elapsed);
      } else {
        setBreathPhase('Exhale');
        setBreathSeconds(TOTAL_CYCLE - elapsed);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = 600 - timeLeft;
  const progressRatio = Math.min(1, Math.max(0, elapsedSeconds / 600));

  const formattedTime = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [timeLeft]);

  return (
    <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
      {/* Dynamic Animated Pulse Ring */}
      <motion.div
        animate={{
          scale: breathPhase === 'Inhale' ? 1.08 : breathPhase === 'Hold' ? 1.08 : 0.94,
        }}
        transition={{
          duration: breathPhase === 'Hold' ? 0.2 : 4,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <svg className="w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 280 280">
          {/* Background Track */}
          <circle
            cx="140"
            cy="140"
            r="115"
            fill="none"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="5"
          />

          {/* Active Progress Circle */}
          <circle
            cx="140"
            cy="140"
            r="115"
            fill="none"
            stroke="url(#sos-progress-gradient)"
            strokeWidth="6"
            strokeDasharray={2 * Math.PI * 115}
            strokeDashoffset={(2 * Math.PI * 115) * (1 - progressRatio)}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />

          <defs>
            <linearGradient id="sos-progress-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Inner Content: Timer & Breathing cue */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
        <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 mb-1">
          Time Remaining
        </span>

        {/* Crisp 5xl Monospace Countdown */}
        <div className="font-mono text-5xl sm:text-6xl font-black tracking-tighter text-zinc-100 drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] tabular-nums">
          {formattedTime}
        </div>

        {/* Breathing Phase Tag */}
        <motion.div
          key={breathPhase}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-white/10 text-xs font-mono font-bold uppercase tracking-wider"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              breathPhase === 'Inhale'
                ? 'bg-cyan-400 animate-pulse'
                : breathPhase === 'Hold'
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-zinc-200">
            {breathPhase} ({breathSeconds}s)
          </span>
        </motion.div>
      </div>
    </div>
  );
});

export const SOSModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const isSOSActive = useAppSelector((state) => state.sos.isSOSActive);
  const haptics = useHaptics();
  const { triggerEnergyPulse } = useMomentum();

  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  // Flow steps: 'timer' -> 'victory' -> 'celebration'
  const [currentStep, setCurrentStep] = useState<'timer' | 'victory' | 'celebration'>('timer');
  const [customFoodName, setCustomFoodName] = useState<string>('');
  const [customCalories, setCustomCalories] = useState<string>('');
  const [savedCalories, setSavedCalories] = useState<number>(0);

  // Bypass Friction Hold Button State
  const [isPressingBypass, setIsPressingBypass] = useState<boolean>(false);
  const [bypassProgress, setBypassProgress] = useState<number>(0);
  const bypassStartRef = useRef<number | null>(null);
  const bypassAnimRef = useRef<number | null>(null);

  // Environmental shift: lock body scroll
  useEffect(() => {
    if (isSOSActive) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setCurrentStep('timer');
      setCustomFoodName('');
      setCustomCalories('');
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isSOSActive]);

  // Rotate Motivational Quotes every 45 seconds
  useEffect(() => {
    if (!isSOSActive || currentStep !== 'timer') return;
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 45000);
    return () => clearInterval(interval);
  }, [isSOSActive, currentStep]);

  const handleTimeUp = useCallback(() => {
    setCurrentStep('victory');
  }, []);

  const handleEarlyVictory = () => {
    haptics.success();
    setCurrentStep('victory');
  };

  const handleSaveVictory = async (foodName: string, calories: number) => {
    if (!foodName || calories <= 0) return;
    haptics.success();
    playLogTick();
    triggerEnergyPulse();
    setSavedCalories(calories);
    await addDodgedLog(foodName, calories);
    setCurrentStep('celebration');

    // Auto close after celebrating
    setTimeout(() => {
      dispatch(closeSOS());
    }, 2200);
  };

  const handlePresetSelect = (preset: { label: string; calories: number }) => {
    handleSaveVictory(preset.label, preset.calories);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customFoodName.trim() || 'Urge Resisted';
    const cals = parseInt(customCalories, 10);
    if (!isNaN(cals) && cals > 0) {
      handleSaveVictory(name, cals);
    }
  };

  // 5-second Hold to Bypass Friction Handler
  const startBypass = useCallback(() => {
    bypassStartRef.current = performance.now();
    setIsPressingBypass(true);
    setBypassProgress(0);

    const step = (now: number) => {
      if (!bypassStartRef.current) return;
      const elapsed = now - bypassStartRef.current;
      const prog = Math.min(100, (elapsed / 5000) * 100);
      setBypassProgress(prog);

      if (prog < 100) {
        bypassAnimRef.current = requestAnimationFrame(step);
      } else {
        // Dismiss
        cancelBypass();
        haptics.warning();
        dispatch(closeSOS());
      }
    };

    bypassAnimRef.current = requestAnimationFrame(step);
  }, [dispatch, haptics]);

  const cancelBypass = useCallback(() => {
    if (bypassAnimRef.current) {
      cancelAnimationFrame(bypassAnimRef.current);
      bypassAnimRef.current = null;
    }
    bypassStartRef.current = null;
    setIsPressingBypass(false);
    setBypassProgress(0);
  }, []);

  const content = (
    <AnimatePresence>
      {isSOSActive && (
        <motion.div
          key="sos-system-override"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-between p-6 sm:p-10 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] bg-zinc-950/95 backdrop-blur-2xl text-zinc-100 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          {/* Dynamic Ambient Glow */}
          <div
            className="pointer-events-none absolute inset-0 transition-all duration-1000 ease-out"
            style={{
              background: 'radial-gradient(circle at 50% 40%, rgba(244, 63, 94, 0.16) 0%, transparent 65%)',
            }}
          />

          {/* Telemetry Grid Pattern */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]" />

          {/* Emergency Close (Top Right) */}
          <button
            type="button"
            onClick={() => dispatch(closeSOS())}
            className="absolute top-[calc(1.5rem+env(safe-area-inset-top,0px))] right-6 min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/5 z-20 flex items-center justify-center"
            title="Exit SOS Mode"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ========================================================================= */}
          {/* STEP 1: ACTIVE 10-MINUTE TIMER & BREATHING RING                           */}
          {/* ========================================================================= */}
          {currentStep === 'timer' && (
            <>
              {/* Header Badge */}
              <header className="relative z-10 w-full max-w-md flex flex-col items-center text-center pt-2 space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                  <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>SYSTEM OVERRIDE // CRAVING INTERVENTION</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
                  Pause. Ride the Wave.
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 font-sans max-w-xs">
                  A physiological craving spike peaks and declines within 10 minutes. Follow the circle to regulate your nervous system.
                </p>
              </header>

              {/* Center: Isolated Leaf Timer & Breathing Cue */}
              <div className="relative z-10 my-auto flex flex-col items-center">
                <SOSTimerLeaf onTimeUp={handleTimeUp} />

                {/* Grounded Motivational Quotes (Rotating every 45s) */}
                <div className="w-full max-w-md min-h-[64px] flex items-center justify-center text-center px-4 mt-6">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={quoteIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.35 }}
                      className="text-xs sm:text-sm font-sans font-medium text-zinc-300 italic leading-relaxed"
                    >
                      &ldquo;{MOTIVATIONAL_QUOTES[quoteIndex]}&rdquo;
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              {/* Bottom Actions: Early Victory & Bypass Friction */}
              <footer className="relative z-10 w-full max-w-sm flex flex-col items-center gap-4 pb-2">
                {/* Early Victory Button ("I Beat the Urge") */}
                <motion.button
                  type="button"
                  onClick={handleEarlyVictory}
                  whileTap={{ scale: 0.96 }}
                  className="w-full min-h-[48px] py-3 px-6 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  <span>I Beat the Urge</span>
                </motion.button>

                {/* 5-Second Friction Bypass Hold Button */}
                <div className="w-full relative flex flex-col items-center">
                  <button
                    type="button"
                    onMouseDown={startBypass}
                    onMouseUp={cancelBypass}
                    onMouseLeave={cancelBypass}
                    onTouchStart={startBypass}
                    onTouchEnd={cancelBypass}
                    className="relative w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-mono font-medium text-zinc-400 hover:text-zinc-200 border border-white/5 bg-white/5 hover:bg-white/10 overflow-hidden select-none transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <span className="relative z-10">
                      {isPressingBypass ? 'Hold to bypass (5s)...' : 'I am giving in (Hold 5s)'}
                    </span>

                    {/* Filling progress bar */}
                    <div
                      className="absolute inset-0 bg-rose-500/20 pointer-events-none transition-all duration-75"
                      style={{ width: `${bypassProgress}%` }}
                    />
                  </button>
                  <span className="text-[10px] font-mono text-zinc-500 mt-1">
                    Intentional 5-second friction to break autopilot impulses
                  </span>
                </div>
              </footer>
            </>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: VICTORY LOGGING (Preset Pills or Custom Input)                     */}
          {/* ========================================================================= */}
          {currentStep === 'victory' && (
            <motion.div
              key="sos-victory-step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 w-full max-w-md my-auto flex flex-col items-center text-center space-y-6 p-6 rounded-3xl bg-zinc-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <Trophy className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white font-sans">
                  Urge Resisted!
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  Record what you dodged to deposit into your Dodged Vault.
                </p>
              </div>

              {/* Quick Preset Dodge Buttons */}
              <div className="w-full space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400">
                  Quick Select Craving
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_DODGE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className="min-h-[44px] p-3 rounded-xl bg-zinc-950/60 hover:bg-zinc-950 border border-white/5 hover:border-emerald-500/40 text-left transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <span className="text-xs font-semibold text-zinc-200 truncate">
                        {preset.label}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold tabular-nums">
                        +{preset.calories} kcal
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Or Custom Craving Input */}
              <form onSubmit={handleCustomSubmit} className="w-full space-y-3 pt-2 border-t border-white/5">
                <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 block">
                  Or enter custom item
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={customFoodName}
                    onChange={(e) => setCustomFoodName(e.target.value)}
                    placeholder="e.g. Samosa"
                    className="col-span-2 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-400/50"
                  />
                  <input
                    type="number"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value)}
                    placeholder="kcal"
                    className="col-span-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-400/50 tabular-nums"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customCalories || parseInt(customCalories, 10) <= 0}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Save to Dodged Vault
                </button>
              </form>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: CELEBRATION MODAL                                                 */}
          {/* ========================================================================= */}
          {currentStep === 'celebration' && (
            <motion.div
              key="sos-celebration-step"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, type: 'spring' }}
              className="relative z-10 w-full max-w-sm my-auto flex flex-col items-center text-center space-y-4 p-8 rounded-3xl bg-zinc-900/95 border border-emerald-500/40 backdrop-blur-2xl shadow-[0_0_50px_rgba(16,185,129,0.3)]"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-bounce shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Vault Deposited</span>
                </div>
                <h3 className="text-2xl font-black text-white font-sans">
                  +{savedCalories} kcal Dodged!
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  That&apos;s ~{(savedCalories / 7700).toFixed(2)} kg of body fat prevented. Your discipline builds momentum.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};
