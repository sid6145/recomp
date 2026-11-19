import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  calculateBMR,
  calculateTDEE,
  calculateDailyTarget,
  type Gender,
} from '../utils/thermodynamics';

export interface ProfileState {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityMultiplier: number;
  weeklyLossKg: number;
  dailyCaloricTarget: number;
  proteinTarget: number;
  tdee: number;
  isHydrated: boolean;
}

const defaultGender: Gender = 'M';
const defaultAge = 28;
const defaultHeight = 178;
const defaultWeight = 80;
const defaultActivity = 1.55;
const defaultWeeklyLoss = 0.5;

function getInitialProfile(): ProfileState {
  const defaultBmr = calculateBMR(defaultGender, defaultWeight, defaultHeight, defaultAge);
  const defaultTdee = Math.round(calculateTDEE(defaultBmr, defaultActivity));
  const defaultDailyCaloricTarget = calculateDailyTarget(defaultTdee, defaultWeeklyLoss);
  const defaultProteinTarget = Math.max(100, Math.round(defaultWeight * 1.8));

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = localStorage.getItem('recomp_user_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.dailyCaloricTarget === 'number') {
          return {
            gender: parsed.gender ?? defaultGender,
            age: parsed.age ?? defaultAge,
            heightCm: parsed.heightCm ?? defaultHeight,
            weightKg: parsed.weightKg ?? defaultWeight,
            activityMultiplier: parsed.activityMultiplier ?? defaultActivity,
            weeklyLossKg: parsed.weeklyLossKg ?? defaultWeeklyLoss,
            dailyCaloricTarget: parsed.dailyCaloricTarget,
            proteinTarget: parsed.proteinTarget ?? defaultProteinTarget,
            tdee: parsed.tdee ?? defaultTdee,
            isHydrated: true,
          };
        }
      }
    } catch {}
  }

  return {
    gender: defaultGender,
    age: defaultAge,
    heightCm: defaultHeight,
    weightKg: defaultWeight,
    activityMultiplier: defaultActivity,
    weeklyLossKg: defaultWeeklyLoss,
    dailyCaloricTarget: defaultDailyCaloricTarget,
    proteinTarget: defaultProteinTarget,
    tdee: defaultTdee,
    isHydrated: false,
  };
}

const initialState: ProfileState = getInitialProfile();

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateProfile: (state, action: PayloadAction<Partial<ProfileState>>) => {
      // Merge partial updates into state
      Object.assign(state, action.payload);

      // Recalculate thermodynamics instantaneously
      const bmr = calculateBMR(state.gender, state.weightKg, state.heightCm, state.age);
      const calculatedTdee = Math.round(calculateTDEE(bmr, state.activityMultiplier));
      state.tdee = action.payload.tdee ?? calculatedTdee;
      state.proteinTarget =
        action.payload.proteinTarget ?? Math.max(100, Math.round(state.weightKg * 1.8));

      // If dailyCaloricTarget was explicitly specified in payload (e.g. from hydration), preserve it;
      // otherwise recalculate based on updated stats/goal
      if (action.payload.dailyCaloricTarget !== undefined) {
        state.dailyCaloricTarget = action.payload.dailyCaloricTarget;
      } else {
        state.dailyCaloricTarget = calculateDailyTarget(calculatedTdee, state.weeklyLossKg);
      }
      state.isHydrated = true;
    },
    setHydratedProfile: (state, action: PayloadAction<ProfileState>) => {
      Object.assign(state, action.payload);
      state.isHydrated = true;
    },
    markHydrated: (state) => {
      state.isHydrated = true;
    },
  },
});

export const { updateProfile, setHydratedProfile, markHydrated } = userSlice.actions;
export default userSlice.reducer;
