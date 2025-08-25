
import { createUser, fetchUser,updateUser } from '../../api/services/UserService.jsx'; // Add other service imports
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
    creating: false,
    updating: false,
    deleting: false,
    loading: false,
    error: null,
    successMessage: null,
    searchTerm: '',
    currentPage: 1,
    itemsPerPage: 10,
    filter: {
      status: 'all', // 'all', 'active', 'inactive'
      role: 'all' // 'all', 'admin', 'manager', 'user', 'primary_admin'
    },
    showFilterPanel: false
  },
  reducers: {
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
      state.currentPage = 1;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setItemsPerPage: (state, action) => {
      state.itemsPerPage = action.payload;
      state.currentPage = 1;
    },
    clearStatus: (state) => {
      state.successMessage = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setError: (state, action) => {
      state.successMessage = null;
      state.error = action.payload;
    },
    setSuccessMessage: (state, action) => {
      state.error = null;
      state.successMessage = action.payload;
    },
    setFilter: (state, action) => {
      state.filter = { ...state.filter, ...action.payload };
      state.currentPage = 1;
    },
    toggleFilterPanel: (state) => {
      state.showFilterPanel = !state.showFilterPanel;
    },
 
    toggleUserStatus: (state, action) => {
      const user = state.users.find(u => u.id === action.payload);
      if (user) {
        user.status = !user.status;
        state.successMessage = `User status updated to ${user.status ? 'Active' : 'Inactive'}!`;
      }
    },
    updateUserRole: (state, action) => {
      const { id, role } = action.payload;
      const user = state.users.find(u => u.id === id);
      if (user) {
        user.role = role;
        state.successMessage = 'User role updated successfully!';
      }
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsersAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
        console.log('🔄 FetchUsers: Starting to fetch users...');
      })
      .addCase(fetchUsersAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
        console.log('✅ FetchUsers: Successfully fetched users:', action.payload);
      })
      .addCase(fetchUsersAsync.rejected, (state, action) => {
        state.loading = false;
        console.error('❌ FetchUsers: Failed to fetch users:', action.payload);
        
        // Handle different error formats
        if (typeof action.payload === 'object' && action.payload?.message) {
          state.error = action.payload.message;
        } else if (typeof action.payload === 'string') {
          state.error = action.payload;
        } else {
          state.error = 'Failed to fetch users';
        }

        // If 401 error, the auth interceptor should handle logout
        if (action.payload?.status === 401 || action.payload?.message?.includes('401')) {
          console.log('401 error detected in users slice');
        }
      })
      
      // Create User - Enhanced for better data flow
      .addCase(createUserAsync.pending, (state) => {
        console.log('📝 CreateUser: Starting user creation...');
        state.creating = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createUserAsync.fulfilled, (state, action) => {
  console.log('✅ CreateUser: User created successfully:', action.payload);
  
  // Handle different response formats from your API
  let userData;
  if (action.payload.user) {
    // If API returns { message: "...", user: {...} }
    userData = action.payload.user;
  } else if (action.payload.data) {
    // If API returns { data: {...} }
    userData = action.payload.data;
  } else {
    // If API returns user data directly
    userData = action.payload;
  }

  const newUser = {
    ...userData,
    id: userData.id || Date.now(),
    status: userData.status !== undefined ? userData.status : true,
    // Ensure consistent field names
    firstName: userData.firstName || userData.first_name,
    lastName: userData.lastName || userData.last_name,
    first_name: userData.first_name || userData.firstName,
    last_name: userData.last_name || userData.lastName,
    phone: userData.phone || userData.phone_number, // Add this line
  };
  
  // Add user to state
  state.users.push(newUser);
  state.creating = false;
  state.successMessage = action.payload.message || 'User created successfully!';
  
  console.log('✅ CreateUser: User added to state, total users:', state.users.length);
})
      .addCase(createUserAsync.rejected, (state, action) => {
        console.error('❌ CreateUser: User creation failed:', action.payload);
        state.creating = false;
        
        // Better error handling for validation errors
        if (typeof action.payload === 'object' && action.payload !== null) {
          // If it's a validation error object with field-specific errors
          if (Object.keys(action.payload).some(key => Array.isArray(action.payload[key]))) {
            // Format validation errors nicely
            const errorMessages = [];
            Object.keys(action.payload).forEach(field => {
              const fieldErrors = action.payload[field];
              if (Array.isArray(fieldErrors)) {
                errorMessages.push(`${field.replace('_', ' ')}: ${fieldErrors.join(', ')}`);
              } else {
                errorMessages.push(`${field.replace('_', ' ')}: ${fieldErrors}`);
              }
            });
            state.error = errorMessages.join('; ');
          } else if (action.payload.message) {
            state.error = action.payload.message;
          } else if (action.payload.detail) {
            state.error = action.payload.detail;
          } else {
            state.error = JSON.stringify(action.payload);
          }
        } else if (typeof action.payload === 'string') {
          state.error = action.payload;
        } else {
          state.error = 'Failed to create user';
        }

        // If 401 error, the auth interceptor should handle logout
        if (action.payload?.status === 401 || action.payload?.message?.includes('401')) {
          console.log('401 error detected in create user');
        }
      })
      
      // Update User
      .addCase(updateUserAsync.pending, (state) => {
        state.updating = true;
        state.error = null;
        state.successMessage = null;
        console.log('🔄 UpdateUser: Starting user update...');
      })
     .addCase(updateUserAsync.fulfilled, (state, action) => {
  const updatedUser = action.payload.user || action.payload.data || action.payload;
  const index = state.users.findIndex(user => user.id === updatedUser.id);
  if (index !== -1) {
    state.users[index] = {
      ...state.users[index],
      ...updatedUser,
      // Ensure consistent field names
      firstName: updatedUser.firstName || updatedUser.first_name,
      lastName: updatedUser.lastName || updatedUser.last_name,
      first_name: updatedUser.first_name || updatedUser.firstName,
      last_name: updatedUser.last_name || updatedUser.lastName,
      phone: updatedUser.phone || updatedUser.phone_number, // Add this line
    };
  }
  state.updating = false;
  state.successMessage = action.payload.message || 'User updated successfully!';
  console.log('✅ UpdateUser: User updated successfully');
})
      .addCase(updateUserAsync.rejected, (state, action) => {
        state.updating = false;
        console.error('❌ UpdateUser: User update failed:', action.payload);
        
        // Handle different error formats
        if (typeof action.payload === 'object' && action.payload?.message) {
          state.error = action.payload.message;
        } else if (typeof action.payload === 'string') {
          state.error = action.payload;
        } else {
          state.error = 'Failed to update user';
        }

        // If 401 error, the auth interceptor should handle logout
        if (action.payload?.status === 401 || action.payload?.message?.includes('401')) {
          console.log('401 error detected in update user');
        }
      })
      
      // Delete User
      .addCase(deleteUserAsync.pending, (state) => {
        state.deleting = true;
        state.error = null;
        state.successMessage = null;
        console.log('🗑️ DeleteUser: Starting user deletion...');
      })
      .addCase(deleteUserAsync.fulfilled, (state, action) => {
        state.users = state.users.filter(user => user.id !== action.payload);
        state.deleting = false;
        state.successMessage = 'User deleted successfully!';
        console.log('✅ DeleteUser: User deleted successfully');
      })
      .addCase(deleteUserAsync.rejected, (state, action) => {
        state.deleting = false;
        console.error('❌ DeleteUser: User deletion failed:', action.payload);
        
        // Handle different error formats
        if (typeof action.payload === 'object' && action.payload?.message) {
          state.error = action.payload.message;
        } else if (typeof action.payload === 'string') {
          state.error = action.payload;
        } else {
          state.error = 'Failed to delete user';
        }

        // If 401 error, the auth interceptor should handle logout
        if (action.payload?.status === 401 || action.payload?.message?.includes('401')) {
          console.log('401 error detected in delete user');
        }
      });
  }
});

