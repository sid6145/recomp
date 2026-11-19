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

export const SOSModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const isSOSActive = useAppSelector((state) => state.sos.isSOSActive);
  const haptics = useHaptics();
  const { triggerEnergyPulse } = useMomentum();

  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes (600s)
  const [quoteIndex, setQuoteIndex] = useState<number>(0);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathSeconds, setBreathSeconds] = useState<number>(4);

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
      setTimeLeft(600);
      setCurrentStep('timer');
      setCustomFoodName('');
      setCustomCalories('');
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isSOSActive]);

  // 10-Minute Countdown Timer
  useEffect(() => {
    if (!isSOSActive || currentStep !== 'timer') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCurrentStep('victory');
          haptics.success();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSOSActive, currentStep]);

  // Rotate Motivational Quotes every 45 seconds
  useEffect(() => {
    if (!isSOSActive || currentStep !== 'timer') return;
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 45000);
    return () => clearInterval(interval);
  }, [isSOSActive, currentStep]);

  // 12-Second Box Breathing Loop (4s Inhale, 4s Hold, 4s Exhale)
  useEffect(() => {
    if (!isSOSActive || currentStep !== 'timer') return;

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
  }, [isSOSActive, currentStep]);

  const elapsedSeconds = 600 - timeLeft;

  const formattedTime = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [timeLeft]);

  // Ambient Glow Interpolation (crimson rose-500/15 -> emerald-500/15)
  const progressRatio = Math.min(1, Math.max(0, elapsedSeconds / 600));

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
          {/* Dynamic Ambient Glow: shifts from rose-500/15 to emerald-500/15 */}
          <div
            className="pointer-events-none absolute inset-0 transition-all duration-1000 ease-out"
            style={{
              background: `radial-gradient(circle at 50% 40%, rgba(${
                Math.round(244 * (1 - progressRatio) + 16 * progressRatio)
              }, ${
                Math.round(63 * (1 - progressRatio) + 185 * progressRatio)
              }, ${
                Math.round(94 * (1 - progressRatio) + 129 * progressRatio)
              }, 0.16) 0%, transparent 65%)`,
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
                <p className="text-xs text-zinc-400 font-sans max-w-xs">
                  Neurochemical cravings peak in 10 minutes. Slow your heart rate and let it pass.
                </p>
              </header>

              {/* Centerpiece: Animated Breathing Ring wrapping 5xl countdown */}
              <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                <div className="relative w-72 h-72 sm:w-84 sm:h-84 flex items-center justify-center">
                  {/* Outer Breathing Aura */}
                  <motion.div
                    animate={{
                      scale: breathPhase === 'Inhale' ? 1.25 : breathPhase === 'Hold' ? 1.25 : 1.0,
                      opacity: breathPhase === 'Hold' ? 0.35 : 0.2,
                    }}
                    transition={{
                      duration: breathPhase === 'Hold' ? 0.2 : 4,
                      ease: 'easeInOut',
                    }}
                    className={`absolute inset-0 rounded-full blur-3xl transition-colors duration-1000 ${
                      progressRatio > 0.5 ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                    }`}
                  />

                  {/* Breathing Ring SVG */}
                  <motion.div
                    animate={{
                      scale: breathPhase === 'Inhale' ? 1.15 : breathPhase === 'Hold' ? 1.15 : 0.98,
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
                  <span>I Beat the Urge // Log Victory</span>
                </motion.button>

                {/* Empathetic Friction Bypass Button (Hold 5s to dismiss) */}
                <div className="flex flex-col items-center gap-1.5 select-none">
                  <button
                    type="button"
                    onPointerDown={startBypass}
                    onPointerUp={cancelBypass}
                    onPointerCancel={cancelBypass}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`min-h-[40px] px-4 py-2 rounded-xl text-[11px] font-mono font-medium transition-all border cursor-pointer ${
                      isPressingBypass
                        ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    {isPressingBypass
                      ? `Holding... ${Math.max(0, 5 - Math.floor((bypassProgress / 100) * 5))}s`
                      : 'Hold to Bypass (I Choose to Eat)'}
                  </button>
                </div>
              </footer>
            </>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: "LOG YOUR VICTORY" DODGED CALORIES PROMPT                         */}
          {/* ========================================================================= */}
          {currentStep === 'victory' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 w-full max-w-md my-auto flex flex-col items-center text-center space-y-6 p-6 rounded-3xl bg-zinc-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl"
            >
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Trophy className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                  System Override Complete
                </span>
                <h3 className="text-2xl font-bold font-sans text-zinc-100">Log Your Victory</h3>
                <p className="text-xs text-zinc-400 font-sans">
                  What craving did you just successfully dodge? Bank these saved calories to your Dodged Vault.
                </p>
              </div>

              {/* 1-Tap Quick-Select Presets */}
              <div className="w-full grid grid-cols-2 gap-2.5">
                {QUICK_DODGE_PRESETS.map((preset) => (
                  <motion.button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900 border border-white/5 hover:border-emerald-500/40 text-left transition-all flex flex-col justify-between cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-zinc-200 group-hover:text-emerald-300 font-sans">
                      {preset.label}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 mt-2">
                      +{preset.calories} kcal
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Custom Food & Calorie Input Form */}
              <form onSubmit={handleCustomSubmit} className="w-full space-y-3 pt-2 border-t border-white/5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block text-left">
                  Or enter custom item:
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 2 Slices Pizza"
                    value={customFoodName}
                    onChange={(e) => setCustomFoodName(e.target.value)}
                    className="flex-1 bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="number"
                    placeholder="kcal"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value)}
                    className="w-24 bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customCalories}
                  className="w-full min-h-[42px] rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Bank Custom Victory</span>
                </button>
              </form>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: CELEBRATION PULSE & CONFIRMATION                                  */}
          {/* ========================================================================= */}
          {currentStep === 'celebration' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className="relative z-10 w-full max-w-sm my-auto flex flex-col items-center text-center space-y-4 p-8 rounded-3xl bg-zinc-900/95 border border-emerald-500/40 backdrop-blur-2xl shadow-[0_0_50px_rgba(16,185,129,0.3)]"
            >
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
                <div className="relative p-4 rounded-full bg-emerald-500 text-zinc-950 shadow-[0_0_25px_#10b981]">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold font-sans text-zinc-100">Victory Banked!</h3>
                <div className="text-3xl font-black font-mono text-emerald-400">
                  +{savedCalories} kcal
                </div>
                <p className="text-xs text-zinc-400 font-sans pt-1">
                  Resisted and locked into your Dodged Calories Vault.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
};
