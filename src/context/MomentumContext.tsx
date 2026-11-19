import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { db, type MomentumTier } from '../db/db';
import { fetchHeatmapLogs } from '../db/heatmapData';
import { useAppSelector } from '../store/store';

export interface MomentumContextValue {
  momentumTier: MomentumTier;
  tierName: 'Base' | 'Locked In' | 'Unstoppable' | 'OVERDRIVE';
  consecutiveHitDays: number;
  daysUntilNextTier: number;
  isOverdrive: boolean;
  isUnstable: boolean;
  isUnstableOverride: boolean | null;
  toggleUnstableOverride: () => void;
  setUnstableOverride: (val: boolean | null) => void;
  shieldActive: boolean;
  overrideTier: MomentumTier | null;
  cycleTier: () => void;
  setOverrideTier: (tier: MomentumTier | null) => void;
  triggerEnergyPulse: () => void;
  lastPulseTime: number;
  dailyProteinTarget: number;
  currentProtein: number;
  remainingProtein: number;
  springPhysics: {
    type: 'spring';
    stiffness: number;
    damping: number;
  };
}

const MomentumContext = createContext<MomentumContextValue | undefined>(undefined);

export const TIER_ORDER: MomentumTier[] = [1.0, 1.5, 2.0, 3.0];

export function getTierForConsecutiveDays(days: number): MomentumTier {
  if (days >= 7) return 3.0;
  if (days >= 5) return 2.0;
  if (days >= 3) return 1.5;
  return 1.0;
}

export function getTierName(tier: MomentumTier): 'Base' | 'Locked In' | 'Unstoppable' | 'OVERDRIVE' {
  switch (tier) {
    case 3.0:
      return 'OVERDRIVE';
    case 2.0:
      return 'Unstoppable';
    case 1.5:
      return 'Locked In';
    case 1.0:
    default:
      return 'Base';
  }
}

/**
 * Maps momentum tier to HTML root dataset.momentum token:
 * "standby" (1.0x), "ignition" (1.5x), "velocity" (2.0x), "overdrive" (3.0x).
 */
export function getMomentumDatasetValue(
  tier: MomentumTier
): 'standby' | 'ignition' | 'velocity' | 'overdrive' {
  switch (tier) {
    case 3.0:
      return 'overdrive';
    case 2.0:
      return 'velocity';
    case 1.5:
      return 'ignition';
    case 1.0:
    default:
      return 'standby';
  }
}

export function getDaysUntilNextTier(consecutiveDays: number): number {
  if (consecutiveDays < 3) return 3 - consecutiveDays;
  if (consecutiveDays < 5) return 5 - consecutiveDays;
  if (consecutiveDays < 7) return 7 - consecutiveDays;
  return 0; // Already in Overdrive
}

/**
 * Drop one tier according to Anti-Quit Rule
 */
export function dropOneTier(tier: MomentumTier): MomentumTier {
  if (tier === 3.0) return 2.0;
  if (tier === 2.0) return 1.5;
  return 1.0;
}

const DEFAULT_MOMENTUM_VALUE: MomentumContextValue = {
  momentumTier: 1.0,
  tierName: 'Base',
  consecutiveHitDays: 0,
  daysUntilNextTier: 3,
  isOverdrive: false,
  isUnstable: false,
  isUnstableOverride: null,
  toggleUnstableOverride: () => {},
  setUnstableOverride: () => {},
  shieldActive: true,
  overrideTier: null,
  cycleTier: () => {},
  setOverrideTier: () => {},
  triggerEnergyPulse: () => {},
  lastPulseTime: 0,
  dailyProteinTarget: 144,
  currentProtein: 0,
  remainingProtein: 144,
  springPhysics: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
  },
};

