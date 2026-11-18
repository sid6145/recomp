import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ConsumptionLog, FoodItem } from '../db/db';

export interface LoggedEntry extends Partial<ConsumptionLog> {
  id: number;
  date: string;
  foodId: string;
  foodName?: string;
  selectedUnit?: string;
  quantity: number;
  totalCalories: number;
  timestamp: number;
  foodDetails?: FoodItem;
}

export interface LogsState {
  entries: LoggedEntry[];
}

const initialState: LogsState = {
  entries: [],
};

export const logsSlice = createSlice({
  name: 'logs',
  initialState,
  reducers: {
    setLogEntries: (state, action: PayloadAction<LoggedEntry[]>) => {
      state.entries = action.payload;
    },
    logFoodItem: (
      state,
      action: PayloadAction<{
        food: FoodItem;
        quantity?: number;
        savedLog?: ConsumptionLog;
      }>
    ) => {
      const { food, quantity = 1, savedLog } = action.payload;
      const today = new Date().toISOString().split('T')[0];

      const entry: LoggedEntry = {
        id: savedLog?.id ?? Date.now(),
        date: savedLog?.date ?? today,
        foodId: String(food.id),
        foodName: food.name,
        selectedUnit: savedLog?.selectedUnit ?? 'serving',
        quantity,
        totalCalories: savedLog?.totalCalories ?? Math.round((food.calories ?? 0) * quantity),
        timestamp: savedLog?.timestamp ?? Date.now(),
        foodDetails: food,
        calculatedMacros: savedLog?.calculatedMacros,
      };
      state.entries.unshift(entry);
    },
    removeLogEntry: (state, action: PayloadAction<number>) => {
      state.entries = state.entries.filter((entry) => entry.id !== action.payload);
    },
  },
});

export const { setLogEntries, logFoodItem, removeLogEntry } = logsSlice.actions;
export default logsSlice.reducer;
