import { db, type UserProfileRecord } from './db';
import type { ProfileState } from '../store/userSlice';
import { calculateBMR, calculateTDEE } from '../utils/thermodynamics';

const PROFILE_STORAGE_KEY = 'recomp_user_profile';

/**
 * Persists the current Redux profile state to IndexedDB via Dexie.js
 * and synchronizes with localStorage lightweight instant cache.
 * Enforces a singleton record (id: 1) for the user's metabolic profile.
 */
export async function syncProfileToDb(profile: ProfileState): Promise<void> {
  // Prevent unhydrated or transient default states from overwriting persisted user data
  if (!profile.isHydrated) {
    return;
  }
  try {
    const record: UserProfileRecord = {
      id: 1,
      gender: profile.gender,
      age: profile.age,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      activityMultiplier: profile.activityMultiplier,
      weeklyLossKg: profile.weeklyLossKg,
      dailyCaloricTarget: profile.dailyCaloricTarget,
      proteinTarget: profile.proteinTarget,
      tdee: profile.tdee,
      updatedAt: Date.now(),
    };

    await db.profile.put(record);

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(record));
    }
  } catch (error) {
    console.error('Failed to sync profile to IndexedDB:', error);
  }
}

/**
 * Loads the saved user profile from IndexedDB (Dexie) as the single source of truth,
 * falling back to localStorage cache if IndexedDB has not yet been seeded.
 */
export async function loadProfileFromDb(): Promise<ProfileState | null> {
  try {
    let record = await db.profile.get(1);

    // If Dexie is empty on boot, check localStorage cache
    if (!record && typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed.dailyCaloricTarget === 'number') {
            record = parsed;
            // Atomically heal Dexie with cached record
            await db.profile.put(parsed);
          }
        } catch {}
      }
    }

    if (!record) return null;

    const bmr = calculateBMR(record.gender, record.weightKg, record.heightCm, record.age);
    const tdee = record.tdee ?? Math.round(calculateTDEE(bmr, record.activityMultiplier));
    const proteinTarget = record.proteinTarget ?? Math.max(100, Math.round(record.weightKg * 1.8));

    const state: ProfileState = {
      gender: record.gender,
      age: record.age,
      heightCm: record.heightCm,
      weightKg: record.weightKg,
      activityMultiplier: record.activityMultiplier,
      weeklyLossKg: record.weeklyLossKg,
      dailyCaloricTarget: record.dailyCaloricTarget,
      proteinTarget,
      tdee,
      isHydrated: true,
    };

    // Update localStorage cache to match
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ ...record, proteinTarget, tdee }));
    }

    return state;
  } catch (error) {
    console.error('Failed to load profile from IndexedDB:', error);
    return null;
  }
}
