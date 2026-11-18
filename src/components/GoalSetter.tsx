import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Activity, ShieldAlert, Sparkles, Scale, User, Ruler, Calendar } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/store';
import { updateProfile, type ProfileState } from '../store/userSlice';
import { syncProfileToDb, loadProfileFromDb } from '../db/profileSync';
import { type Gender } from '../utils/thermodynamics';
import { useHaptics } from '../hooks/useHaptics';
import { AgenticTransition } from '../utils/motionPresets';

interface GoalOption {
  label: string;
  sublabel: string;
  value: number; // kg per week
  color: string;
}

const GOAL_OPTIONS: GoalOption[] = [
  { label: 'Maintain', sublabel: '0 kg/wk', value: 0, color: 'from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/40' },
  { label: 'Mild', sublabel: '-0.25 kg/wk', value: 0.25, color: 'from-[#00FF41]/20 to-teal-500/20 text-[#00FF41] border-[#00FF41]/40' },
  { label: 'Standard', sublabel: '-0.50 kg/wk', value: 0.5, color: 'from-[#00FF41]/30 to-emerald-500/20 text-[#00FF41] border-[#00FF41]/50' },
  { label: 'Aggressive', sublabel: '-0.75 kg/wk', value: 0.75, color: 'from-orange-500/20 to-rose-500/20 text-orange-400 border-orange-500/40' },
  { label: 'Extreme', sublabel: '-1.00 kg/wk', value: 1.0, color: 'from-rose-500/20 to-[#E60000]/30 text-rose-400 border-[#E60000]/50' },
];

const ACTIVITY_LEVELS = [
  { label: 'Sedentary (Desk job, minimal exercise)', value: 1.2 },
  { label: 'Light (Exercise 1-3 days/week)', value: 1.375 },
  { label: 'Moderate (Exercise 3-5 days/week)', value: 1.55 },
  { label: 'Active (Hard exercise 6-7 days/week)', value: 1.725 },
];

