import { db, type DodgedLog } from './db';

/**
 * Persists a successfully resisted craving to Dexie.js IndexedDB.
 */
export async function addDodgedLog(foodName: string, calories: number): Promise<DodgedLog> {
  const today = new Date().toISOString().split('T')[0];
  const timestamp = Date.now();

  const record: Omit<DodgedLog, 'id'> = {
    date: today,
    foodName,
    calories: Math.max(0, Math.round(calories)),
    timestamp,
  };

  const id = await db.dodgedLogs.add(record as DodgedLog);
  const created: DodgedLog = {
    id: Number(id),
    ...record,
  };

  console.log('[DodgedVault] Logged avoided calories:', created);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dodged-vault-updated'));
  }
  return created;
}

/**
 * Retrieves all dodged craving logs sorted chronologically descending.
 */
export async function getAllDodgedLogs(): Promise<DodgedLog[]> {
  try {
    return await db.dodgedLogs.orderBy('timestamp').reverse().toArray();
  } catch (error) {
    console.error('[DodgedVault] Error fetching dodged logs:', error);
    return [];
  }
}

/**
 * Calculates all-time dodged calories sum.
 */
export async function getTotalDodgedCalories(): Promise<number> {
  try {
    const logs = await db.dodgedLogs.toArray();
    return logs.reduce((sum, item) => sum + (item.calories || 0), 0);
  } catch (error) {
    console.error('[DodgedVault] Error calculating total dodged calories:', error);
    return 0;
  }
}

/**
 * Deletes a single dodged log by id.
 */
export async function deleteDodgedLog(id: number): Promise<void> {
  await db.dodgedLogs.delete(id);
}
