// src/store/projectSelectionSlice.js
import { createSlice } from '@reduxjs/toolkit';

const projectSelectionSlice = createSlice({
  name: 'projectSelection',
  initialState: {
    selectedProjectId: null,
  },
  reducers: {
    setSelectedProjectId: (state, action) => {
      state.selectedProjectId = action.payload;
    },
    clearSelectedProjectId: (state) => {
      state.selectedProjectId = null;
    },
  },
});

export const { setSelectedProjectId, clearSelectedProjectId } = projectSelectionSlice.actions;
export default projectSelectionSlice.reducer;
