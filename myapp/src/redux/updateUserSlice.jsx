import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState = {
  user: null, // User details
  loading: false,
  error: null,
};

// Async thunk for updating the user
export const updateUser = createAsyncThunk(
  'auth/updateUser',
  async ({ id, userData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/updateuser/${id}/`, userData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`, // Add token for authentication
        },
      });
      return response.data; // Updated user data
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Something went wrong');
    }
  }
);

const updateUserSlice = createSlice({
  name: 'updateuser',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload; // Update the user in the state
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default updateUserSlice.reducer;