// Enhanced async thunks with better error handling and data flow


export const createUserAsync = createAsyncThunk(
  'users/createUser',
  async (userData, { dispatch, rejectWithValue }) => {
    try {
      console.log('📝 CreateUser: Making API call with data:', userData);
      const response = await createUser(userData);
      console.log('✅ CreateUser: API response:', response);
      
      // After successful creation, fetch all users to ensure data consistency
      // This ensures the created user persists after client
      setTimeout(() => {
        console.log('🔄 CreateUser: Refetching users after creation...');
        dispatch(fetchUsersAsync());
      }, 500);
      
      return response;
    } catch (error) {
      console.error('❌ CreateUser API Error:', error);
      
      // Enhanced error handling
      if (error.response?.data) {
        // If backend sent error message (e.g. validation or auth)
        return rejectWithValue(error.response.data.detail || error.response.data.message || error.response.data);
      } else if (error.message) {
        // Network errors (e.g. server down, CORS issues)
        return rejectWithValue(error.message);
      } else {
        return rejectWithValue('Failed to create user');
      }
    }
  }
);
export const fetchUsersAsync = createAsyncThunk(
  'users/fetchUsers',
  async (userData, { rejectWithValue }) => {
    try {
      console.log('🔄 FetchUsers: Making API call...');
      const response = await fetchUser(userData);
      console.log('✅ FetchUsers: API response:', response);
      return response;
    } catch (error) {
      console.error('❌ FetchUsers API Error:', error);
      
      if (error.response?.data) {
        return rejectWithValue(
          error.response.data.detail ||
          error.response.data.message ||
          error.response.data
        );
      } else if (error.message) {
        return rejectWithValue(error.message);
      } else {
        return rejectWithValue('Failed to fetch users');
      }
    }
  }
);
export const updateUserAsync = createAsyncThunk(
  'users/updateUser',
  async ({ id, userData }, { dispatch, rejectWithValue }) => {
    try {
      console.log('🔄 UpdateUser: Making API call for user:', id);
      const response = await updateUser(id, userData);
      console.log('✅ UpdateUser: API response:', response);
      
      // Optionally refetch users after update
      setTimeout(() => {
        dispatch(fetchUsersAsync());
      }, 500);
      
      return response;
    } catch (error) {
      console.error('❌ UpdateUser API Error:', error);
      
      if (error.response?.data) {
        return rejectWithValue(error.response.data.detail || error.response.data.message || error.response.data);
      } else if (error.message) {
        return rejectWithValue(error.message);
      } else {
        return rejectWithValue('Failed to update user');
      }
    }
  }
);

export const deleteUserAsync = createAsyncThunk(
  'users/deleteUser',
  async (userId, { dispatch, rejectWithValue }) => {
    try {
      console.log('🗑️ DeleteUser: Making API call for user:', userId);
      await deleteUser(userId);
      console.log('✅ DeleteUser: User deleted successfully');
      
      // Refetch users after deletion
      setTimeout(() => {
        dispatch(fetchUsersAsync());
      }, 500);
      
      return userId;
    } catch (error) {
      console.error('❌ DeleteUser API Error:', error);
      
      if (error.response?.data) {
        return rejectWithValue(error.response.data.detail || error.response.data.message || error.response.data);
      } else if (error.message) {
        return rejectWithValue(error.message);
      } else {
        return rejectWithValue('Failed to delete user');
      }
    }
  }
);

export const {
  setSearchTerm,
  setCurrentPage,
  setItemsPerPage,
  clearStatus,
  clearError,
  setError,
  setSuccessMessage,
  setFilter,
  toggleFilterPanel,
  addUserLocal,
  updateUserLocal,
  deleteUserLocal,
  toggleUserStatus,
  updateUserRole,
} = userSlice.actions;

export default userSlice.reducer;