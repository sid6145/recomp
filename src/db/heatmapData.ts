import { db } from './db';

export interface DailyCaloriesMap {
  [dateStr: string]: number;
}

/**
 * Highly optimized Dexie utility that groups all logs by date (YYYY-MM-DD)
 * and sums the totalCalories consumed for each date.
 */
export async function fetchHeatmapLogs(): Promise<DailyCaloriesMap> {
  try {
    const logs = await db.logs.toArray();
    const caloriesByDate: DailyCaloriesMap = {};

    for (const log of logs) {
      if (log.date) {
        caloriesByDate[log.date] = (caloriesByDate[log.date] || 0) + (log.totalCalories || 0);
      }
    }

    return caloriesByDate;
  } catch (error) {
    console.error('[heatmapData] Error aggregating logs by date:', error);
    return {};
  }
}
