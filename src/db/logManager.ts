import { db, type CalculatedMacros, type ConsumptionLog } from './db';

/**
 * Persists an upgraded dynamic food log entry to Dexie.js IndexedDB.
 * Stores food ID, name, chosen unit, fractional/integer quantity, and the exact computed macros.
 */
export async function addDynamicFoodLog(
  foodId: string | number,
  foodName: string,
  selectedUnit: string,
  quantity: number,
  calculatedMacros: CalculatedMacros
): Promise<ConsumptionLog> {
  const today = new Date().toISOString().split('T')[0];
  const timestamp = Date.now();

  const logEntry: Omit<ConsumptionLog, 'id'> = {
    date: today,
    foodId: String(foodId),
    foodName,
    selectedUnit,
    quantity,
    calculatedMacros,
    totalCalories: calculatedMacros.calories,
    timestamp,
  };

  const id = await db.logs.add(logEntry as ConsumptionLog);
  const created: ConsumptionLog = {
    id: Number(id),
    ...logEntry,
  };

  console.log('[Intervention LogManager] Added dynamic food log:', created);
  return created;
}

/**
 * Queries food consumption logs for a given date (defaults to today).
 */
export async function getFoodLogsForDate(date?: string): Promise<ConsumptionLog[]> {
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  return db.logs.where('date').equals(targetDate).reverse().sortBy('timestamp');
}

/**
 * Deletes a logged food item by id.
 */
export async function deleteFoodLog(id: number): Promise<void> {
  await db.logs.delete(id);
}
