import { db } from './db';
import type { ProfileState } from '../store/userSlice';

/**
 * Persists the current Redux profile state to IndexedDB via Dexie.js.
 * Enforces a singleton record (id: 1) for the user's metabolic profile.
 */
export async function syncProfileToDb(profile: ProfileState): Promise<void> {
  try {
    await db.profile.put({
      id: 1,
      gender: profile.gender,
      age: profile.age,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      activityMultiplier: profile.activityMultiplier,
      weeklyLossKg: profile.weeklyLossKg,
      dailyCaloricTarget: profile.dailyCaloricTarget,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Failed to sync profile to IndexedDB:', error);
  }
}

/**
 * Loads the saved user profile from IndexedDB if it exists.
 */
export async function loadProfileFromDb(): Promise<ProfileState | null> {
  try {
    const record = await db.profile.get(1);
    if (!record) return null;
    return {
      gender: record.gender,
      age: record.age,
      heightCm: record.heightCm,
      weightKg: record.weightKg,
      activityMultiplier: record.activityMultiplier,
      weeklyLossKg: record.weeklyLossKg,
      dailyCaloricTarget: record.dailyCaloricTarget,
    };
  } catch (error) {
    console.error('Failed to load profile from IndexedDB:', error);
    return null;
  }
}
