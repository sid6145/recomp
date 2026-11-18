import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface SOSState {
  isSOSActive: boolean;
}

const initialState: SOSState = {
  isSOSActive: false,
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
  },
});

export const { setSOSActive, openSOS, closeSOS } = sosSlice.actions;
export default sosSlice.reducer;
