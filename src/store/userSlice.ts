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
}

const initialGender: Gender = 'M';
const initialAge = 28;
const initialHeight = 178;
const initialWeight = 80;
const initialActivity = 1.55;
const initialWeeklyLoss = 0.5;

const initialBmr = calculateBMR(initialGender, initialWeight, initialHeight, initialAge);
const initialTdee = calculateTDEE(initialBmr, initialActivity);
const initialDailyCaloricTarget = calculateDailyTarget(initialTdee, initialWeeklyLoss);

const initialState: ProfileState = {
  gender: initialGender,
  age: initialAge,
  heightCm: initialHeight,
  weightKg: initialWeight,
  activityMultiplier: initialActivity,
  weeklyLossKg: initialWeeklyLoss,
  dailyCaloricTarget: initialDailyCaloricTarget,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateProfile: (state, action: PayloadAction<Partial<ProfileState>>) => {
      // Merge partial updates into state
      Object.assign(state, action.payload);

      // Recalculate thermodynamics instantaneously
      const bmr = calculateBMR(state.gender, state.weightKg, state.heightCm, state.age);
      const tdee = calculateTDEE(bmr, state.activityMultiplier);
      state.dailyCaloricTarget = calculateDailyTarget(tdee, state.weeklyLossKg);
    },
  },
});

export const { updateProfile } = userSlice.actions;
export default userSlice.reducer;
