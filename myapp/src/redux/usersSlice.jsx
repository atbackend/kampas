import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';

// Fetch all roles
export const fetchRoles = createAsyncThunk('users/fetchRoles', async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get('/roles/'); 
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response.data);
  }
});

// Fetch all users
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/users/');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch users');
    }
  }
);

// Fetch user by ID
export const fetchUserById = createAsyncThunk(
  'users/fetchUserById',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.accessToken;
      const response = await axiosInstance.get(`/users/${id}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch user');
    }
  }
);

// Add a new user
export const addUser = createAsyncThunk(
  'users/addUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/adduser/', userData);
      const userId = response.data.id;
      const fullUserResponse = await axiosInstance.get(`/user/${userId}/`);
      return fullUserResponse.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to add user');
    }
  }
);

// Update an existing user
export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, userData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/updateuser/${id}/`, userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to update user');
    }
  }
);

// ✅ Delete a user
export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/deleteuser/${id}/`);
      return id; // Return only the ID to remove from state
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to delete user');
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
    user: null,
    loading: false,
    error: null,
    successMessage: null,
    roles: [],  // ✅ ensure this is always an array
    rolesLoading: false,
    rolesError: null,
  },
  reducers: {
    clearStatus: (state) => {
      state.successMessage = null;
      state.error = null;
    },
    setError: (state, action) => { // ✅ Set error state to handle errors mannually to show in UI like alerts
      state.successMessage = null;
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder

      // Fetch Roles
      .addCase(fetchRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = action.payload;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch User by ID
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Add User
      .addCase(addUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users.push(action.payload);
        state.successMessage = 'User added successfully!';
      })
      .addCase(addUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update User
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        const updatedUser = action.payload;
        state.users = state.users.map((user) =>
          user.id === updatedUser.id ? updatedUser : user
        );
        state.successMessage = 'User updated successfully!';
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ✅ Delete User
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.filter(user => user.id !== action.payload);
        state.successMessage = 'User deleted successfully!';
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearStatus, setError } = userSlice.actions;
export default userSlice.reducer;