export const MomentumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const targetCalories = useAppSelector((state) => state.user.dailyCaloricTarget);
  const weightKg = useAppSelector((state) => state.user.weightKg);
  const logEntries = useAppSelector((state) => state.logs.entries);

  const [persistedDays, setPersistedDays] = useState<number>(3); // Default friendly start
  const [overrideTier, setOverrideTier] = useState<MomentumTier | null>(null);
  const [isUnstableOverride, setIsUnstableOverride] = useState<boolean | null>(null);
  const [lastPulseTime, setLastPulseTime] = useState<number>(0);

  // Daily protein target (1.8g per kg body weight, min 100g)
  const dailyProteinTarget = useMemo(() => {
    return Math.max(100, Math.round((weightKg || 80) * 1.8));
  }, [weightKg]);

  // Current protein consumed today from logged meals
  const currentProtein = useMemo(() => {
    return logEntries.reduce((acc, curr) => acc + (curr.calculatedMacros?.protein || 0), 0);
  }, [logEntries]);

  const remainingProtein = useMemo(() => {
    return Math.max(0, Math.round(dailyProteinTarget - currentProtein));
  }, [dailyProteinTarget, currentProtein]);

  // Hydrate telemetry from Dexie
  useEffect(() => {
    let active = true;
    db.userTelemetry.get(1).then((record) => {
      if (!active || !record) return;
      if (record.consecutiveHitDays !== undefined) {
        setPersistedDays(record.consecutiveHitDays);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Recalculate streaks based on real daily logs
  useEffect(() => {
    let active = true;
    fetchHeatmapLogs().then((caloriesMap) => {
      if (!active) return;
      const today = new Date();
      let streak = 0;
      let missedDays = 0;

      // Scan the last 30 days chronologically backward
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const consumed = caloriesMap[dateStr];

        if (consumed !== undefined && consumed > 0) {
          // Check if target was hit (or within safe margin)
          if (consumed <= targetCalories + 100) {
            streak++;
          } else {
            missedDays++;
            break; // Streak interrupted
          }
        } else if (i > 0) {
          // Day not logged at all
          missedDays++;
          break;
        }
      }

      // Apply Anti-Quit logic if streak was broken:
      if (missedDays > 0) {
        // Fall back gracefully with anti-quit shield
        db.userTelemetry.get(1).then((rec) => {
          if (!active) return;
          const prevTier = rec?.momentumTier ?? getTierForConsecutiveDays(persistedDays);
          const dropped = dropOneTier(prevTier);
          const fallbackDays = dropped === 2.0 ? 5 : dropped === 1.5 ? 3 : 0;
          const finalDays = Math.max(streak, fallbackDays);
          setPersistedDays(finalDays);
        });
      } else if (streak > 0) {
        setPersistedDays(streak);
      }
    });
    return () => {
      active = false;
    };
  }, [logEntries, targetCalories, persistedDays]);

  const activeTier: MomentumTier = useMemo(() => {
    if (overrideTier !== null) return overrideTier;
    return getTierForConsecutiveDays(persistedDays);
  }, [overrideTier, persistedDays]);

  const isOverdrive = activeTier === 3.0;
  const tierName = getTierName(activeTier);
  const daysUntilNext = getDaysUntilNextTier(persistedDays);

  // Overdrive Unstable State:
  // "data-unstable: "true" when in Overdrive (3.0x), local time is >= 20:00, and the user has not yet hit their daily protein target"
  const isUnstable = useMemo(() => {
    if (isUnstableOverride !== null) return isUnstableOverride;
    const currentHour = new Date().getHours();
    return isOverdrive && currentHour >= 20 && currentProtein < dailyProteinTarget;
  }, [isUnstableOverride, isOverdrive, currentProtein, dailyProteinTarget]);

  const toggleUnstableOverride = useCallback(() => {
    setIsUnstableOverride((prev) => {
      if (prev === null) {
        // If not overridden yet, toggle to opposite of current isUnstable
        const currentHour = new Date().getHours();
        const naturallyUnstable = isOverdrive && currentHour >= 20 && currentProtein < dailyProteinTarget;
        return !naturallyUnstable;
      }
      return !prev;
    });
  }, [isOverdrive, currentProtein, dailyProteinTarget]);

  const setUnstableOverride = useCallback((val: boolean | null) => {
    setIsUnstableOverride(val);
  }, []);

  const triggerEnergyPulse = useCallback(() => {
    const now = Date.now();
    setLastPulseTime(now);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('momentum-energy-pulse', { detail: { timestamp: now } }));
    }
  }, []);

  const cycleTier = useCallback(() => {
    setOverrideTier((prev) => {
      const current = prev ?? activeTier;
      const currentIndex = TIER_ORDER.indexOf(current);
      const nextIndex = (currentIndex + 1) % TIER_ORDER.length;
      return TIER_ORDER[nextIndex];
    });
  }, [activeTier]);

  // Sync dataset.momentum & dataset.unstable directly to root <html> element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const mode = getMomentumDatasetValue(activeTier);
      document.documentElement.dataset.momentum = mode;
      document.documentElement.dataset.unstable = isUnstable ? 'true' : 'false';
    }
  }, [activeTier, isUnstable]);

  // Sync active tier to Dexie userTelemetry record
  useEffect(() => {
    db.userTelemetry.get(1).then((existing) => {
      db.userTelemetry.put({
        id: 1,
        momentumTier: activeTier,
        consecutiveHitDays: persistedDays,
        bankedCalories: existing?.bankedCalories ?? 0,
        bankSpentWeekend: existing?.bankSpentWeekend ?? 0,
        updatedAt: Date.now(),
      });
    });
  }, [activeTier, persistedDays]);

  // Stepped spring physics:
  // At >= 2.0x: snappy Framer Motion spring physics (stiffness: 420, damping: 26)
  // At < 2.0x: gentle spring (stiffness: 300, damping: 20)
  const springPhysics = useMemo(() => {
    if (activeTier >= 2.0) {
      return { type: 'spring' as const, stiffness: 420, damping: 26 };
    }
    return { type: 'spring' as const, stiffness: 300, damping: 20 };
  }, [activeTier]);

  const value = useMemo<MomentumContextValue>(
    () => ({
      momentumTier: activeTier,
      tierName,
      consecutiveHitDays: persistedDays,
      daysUntilNextTier: daysUntilNext,
      isOverdrive,
      isUnstable,
      isUnstableOverride,
      toggleUnstableOverride,
      setUnstableOverride,
      shieldActive: true, // Anti-quit shield is always armed to protect user progress
      overrideTier,
      cycleTier,
      setOverrideTier,
      triggerEnergyPulse,
      lastPulseTime,
      dailyProteinTarget,
      currentProtein,
      remainingProtein,
      springPhysics,
    }),
    [
      activeTier,
      tierName,
      persistedDays,
      daysUntilNext,
      isOverdrive,
      isUnstable,
      isUnstableOverride,
      toggleUnstableOverride,
      setUnstableOverride,
      overrideTier,
      cycleTier,
      triggerEnergyPulse,
      lastPulseTime,
      dailyProteinTarget,
      currentProtein,
      remainingProtein,
      springPhysics,
    ]
  );

  return <MomentumContext.Provider value={value}>{children}</MomentumContext.Provider>;
};

export function useMomentum(): MomentumContextValue {
  const context = useContext(MomentumContext);
  return context ?? DEFAULT_MOMENTUM_VALUE;
}
