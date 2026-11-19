import { db, type UserTelemetryRecord } from '../db/db';
import type { DailyCaloriesMap } from '../db/heatmapData';

export const MAX_DAILY_SWEEP = 300; // Capped at safe max 300 kcal/day
export const MAX_WEEKLY_CAPACITY = 1500; // 5 days * 300 kcal

export interface WeekdaySweepInfo {
  dayName: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  dateStr: string;
  sweptCalories: number;
  consumedCalories: number;
  targetCalories: number;
  isPastOrToday: boolean;
}

export interface CalorieBankState {
  bankedCalories: number; // Available balance for weekend
  totalEarnedThisWeek: number; // Sum of Mon-Fri sweeps
  spentThisWeekend: number; // Deducted on Sat/Sun
  isWeekend: boolean;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  weekdaySweeps: WeekdaySweepInfo[];
  maxWeeklyCapacity: number;
}

/**
 * Returns Monday at 00:00:00 for the week containing the given date.
 */
export function getMondayOfWeek(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  // If Sunday (0), Monday is -6 days away; otherwise 1 - day
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Formats a Date object to YYYY-MM-DD.
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the Calorie Bank for the current week using logged calories and daily target.
 */
export function calculateCurrentWeekBank(
  caloriesByDate: DailyCaloriesMap,
  dailyTarget: number,
  now: Date = new Date()
): CalorieBankState {
  const monday = getMondayOfWeek(now);
  const todayStr = formatDateISO(now);
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const weekdayNames: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
  ];

  const weekdaySweeps: WeekdaySweepInfo[] = [];
  let totalEarned = 0;

  for (let i = 0; i < 5; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dateStr = formatDateISO(dayDate);
    const isPastOrToday = dateStr <= todayStr;

    const consumed = caloriesByDate[dateStr] || 0;
    let swept = 0;

    // Only sweep if the day has logs and finished under daily target
    if (isPastOrToday && caloriesByDate[dateStr] !== undefined && consumed > 0) {
      const surplusDeficit = dailyTarget - consumed;
      if (surplusDeficit > 0) {
        swept = Math.min(MAX_DAILY_SWEEP, surplusDeficit);
      }
    }

    totalEarned += swept;

    weekdaySweeps.push({
      dayName: weekdayNames[i],
      dateStr,
      sweptCalories: swept,
      consumedCalories: consumed,
      targetCalories: dailyTarget,
      isPastOrToday,
    });
  }

  // Calculate weekend spending (Saturday + Sunday)
  let availableBank = totalEarned;
  let spentThisWeekend = 0;

  const satDate = new Date(monday);
  satDate.setDate(monday.getDate() + 5);
  const satStr = formatDateISO(satDate);

  const sunDate = new Date(monday);
  sunDate.setDate(monday.getDate() + 6);
  const sunStr = formatDateISO(sunDate);

  const satConsumed = caloriesByDate[satStr] || 0;
  if (satConsumed > dailyTarget) {
    const satOverage = satConsumed - dailyTarget;
    const satDeduction = Math.min(availableBank, satOverage);
    spentThisWeekend += satDeduction;
    availableBank -= satDeduction;
  }

  const sunConsumed = caloriesByDate[sunStr] || 0;
  if (sunConsumed > dailyTarget) {
    const sunOverage = sunConsumed - dailyTarget;
    const sunDeduction = Math.min(availableBank, sunOverage);
    spentThisWeekend += sunDeduction;
    availableBank -= sunDeduction;
  }

  return {
    bankedCalories: Math.max(0, availableBank),
    totalEarnedThisWeek: totalEarned,
    spentThisWeekend,
    isWeekend,
    dayOfWeek,
    weekdaySweeps,
    maxWeeklyCapacity: MAX_WEEKLY_CAPACITY,
  };
}

/**
 * Checks if a historical date (specifically Saturday or Sunday) had an overage
 * that was protected/covered by the weekday calorie bank of that week.
 */
export function isWeekendCoveredByBank(
  dateStr: string,
  caloriesByDate: DailyCaloriesMap,
  dailyTarget: number
): boolean {
  const parts = dateStr.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = date.getDay();

  // Only Saturday (6) and Sunday (0) can be covered by the weekend bank
  if (day !== 0 && day !== 6) {
    return false;
  }

  const monday = getMondayOfWeek(date);
  let weekBank = 0;

  // Sum Mon-Fri sweeps for that week
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dStr = formatDateISO(d);
    const consumed = caloriesByDate[dStr] || 0;
    if (caloriesByDate[dStr] !== undefined && consumed > 0) {
      const surplusDeficit = dailyTarget - consumed;
      if (surplusDeficit > 0) {
        weekBank += Math.min(MAX_DAILY_SWEEP, surplusDeficit);
      }
    }
  }

  if (weekBank <= 0) return false;

  const satDate = new Date(monday);
  satDate.setDate(monday.getDate() + 5);
  const satStr = formatDateISO(satDate);
  const satConsumed = caloriesByDate[satStr] || 0;
  const satOverage = Math.max(0, satConsumed - dailyTarget);

  if (day === 6) {
    // Saturday: covered if overage <= weekBank
    return satOverage > 0 && satOverage <= weekBank;
  } else {
    // Sunday: covered if overage <= (weekBank - satDeduction)
    const satDeducted = Math.min(weekBank, satOverage);
    const remainingForSun = Math.max(0, weekBank - satDeducted);
    const sunConsumed = caloriesByDate[dateStr] || 0;
    const sunOverage = Math.max(0, sunConsumed - dailyTarget);
    return sunOverage > 0 && sunOverage <= remainingForSun;
  }
}

/**
 * Syncs the current bank state to Dexie userTelemetry table.
 */
export async function syncBankTelemetry(
  bankedCalories: number,
  bankSpentWeekend: number
): Promise<void> {
  try {
    const existing = await db.userTelemetry.get(1);
    const updated: UserTelemetryRecord = {
      id: 1,
      momentumTier: existing?.momentumTier ?? 1.0,
      consecutiveHitDays: existing?.consecutiveHitDays ?? 0,
      bankedCalories,
      bankSpentWeekend,
      lastCalculatedDate: formatDateISO(new Date()),
      updatedAt: Date.now(),
    };
    await db.userTelemetry.put(updated);
  } catch (error) {
    console.error('[calorieBank] Error syncing telemetry to Dexie:', error);
  }
}
