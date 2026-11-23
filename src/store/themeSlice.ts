import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  type ThemeSettings,
  getPersistedThemeSettings,
  savePersistedThemeSettings,
  applyMaterialYouTheme,
} from '../theme/materialThemeEngine';

export interface ThemeState extends ThemeSettings {
  isPaletteSheetOpen: boolean;
}

const initialSettings = getPersistedThemeSettings();

const initialState: ThemeState = {
  ...initialSettings,
  isPaletteSheetOpen: false,
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setSeedColor: (state, action: PayloadAction<string>) => {
      state.seedColor = action.payload;
      savePersistedThemeSettings(state);
      applyMaterialYouTheme(state);
    },
    setThemeMode: (state, action: PayloadAction<ThemeSettings['themeMode']>) => {
      state.themeMode = action.payload;
      savePersistedThemeSettings(state);
      applyMaterialYouTheme(state);
    },
    setSchemeStyle: (state, action: PayloadAction<ThemeSettings['schemeStyle']>) => {
      state.schemeStyle = action.payload;
      savePersistedThemeSettings(state);
      applyMaterialYouTheme(state);
    },
    setOverdriveDynamicBoost: (state, action: PayloadAction<boolean>) => {
      state.overdriveDynamicBoost = action.payload;
      savePersistedThemeSettings(state);
      applyMaterialYouTheme(state);
    },
    setThemeSettings: (state, action: PayloadAction<Partial<ThemeSettings>>) => {
      Object.assign(state, action.payload);
      savePersistedThemeSettings(state);
      applyMaterialYouTheme(state);
    },
    openPaletteSheet: (state) => {
      state.isPaletteSheetOpen = true;
    },
    closePaletteSheet: (state) => {
      state.isPaletteSheetOpen = false;
    },
    togglePaletteSheet: (state) => {
      state.isPaletteSheetOpen = !state.isPaletteSheetOpen;
    },
  },
});

export const {
  setSeedColor,
  setThemeMode,
  setSchemeStyle,
  setOverdriveDynamicBoost,
  setThemeSettings,
  openPaletteSheet,
  closePaletteSheet,
  togglePaletteSheet,
} = themeSlice.actions;

export default themeSlice.reducer;
