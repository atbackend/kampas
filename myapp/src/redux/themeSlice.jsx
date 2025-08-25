// src/redux/themeSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  mode: localStorage.getItem("theme") || "dark", // default dark
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === "dark" ? "light" : "dark";
      localStorage.setItem("theme", state.mode);
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
      localStorage.setItem("theme", state.mode);
    }
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
