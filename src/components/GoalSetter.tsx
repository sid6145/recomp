import React, { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { MaterialIcon } from './MaterialIcon';
import { useAppDispatch, useAppSelector } from '../store/store';
import { updateProfile, setHydratedProfile, markHydrated, type ProfileState } from '../store/userSlice';
import { syncProfileToDb, loadProfileFromDb } from '../db/profileSync';
import { type Gender } from '../utils/thermodynamics';
import { useHaptics } from '../hooks/useHaptics';
import { AgenticTransition } from '../utils/motionPresets';
import { useMomentum } from '../context/MomentumContext';
import { isSoundEnabled, toggleSound, playLogTick } from '../utils/soundEngine';

interface GoalOption {
  label: string;
  sublabel: string;
  value: number; // kg per week
}

const GOAL_OPTIONS: GoalOption[] = [
  { label: 'Maintain', sublabel: '0 kg/wk', value: 0 },
  { label: 'Mild', sublabel: '-0.25 kg/wk', value: 0.25 },
  { label: 'Standard', sublabel: '-0.50 kg/wk', value: 0.5 },
  { label: 'Aggressive', sublabel: '-0.75 kg/wk', value: 0.75 },
  { label: 'Extreme', sublabel: '-1.00 kg/wk', value: 1.0 },
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
  const { momentumTier, tierName, cycleTier } = useMomentum();
  const [soundActive, setSoundActive] = useState<boolean>(() => isSoundEnabled());

  // On initial mount, hydrate profile from IndexedDB if not yet loaded
  useEffect(() => {
    loadProfileFromDb().then((saved) => {
      if (saved) {
        dispatch(setHydratedProfile(saved));
      } else {
        dispatch(markHydrated());
        syncProfileToDb({ ...profile, isHydrated: true });
      }
    });
  }, [dispatch]);

  // Autosave to IndexedDB on every Redux state update (only when hydrated)
  useEffect(() => {
    if (profile.isHydrated) {
      syncProfileToDb(profile);
    }
  }, [profile]);

  const handleInputChange = <K extends keyof ProfileState>(field: K, value: ProfileState[K]) => {
    haptics.tick();
    dispatch(updateProfile({ [field]: value }));
  };

  const isSafetyFloor = profile.dailyCaloricTarget <= 1200;

  // Weight Trend calculation for SVG
  const currentWeight = profile.weightKg || 75;
  const targetWeight = profile.weeklyLossKg > 0
    ? Math.max(45, Math.round((currentWeight - profile.weeklyLossKg * 12) * 10) / 10)
    : currentWeight;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 touch-pan-y">
      {/* 1. Weight Goal & Trend Card (rounded-[28px], --md-surface-container) */}
      <div className="rounded-[28px] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] p-6 sm:p-8 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--md-outline-variant)]/20 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-medium bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] mb-2">
              <MaterialIcon name="monitoring" size={16} />
              <span>Weight Goal &amp; Projection</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--md-on-surface)] font-display">
              Target Projection
            </h2>
            <p className="text-xs text-[var(--md-on-surface-variant)] font-sans">
              12-week trajectory based on your weekly deficit rate
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-left sm:text-right">
              <span className="text-[11px] uppercase font-display font-semibold text-[var(--md-on-surface-variant)] block">
                Current Weight
              </span>
              <span className="text-2xl font-black font-mono tabular-nums text-[var(--md-on-surface)]">
                {currentWeight} <span className="text-xs font-normal">kg</span>
              </span>
            </div>
            <MaterialIcon name="trending_down" size={24} className="text-[var(--md-primary)]" />
            <div className="text-left">
              <span className="text-[11px] uppercase font-display font-semibold text-[var(--md-on-surface-variant)] block">
                Target Weight
              </span>
              <span className="text-2xl font-black font-mono tabular-nums text-[var(--md-primary)]">
                {targetWeight} <span className="text-xs font-normal">kg</span>
              </span>
            </div>
          </div>
        </div>

        {/* Rounded-Cap SVG Trend Line in --md-primary */}
        <div className="relative w-full h-24 bg-[var(--md-surface-container-low)] rounded-[20px] p-3 flex items-center justify-center overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 400 60" preserveAspectRatio="none">
            {/* Gradient Fill under Curve */}
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--md-primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--md-primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 10,15 C 100,18 200,32 390,48 L 390,60 L 10,60 Z"
              fill="url(#trendGradient)"
            />
            {/* Trend Line (strokeWidth: 3, strokeLinecap: round) in --md-primary */}
            <path
              d="M 10,15 C 100,18 200,32 390,48"
              fill="none"
              stroke="var(--md-primary)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Start Node */}
            <circle cx="10" cy="15" r="4" fill="var(--md-primary)" />
            {/* Target Node */}
            <circle cx="390" cy="48" r="4" fill="var(--md-primary)" />
          </svg>
          <div className="absolute left-4 top-2 text-[10px] font-mono text-[var(--md-on-surface-variant)]">
            Today ({currentWeight}kg)
          </div>
          <div className="absolute right-4 bottom-2 text-[10px] font-mono text-[var(--md-primary)] font-bold">
            Week 12 ({targetWeight}kg)
          </div>
        </div>
      </div>

      {/* 2. Primary Goals & Target Calorie Card */}
      <div className="rounded-[28px] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] p-6 sm:p-8 shadow-md space-y-8">
        {/* Live Target Readout Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--md-outline-variant)]/20 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-medium bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)]">
              <MaterialIcon name="track_changes" size={16} className="text-[var(--md-primary)]" />
              <span>Calorie Target Formula</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--md-on-surface)] font-display">
              Set Your Goal
            </h2>
            <p className="text-sm text-[var(--md-on-surface-variant)] font-sans">
              Personalized daily calories based on your body stats and activity level.
            </p>
          </div>

          {/* Dynamic Target Hero Display */}
          <div className="flex flex-col items-start md:items-end">
            <span className="text-xs font-display font-semibold tracking-wider uppercase text-[var(--md-on-surface-variant)]">
              Daily Target
            </span>
            <div className="flex items-baseline gap-2">
              <m.span
                key={profile.dailyCaloricTarget}
                data-testid="goal-target-calories"
                initial={{ scale: 1.15, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={AgenticTransition}
                className="text-4xl sm:text-5xl font-black tracking-tight text-[var(--md-primary)] font-mono tabular-nums"
              >
                {profile.dailyCaloricTarget.toLocaleString()}
              </m.span>
              <span className="text-sm font-mono font-bold text-[var(--md-on-surface-variant)]">kcal/day</span>
            </div>

            {/* Safety Floor Alert */}
            <AnimatePresence>
              {isSafetyFloor && (
                <m.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5 text-xs text-[var(--md-error)] mt-1 font-sans font-medium"
                >
                  <MaterialIcon name="warning" size={16} />
                  <span>1,200 kcal is the recommended daily minimum</span>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Biometrics Input Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--md-on-surface-variant)] flex items-center gap-2 font-display">
            <MaterialIcon name="person" size={18} />
            <span>Biometric Stats</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gender Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--md-on-surface-variant)] font-display">Sex</label>
              <div className="grid grid-cols-2 p-1 bg-[var(--md-surface-container-high)] rounded-full">
                {(['M', 'F'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleInputChange('gender', g)}
                    className={`py-2 text-xs font-display font-semibold rounded-full transition-all cursor-pointer m3-state-layer ${
                      profile.gender === g
                        ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] shadow-sm font-bold'
                        : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                    }`}
                  >
                    {g === 'M' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--md-on-surface-variant)] font-display">
                Age
              </label>
              <input
                type="number"
                min="15"
                max="100"
                value={profile.age}
                onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 25)}
                className="w-full bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] rounded-2xl px-4 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
              />
            </div>

            {/* Weight */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--md-on-surface-variant)] font-display">
                Weight (kg)
              </label>
              <input
                type="number"
                min="35"
                max="250"
                step="0.5"
                value={profile.weightKg}
                onChange={(e) => handleInputChange('weightKg', parseFloat(e.target.value) || 75)}
                className="w-full bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] rounded-2xl px-4 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
              />
            </div>

            {/* Height */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--md-on-surface-variant)] font-display">
                Height (cm)
              </label>
              <input
                type="number"
                min="100"
                max="240"
                value={profile.heightCm}
                onChange={(e) => handleInputChange('heightCm', parseInt(e.target.value) || 178)}
                className="w-full bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] rounded-2xl px-4 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Activity Level */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-on-surface-variant)] flex items-center gap-2 font-display">
            <MaterialIcon name="directions_run" size={18} />
            <span>Activity Level &amp; Exercise Frequency</span>
          </label>
          <select
            value={profile.activityMultiplier}
            onChange={(e) => handleInputChange('activityMultiplier', parseFloat(e.target.value))}
            aria-label="Activity Level & Exercise Frequency"
            className="w-full min-h-[48px] bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] rounded-2xl px-4 py-3 text-sm font-display font-medium focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)] cursor-pointer"
          >
            {ACTIVITY_LEVELS.map((item) => (
              <option key={item.value} value={item.value} className="bg-[var(--md-surface-container)] text-[var(--md-on-surface)]">
                {item.label} ({item.value}x)
              </option>
            ))}
          </select>
        </div>

        {/* Weekly Weight Goal (Core UX) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-on-surface-variant)] flex items-center gap-2 font-display">
              <MaterialIcon name="local_fire_department" size={18} className="text-[var(--md-primary)]" />
              <span>Weekly Weight Goal</span>
            </label>
            <span className="text-xs font-mono text-[var(--md-on-surface-variant)] tabular-nums">
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
                  data-testid={`goal-option-${opt.value}`}
                  onClick={() => handleInputChange('weeklyLossKg', opt.value)}
                  className={`p-3.5 rounded-[24px] text-left transition-all duration-150 flex flex-col justify-between h-24 cursor-pointer m3-state-layer ${
                    isSelected
                      ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] shadow-sm ring-2 ring-[var(--md-primary)]'
                      : 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-highest)]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold font-display">{opt.label}</div>
                    <div className="text-[11px] font-mono tabular-nums opacity-80 mt-0.5">
                      {opt.sublabel}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono tabular-nums font-bold">
                    {opt.value === 0 ? 'Balance' : `-${Math.round((opt.value * 7700) / 7)} kcal/d`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sound Effects & Dev Controls */}
        <div className="space-y-4 pt-4 border-t border-[var(--md-outline-variant)]/20">
          <div className="flex items-center justify-between p-4 rounded-[20px] bg-[var(--md-surface-container-high)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center">
                <MaterialIcon name={soundActive ? 'volume_up' : 'volume_off'} size={20} />
              </div>
              <div>
                <div className="text-xs font-display font-bold uppercase tracking-wider text-[var(--md-on-surface)]">
                  Micro-Sound Effects
                </div>
                <div className="text-xs text-[var(--md-on-surface-variant)]">
                  Synthesized Web Audio ticks &amp; harmonic chime on goal hit
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const next = toggleSound();
                setSoundActive(next);
                if (next) playLogTick();
                haptics.tick();
              }}
              className="min-h-[40px] px-4 py-1.5 rounded-full text-xs font-display font-semibold bg-[var(--md-surface-container-highest)] text-[var(--md-on-surface)] transition-all cursor-pointer m3-state-layer"
            >
              {soundActive ? 'Sound: ON' : 'Sound: OFF'}
            </button>
          </div>

          {/* Dev Preview: Cycle Momentum Tier */}
          <div className="flex items-center justify-between p-4 rounded-[20px] bg-[var(--md-surface-container-high)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] flex items-center justify-center">
                <MaterialIcon name="bolt" size={20} filled />
              </div>
              <div>
                <div className="text-xs font-display font-bold uppercase tracking-wider text-[var(--md-on-surface)]">
                  Dev Momentum Cycle
                </div>
                <div className="text-xs text-[var(--md-on-surface-variant)] font-mono">
                  Current: {tierName} ({momentumTier.toFixed(1)}x)
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                haptics.tick();
                cycleTier();
              }}
              className="min-h-[40px] px-4 py-1.5 rounded-full text-xs font-display font-semibold bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] transition-all cursor-pointer m3-state-layer"
            >
              Next Tier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
