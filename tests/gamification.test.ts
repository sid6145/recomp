import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/db/db';
import { addDodgedLog, getTotalDodgedCalories, getAllDodgedLogs } from '../src/db/dodgedLogs';
import {
  calculateCurrentWeekBank,
  isWeekendCoveredByBank,
  MAX_DAILY_SWEEP,
  getMondayOfWeek,
  formatDateISO,
} from '../src/utils/calorieBank';
import {
  getTierForConsecutiveDays,
  getDaysUntilNextTier,
  dropOneTier,
  getTierName,
  getMomentumDatasetValue,
} from '../src/context/MomentumContext';

describe('Gamification Systems Unit Tests', () => {
  beforeEach(async () => {
    await db.dodgedLogs.clear();
    await db.userTelemetry.clear();
  });

  describe('Phase 1 & 2: Dodged Calories Vault Persistence', () => {
    it('persists a dodged craving log to Dexie and updates total dodged calories', async () => {
      expect(await getTotalDodgedCalories()).toBe(0);

      await addDodgedLog('Sweets / Dessert', 350);
      await addDodgedLog('Fried Street Food', 450);

      const logs = await getAllDodgedLogs();
      expect(logs.length).toBe(2);
      expect(logs[0].foodName).toBe('Fried Street Food');
      expect(logs[0].calories).toBe(450);

      const total = await getTotalDodgedCalories();
      expect(total).toBe(800);

      const fatAvoidedKg = (total / 7700).toFixed(2);
      expect(fatAvoidedKg).toBe('0.10');
    });
  });

  describe('Phase 3: Weekend Calorie Bank (Flex-Deficit Engine)', () => {
    it('accurately sweeps weekday surplus deficit capped at safe max 300 kcal/day', () => {
      const now = new Date(2026, 10, 20); // Friday Nov 20, 2026
      const monday = getMondayOfWeek(now);

      const monStr = formatDateISO(monday);
      const tueDate = new Date(monday);
      tueDate.setDate(monday.getDate() + 1);
      const tueStr = formatDateISO(tueDate);

      // Target = 2000 kcal
      // Mon: Consumed 1600 (surplus deficit = 400, capped at 300)
      // Tue: Consumed 1850 (surplus deficit = 150)
      const mockCaloriesMap = {
        [monStr]: 1600,
        [tueStr]: 1850,
      };

      const bank = calculateCurrentWeekBank(mockCaloriesMap, 2000, now);
      expect(bank.weekdaySweeps[0].sweptCalories).toBe(MAX_DAILY_SWEEP); // 300
      expect(bank.weekdaySweeps[1].sweptCalories).toBe(150);
      expect(bank.totalEarnedThisWeek).toBe(450);
      expect(bank.bankedCalories).toBe(450);
    });

    it('deducts Saturday and Sunday overages from banked calories', () => {
      const satNow = new Date(2026, 10, 21); // Saturday Nov 21, 2026
      const monday = getMondayOfWeek(satNow);
      const satStr = formatDateISO(satNow);

      const monStr = formatDateISO(monday);
      const mockCaloriesMap = {
        [monStr]: 1700, // +300 banked
        [satStr]: 2200, // +200 over target (2000 target)
      };

      const bank = calculateCurrentWeekBank(mockCaloriesMap, 2000, satNow);
      expect(bank.isWeekend).toBe(true);
      expect(bank.spentThisWeekend).toBe(200);
      expect(bank.bankedCalories).toBe(100); // 300 - 200 = 100
    });

    it('protects Saturday and Sunday heatmap cells if overage is covered by bank', () => {
      const satDate = new Date(2026, 10, 21); // Saturday
      const satStr = formatDateISO(satDate);
      const monday = getMondayOfWeek(satDate);
      const monStr = formatDateISO(monday);

      const mockCaloriesMap = {
        [monStr]: 1700, // +300 banked
        [satStr]: 2250, // 250 over target (target = 2000)
      };

      // 250 overage is <= 300 banked, so covered!
      const isCovered = isWeekendCoveredByBank(satStr, mockCaloriesMap, 2000);
      expect(isCovered).toBe(true);

      // If overage exceeds banked calories (e.g. 400 overage with 300 bank):
      const unbufferedCaloriesMap = {
        [monStr]: 1700, // +300 banked
        [satStr]: 2450, // 450 overage
      };
      const notCovered = isWeekendCoveredByBank(satStr, unbufferedCaloriesMap, 2000);
      expect(notCovered).toBe(false);
    });
  });

  describe('Phase 4: Momentum Multipliers & Anti-Quit Logic', () => {
    it('evaluates correct tiers based on consecutive hit days', () => {
      expect(getTierForConsecutiveDays(0)).toBe(1.0);
      expect(getTierForConsecutiveDays(2)).toBe(1.0);
      expect(getTierForConsecutiveDays(3)).toBe(1.5);
      expect(getTierForConsecutiveDays(4)).toBe(1.5);
      expect(getTierForConsecutiveDays(5)).toBe(2.0);
      expect(getTierForConsecutiveDays(6)).toBe(2.0);
      expect(getTierForConsecutiveDays(7)).toBe(3.0);
      expect(getTierForConsecutiveDays(14)).toBe(3.0);

      expect(getTierName(3.0)).toBe('OVERDRIVE');
      expect(getTierName(2.0)).toBe('Unstoppable');
      expect(getTierName(1.5)).toBe('Locked In');
      expect(getTierName(1.0)).toBe('Base');
    });

    it('calculates days until next tier correctly', () => {
      expect(getDaysUntilNextTier(1)).toBe(2); // 3 - 1
      expect(getDaysUntilNextTier(3)).toBe(2); // 5 - 3
      expect(getDaysUntilNextTier(5)).toBe(2); // 7 - 5
      expect(getDaysUntilNextTier(7)).toBe(0); // already max Overdrive
    });

    it('Anti-Quit Rule: drops exactly 1 tier instead of wiping out to zero', () => {
      expect(dropOneTier(3.0)).toBe(2.0); // Overdrive -> 2.0x
      expect(dropOneTier(2.0)).toBe(1.5); // 2.0x -> 1.5x
      expect(dropOneTier(1.5)).toBe(1.0); // 1.5x -> 1.0x
      expect(dropOneTier(1.0)).toBe(1.0);
    });

    it('maps momentum tiers to semantic dataset momentum values', () => {
      expect(getMomentumDatasetValue(1.0)).toBe('standby');
      expect(getMomentumDatasetValue(1.5)).toBe('ignition');
      expect(getMomentumDatasetValue(2.0)).toBe('velocity');
      expect(getMomentumDatasetValue(3.0)).toBe('overdrive');
    });

    it('enforces Anti-Quit drop logic strictly single-tier (3.0x -> 2.0x, never straight to 1.0x)', () => {
      // User dropping out of Overdrive drops to 2.0x
      const dropFromOverdrive = dropOneTier(3.0);
      expect(dropFromOverdrive).toBe(2.0);
      expect(dropFromOverdrive).not.toBe(1.0);

      // User dropping out of 2.0x drops to 1.5x
      const dropFromVelocity = dropOneTier(2.0);
      expect(dropFromVelocity).toBe(1.5);
      expect(dropFromVelocity).not.toBe(1.0);

      // User dropping out of 1.5x drops to 1.0x
      const dropFromIgnition = dropOneTier(1.5);
      expect(dropFromIgnition).toBe(1.0);
    });
  });

  describe('Phase 5: Micro-Sound Engine Resilience', () => {
    it('soundEngine fails silently without throwing when AudioContext is unavailable', async () => {
      const { playLogTick, playProteinGoalChime, isSoundEnabled, setSoundEnabled, toggleSound } =
        await import('../src/utils/soundEngine');

      // Test toggle
      setSoundEnabled(true);
      expect(isSoundEnabled()).toBe(true);
      expect(toggleSound()).toBe(false);
      expect(isSoundEnabled()).toBe(false);

      // Re-enable and verify it runs safely without window.AudioContext
      setSoundEnabled(true);
      expect(() => {
        playLogTick();
        playProteinGoalChime();
      }).not.toThrow();

      // Clean up preference
      setSoundEnabled(false);
    });
  });
});
