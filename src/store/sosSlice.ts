import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface SOSState {
  isSOSActive: boolean;
  isCravingRebalanceOpen: boolean;
}

const initialState: SOSState = {
  isSOSActive: false,
  isCravingRebalanceOpen: false,
};

export const sosSlice = createSlice({
  name: 'sos',
  initialState,
  reducers: {
    setSOSActive: (state, action: PayloadAction<boolean>) => {
      state.isSOSActive = action.payload;
    },
    openSOS: (state) => {
      state.isSOSActive = true;
    },
    closeSOS: (state) => {
      state.isSOSActive = false;
    },
    openCravingRebalance: (state) => {
      state.isSOSActive = false; // close SOS if it was active
      state.isCravingRebalanceOpen = true;
    },
    closeCravingRebalance: (state) => {
      state.isCravingRebalanceOpen = false;
    },
  },
});

export const {
  setSOSActive,
  openSOS,
  closeSOS,
  openCravingRebalance,
  closeCravingRebalance,
} = sosSlice.actions;

export default sosSlice.reducer;
