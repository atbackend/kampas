import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { LOGIN_API, LOGOUT_API, PROFILE_API } from '../api/constants/endpoints';

// Login Action
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(LOGIN_API, credentials);
      return response.data; // API should return { access: '...', refresh: '...' }
    } catch (error) {
      console.error('Login error:', error); // Log the error for debugging
      return rejectWithValue(error.response?.data || 'An unknown error occurred');
    }
  }
);

// Logout Action
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(LOGOUT_API, credentials);
      return response.data; // API should return { access: '...', refresh: '...' }
    } catch (error) {
      return rejectWithValue(error.response?.data || 'An unknown error occurred');
    }
  }
);

// Update user profile
export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (updates, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(PROFILE_API, updates); // PROFILE_API should already point to "api/auth/profile/"
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Update failed');
    }
  }
);

// Fetch user profile (if needed independently)
export const fetchUserProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(PROFILE_API);
      // console.log('API response:', response);  // Log the response
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
    companyUsers: [],
    accessToken: localStorage.getItem('accessToken') || null,
    refreshToken: localStorage.getItem('refreshToken') || null,
    isAuthenticated: !!localStorage.getItem('accessToken'),
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.companyUsers = [];
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user'); // ADDED: Remove user from localStorage
      localStorage.setItem('isLoggedOut', 'true');
    },
    clearError: (state) => {
      state.error = null;
    },
    // ADDED: Action to update user without making API call
    updateUserInState: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    // ADDED: Action for successful token refresh
    refreshTokenSuccess: (state, action) => {
      state.accessToken = action.payload;
      localStorage.setItem('accessToken', action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle updateUserProfile
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        // FIXED: Merge the response with existing user data instead of replacing
        if (state.user && action.payload) {
          state.user = { ...state.user, ...action.payload };
          localStorage.setItem('user', JSON.stringify(state.user));
        }
        console.log('User updated successfully:', state.user);
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        
        // Only clear auth state on actual 401 errors, not all errors
        if (action.payload?.status === 401) {
          state.user = null;
          state.companyUsers = [];
          state.accessToken = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.setItem('isLoggedOut', 'true');
        }
      })

      // Handle loginUser 
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        const { access, refresh } = action.payload;
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = access;
        state.refreshToken = refresh;
        state.isAuthenticated = true;
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
        localStorage.removeItem('isLoggedOut'); // ADDED: Remove logout flag
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Handle logoutUser 
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.companyUsers = [];
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user'); // ✅

        localStorage.setItem('isLoggedOut', 'true');
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Handle fetchUserProfile lifecycle
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        // FIXED: Handle the response structure properly
        if (action.payload) {
          state.user = action.payload.current_user || action.payload.user || action.payload;
          state.companyUsers = action.payload.company_users || [];
          
          // Ensure we store the user data
          if (state.user) {
            localStorage.setItem('user', JSON.stringify(state.user));
          }
        }
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        
        // Only clear user data on 401 errors
        if (action.payload?.status === 401) {
          state.user = null;
          state.companyUsers = [];
          state.accessToken = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.setItem('isLoggedOut', 'true');
        }
      });
  },
});

export const { logout, clearError, updateUserInState, refreshTokenSuccess } = authSlice.actions;
export default authSlice.reducer;