export const GoalSetter: React.FC = () => {
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.user);
  const haptics = useHaptics();

  // On initial mount, hydrate profile from IndexedDB if saved
  useEffect(() => {
    loadProfileFromDb().then((saved) => {
      if (saved) {
        dispatch(updateProfile(saved));
      } else {
        syncProfileToDb(profile);
      }
    });
  }, [dispatch]);

  // Autosave to IndexedDB on every Redux state update
  useEffect(() => {
    syncProfileToDb(profile);
  }, [profile]);

  /**
   * Strictly typed profile state mutation handler
   */
  const handleInputChange = <K extends keyof ProfileState>(field: K, value: ProfileState[K]) => {
    haptics.tick();
    dispatch(updateProfile({ [field]: value }));
  };

  const isSafetyFloor = profile.dailyCaloricTarget <= 1200;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 touch-pan-y">
      {/* Container with Glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={AgenticTransition}
        className="relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/90 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 space-y-8 touch-pan-y"
      >
        {/* Glow Accents */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-[#00FF41]/10 rounded-full blur-3xl transform-gpu will-change-transform" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl transform-gpu will-change-transform" />

        {/* Live Target Readout Header */}
        <div className="relative border-b border-white/5 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wide uppercase bg-neutral-950/80 border border-white/5 text-neutral-400">
              <Sparkles className="w-3.5 h-3.5 text-[#00FF41]" />
              Calorie Target
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-100 font-sans">
              Set Your Goal
            </h2>
            <p className="text-sm text-neutral-400 font-sans">
              Personalized daily calories based on your body stats and activity level.
            </p>
          </div>

          {/* Dynamic Target Hero Display */}
          <div className="flex flex-col items-start md:items-end">
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-neutral-500">
              Daily Target
            </span>
            <div className="flex items-baseline gap-2">
              <motion.span
                key={profile.dailyCaloricTarget}
                initial={{ scale: 1.15, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={AgenticTransition}
                className="text-4xl sm:text-5xl font-black tracking-tight text-[#00FF41] drop-shadow-[0_0_15px_rgba(0,255,65,0.25)] font-mono tabular-nums"
              >
                {profile.dailyCaloricTarget.toLocaleString()}
              </motion.span>
              <span className="text-sm font-mono font-semibold text-neutral-400">kcal/day</span>
            </div>

            {/* Safety Floor Alert */}
            <AnimatePresence>
              {isSafetyFloor && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5 text-xs text-[#E60000] mt-1 font-mono font-medium"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>1,200 kcal is the recommended daily minimum</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Section: Biometrics Input Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2 font-sans">
            <User className="w-3.5 h-3.5 text-neutral-500" />
            Your Stats
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gender Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-400 font-sans">Sex</label>
              <div className="grid grid-cols-2 p-1 bg-neutral-950 border border-white/5 rounded-xl">
                {(['M', 'F'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleInputChange('gender', g)}
                    className={`py-2 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer ${
                      profile.gender === g
                        ? 'bg-[#00FF41]/10 text-[#00FF41] shadow-sm border border-[#00FF41]/30 font-bold'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {g === 'M' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-400 flex items-center justify-between font-sans">
                <span>Age</span>
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="15"
                  max="120"
                  value={profile.age || ''}
                  onChange={(e) => handleInputChange('age', Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-sm font-mono font-medium text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#00FF41]/50 focus:border-[#00FF41]/50 transition-colors tabular-nums"
                  placeholder="28"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-neutral-500 pointer-events-none font-mono">
                  yrs
                </span>
              </div>
            </div>

            {/* Weight */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-400 flex items-center justify-between font-sans">
                <span>Current Weight</span>
                <Scale className="w-3.5 h-3.5 text-neutral-500" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="350"
                  value={profile.weightKg || ''}
                  onChange={(e) => handleInputChange('weightKg', parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-sm font-mono font-medium text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#00FF41]/50 focus:border-[#00FF41]/50 transition-colors tabular-nums"
                  placeholder="80"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-neutral-500 pointer-events-none font-mono">
                  kg
                </span>
              </div>
            </div>

            {/* Height */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-400 flex items-center justify-between font-sans">
                <span>Height</span>
                <Ruler className="w-3.5 h-3.5 text-neutral-500" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="90"
                  max="250"
                  value={profile.heightCm || ''}
                  onChange={(e) => handleInputChange('heightCm', Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3.5 py-2.5 text-sm font-mono font-medium text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#00FF41]/50 focus:border-[#00FF41]/50 transition-colors tabular-nums"
                  placeholder="178"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-neutral-500 pointer-events-none font-mono">
                  cm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Activity Multiplier */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2 font-sans">
            <Activity className="w-3.5 h-3.5 text-neutral-500" />
            Activity Level & Exercise Frequency
          </label>
          <div className="relative">
            <select
              value={profile.activityMultiplier}
              onChange={(e) => handleInputChange('activityMultiplier', parseFloat(e.target.value))}
              aria-label="Activity Level & Exercise Frequency"
              className="w-full min-h-[44px] appearance-none bg-neutral-950 border border-white/5 rounded-xl px-4 py-3 text-sm font-sans font-medium text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#00FF41]/50 focus:border-[#00FF41]/50 transition-colors cursor-pointer"
            >
              {ACTIVITY_LEVELS.map((item) => (
                <option key={item.value} value={item.value} className="bg-neutral-950 text-neutral-200">
                  {item.label} ({item.value}x)
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-3.5 text-neutral-500 text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* Section: Goal Selection Cards (Core UX) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2 font-sans">
              <Flame className="w-3.5 h-3.5 text-[#00FF41]" />
              Weekly Weight Goal
            </label>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              Daily change: -{Math.round((profile.weeklyLossKg * 7700) / 7)} kcal
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {GOAL_OPTIONS.map((opt) => {
              const isSelected = profile.weeklyLossKg === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleInputChange('weeklyLossKg', opt.value)}
                  className={`relative p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between h-24 cursor-pointer ${
                    isSelected
                      ? `bg-neutral-900 border-[#00FF41]/40 shadow-lg ${opt.color}`
                      : 'bg-neutral-950/60 border-white/5 hover:bg-neutral-950 hover:border-white/10 text-neutral-400'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="selectedIndicator"
                      className="absolute inset-0 rounded-2xl border-2 border-[#00FF41]/80 pointer-events-none shadow-[0_0_15px_rgba(0,255,65,0.2)]"
                      transition={AgenticTransition}
                    />
                  )}
                  <div>
                    <div className="text-xs font-bold text-neutral-100 font-sans">{opt.label}</div>
                    <div className="text-[11px] font-medium text-neutral-400 mt-0.5 font-mono tabular-nums">
                      {opt.sublabel}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono tracking-tight text-neutral-300 font-semibold tabular-nums">
                    {opt.value === 0
                      ? 'Balance'
                      : `-${Math.round((opt.value * 7700) / 7)} kcal/d`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
