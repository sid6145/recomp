import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { MaterialIcon } from './MaterialIcon';
import { useAppDispatch, useAppSelector } from '../store/store';
import { closeSOS, openCravingRebalance } from '../store/sosSlice';
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

const INHALE_DURATION = 4;
const HOLD_DURATION = 4;
const EXHALE_DURATION = 4;
const TOTAL_CYCLE = INHALE_DURATION + HOLD_DURATION + EXHALE_DURATION; // 12s

interface SOSTimerLeafProps {
  onTimeUp: () => void;
}

/**
 * Calm 200px SVG Breathing & Urge Countdown Ring in --md-primary
 */
const SOSTimerLeaf: React.FC<SOSTimerLeafProps> = React.memo(({ onTimeUp }) => {
  const haptics = useHaptics();
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathSeconds, setBreathSeconds] = useState<number>(4);

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

  const radius = 86;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative w-[200px] h-[200px] flex items-center justify-center">
      {/* Calm 200px SVG Breathing & Countdown Ring */}
      <m.div
        animate={{
          scale: breathPhase === 'Inhale' ? 1.05 : breathPhase === 'Hold' ? 1.05 : 0.95,
        }}
        transition={{
          duration: breathPhase === 'Hold' ? 0.2 : 4,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <svg className="w-[200px] h-[200px] -rotate-90 pointer-events-none" viewBox="0 0 200 200">
          {/* Background Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--md-surface-container-highest)"
            strokeWidth="8"
          />

          {/* Active Progress Circle in --md-primary */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--md-primary)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progressRatio)}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
      </m.div>

      {/* Inner Countdown */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center p-2">
        <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--md-on-surface-variant)] mb-0.5">
          Surfing Urge
        </span>

        <div className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-[var(--md-on-surface)] tabular-nums">
          {formattedTime}
        </div>

        <m.div
          key={breathPhase}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--md-surface-container)] text-[11px] font-display font-semibold text-[var(--md-on-surface)]"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              breathPhase === 'Inhale'
                ? 'bg-[var(--md-primary)] animate-pulse'
                : breathPhase === 'Hold'
                ? 'bg-[var(--md-secondary)]'
                : 'bg-[var(--md-tertiary)]'
            }`}
          />
          <span>{breathPhase} ({breathSeconds}s)</span>
        </m.div>
      </div>
    </div>
  );
});

SOSTimerLeaf.displayName = 'SOSTimerLeaf';

export const SOSModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const isSOSActive = useAppSelector((state) => state.sos.isSOSActive);
  const haptics = useHaptics();
  const { triggerEnergyPulse } = useMomentum();

  const [quoteIndex, setQuoteIndex] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<'timer' | 'victory' | 'celebration'>('timer');
  const [customFoodName, setCustomFoodName] = useState<string>('');
  const [customCalories, setCustomCalories] = useState<string>('');
  const [savedCalories, setSavedCalories] = useState<number>(0);

  const [isPressingBypass, setIsPressingBypass] = useState<boolean>(false);
  const [bypassProgress, setBypassProgress] = useState<number>(0);
  const bypassStartRef = useRef<number | null>(null);
  const bypassAnimRef = useRef<number | null>(null);

  useEffect(() => {
    if (isSOSActive) {
      document.body.style.overflow = 'hidden';
      setCurrentStep('timer');
      setQuoteIndex(Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length));
    } else {
      document.body.style.overflow = '';
    }
  }, [isSOSActive]);

  const handleTimeUp = useCallback(() => {
    setCurrentStep('victory');
  }, []);

  const handleEarlyVictory = () => {
    haptics.tick();
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

    setTimeout(() => {
      dispatch(closeSOS());
    }, 2000);
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
        cancelBypass();
        haptics.warning();
        dispatch(openCravingRebalance());
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

  if (!isSOSActive || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
        {/* Backdrop Scrim rgba(0,0,0,0.32) */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => dispatch(closeSOS())}
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
        />

        {/* M3 Modal Bottom Sheet */}
        <m.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden z-10 border-t sm:border border-[var(--md-outline-variant)]/30"
          role="dialog"
          aria-modal="true"
        >
          {/* Centered 32px × 4px Drag Handle Pill */}
          <div className="w-full flex justify-center pt-3 pb-1 shrink-0 cursor-grab">
            <div className="w-8 h-1 rounded-full bg-[var(--md-outline-variant)] opacity-60" />
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)]/20 pb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-semibold bg-[var(--md-error-container)] text-[var(--md-on-error-container)]">
                <MaterialIcon name="warning" size={16} filled />
                <span>CBT Urge Surfing</span>
              </div>
              <button
                type="button"
                onClick={() => dispatch(closeSOS())}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--md-on-surface-variant)] hover:bg-[var(--md-on-surface)]/10 transition-colors m3-state-layer cursor-pointer"
                title="Exit SOS Mode"
              >
                <MaterialIcon name="close" size={20} />
              </button>
            </div>

            {/* STEP 1: Timer & Breathing */}
            {currentStep === 'timer' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-bold font-display text-[var(--md-on-surface)]">
                    Pause. Ride the Wave.
                  </h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)] font-sans max-w-xs mx-auto">
                    A craving peaks and subsides in 10 minutes. Follow the circle to calm your impulse.
                  </p>
                </div>

                {/* Calm 200px SVG Breathing Ring in --md-primary */}
                <div className="py-2">
                  <SOSTimerLeaf onTimeUp={handleTimeUp} />
                </div>

                {/* CBT Prompt Card (--md-surface-container, rounded-[20px]) */}
                <div className="w-full p-4 rounded-[20px] bg-[var(--md-surface-container)] text-xs text-[var(--md-on-surface)] italic font-sans leading-relaxed border border-[var(--md-outline-variant)]/20 shadow-sm">
                  &ldquo;{MOTIVATIONAL_QUOTES[quoteIndex]}&rdquo;
                </div>

                {/* Actions: 52px-tall M3 Filled CTA in --md-primary */}
                <div className="w-full space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleEarlyVictory}
                    className="w-full h-[52px] rounded-full font-display font-bold text-sm tracking-wide bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 m3-state-layer"
                  >
                    <MaterialIcon name="military_tech" size={20} filled />
                    <span>I Beat the Urge</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      haptics.tick();
                      dispatch(openCravingRebalance());
                    }}
                    className="w-full h-[46px] rounded-full font-display font-semibold text-xs bg-[var(--md-surface-container)] text-[var(--md-on-surface)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 m3-state-layer"
                  >
                    <MaterialIcon name="auto_fix_high" size={18} />
                    <span>Fulfill &amp; Rebalance Dinner</span>
                  </button>

                  {/* 5-second Hold Bypass */}
                  <div className="w-full relative flex flex-col items-center pt-1">
                    <button
                      type="button"
                      onMouseDown={startBypass}
                      onMouseUp={cancelBypass}
                      onMouseLeave={cancelBypass}
                      onTouchStart={startBypass}
                      onTouchEnd={cancelBypass}
                      className="relative w-full h-11 rounded-full text-xs font-display font-medium text-[var(--md-on-surface-variant)] bg-[var(--md-surface-container)] overflow-hidden select-none transition-colors cursor-pointer flex items-center justify-center border border-[var(--md-outline-variant)]/20"
                    >
                      <span className="relative z-10">
                        {isPressingBypass ? 'Hold to bypass (5s)...' : 'I am giving in (Hold 5s)'}
                      </span>
                      <div
                        className="absolute inset-0 bg-[var(--md-error-container)] opacity-50 pointer-events-none transition-all duration-75"
                        style={{ width: `${bypassProgress}%` }}
                      />
                    </button>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] mt-1 font-sans">
                      5-second friction to break autopilot impulses
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: VICTORY LOGGING */}
            {currentStep === 'victory' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center">
                  <MaterialIcon name="military_tech" size={28} filled />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-bold font-display text-[var(--md-on-surface)]">
                    Urge Resisted!
                  </h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)] font-sans">
                    Deposit the avoided calories straight into your Dodged Vault.
                  </p>
                </div>

                {/* Preset Chips */}
                <div className="w-full space-y-2">
                  <span className="text-xs font-bold uppercase font-display text-[var(--md-on-surface-variant)] block text-left">
                    Select Dodged Item
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_DODGE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        className="p-3 rounded-[20px] bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-highest)] text-left transition-all cursor-pointer flex flex-col justify-between m3-state-layer"
                      >
                        <span className="text-xs font-semibold font-display text-[var(--md-on-surface)] truncate">
                          {preset.label}
                        </span>
                        <span className="text-xs font-mono text-[var(--md-primary)] font-bold tabular-nums mt-1">
                          +{preset.calories} kcal
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Craving Input */}
                <form onSubmit={handleCustomSubmit} className="w-full space-y-2.5 pt-3 border-t border-[var(--md-outline-variant)]/20">
                  <span className="text-xs font-bold uppercase font-display text-[var(--md-on-surface-variant)] block text-left">
                    Or Enter Custom Calories
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customFoodName}
                      onChange={(e) => setCustomFoodName(e.target.value)}
                      placeholder="Food name (e.g. Samosa)"
                      className="flex-1 bg-[var(--md-surface-container)] text-[var(--md-on-surface)] rounded-full px-4 py-2.5 text-xs font-display focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
                    />
                    <input
                      type="number"
                      value={customCalories}
                      onChange={(e) => setCustomCalories(e.target.value)}
                      placeholder="kcal"
                      className="w-24 bg-[var(--md-surface-container)] text-[var(--md-on-surface)] rounded-full px-3 py-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)] text-center tabular-nums"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!customCalories}
                    className="w-full h-[52px] rounded-full font-display font-bold text-sm bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 m3-state-layer disabled:opacity-50"
                  >
                    <MaterialIcon name="savings" size={20} filled />
                    <span>Deposit to Dodged Vault</span>
                  </button>
                </form>
              </div>
            )}

            {/* STEP 3: CELEBRATION */}
            {currentStep === 'celebration' && (
              <div className="py-8 flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center animate-bounce">
                  <MaterialIcon name="check" size={32} />
                </div>
                <h3 className="text-2xl font-bold font-display text-[var(--md-on-surface)]">
                  +{savedCalories} kcal Banked!
                </h3>
                <p className="text-xs text-[var(--md-on-surface-variant)] font-sans">
                  Deposited into your Dodged Calories Vault.
                </p>
              </div>
            )}
          </div>
        </m.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
