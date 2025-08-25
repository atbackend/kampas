  

// // ====================================
// // userSlice.js - Redux slice for user management
// // ====================================

// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import { PROFILE_API } from '../../api/constants/endpoints';

// // Async thunks for API operations (for future use)
// // export const fetchUsers = createAsyncThunk(
// //   'users/fetchUsers',
// //   async (_, { rejectWithValue }) => {
// //     try {
// //       // const response = await axiosInstance.get('/users/');
// //       // return response.data;
      
// //       // For now, return hardcoded data
// //       return [
// //         { 
// //           id: 1, 
// //           firstName: 'John',
// //           lastName: 'Doe',
// //           email: 'john.doe@techsolutions.com', 
// //           role: 'admin',
// //           status: true 
// //         },
// //         { 
// //           id: 2, 
// //           firstName: 'Jane',
// //           lastName: 'Smith',
// //           email: 'jane.smith@digitalinnovations.com', 
// //           role: 'manager',
// //           status: true 
// //         },
// //         { 
// //           id: 3, 
// //           firstName: 'Mike',
// //           lastName: 'Johnson',
// //           email: 'mike.johnson@globalenterprises.com', 
// //           role: 'user',
// //           status: false 
// //         },
// //         { 
// //           id: 4, 
// //           firstName: 'Sarah',
// //           lastName: 'Wilson',
// //           email: 'sarah.wilson@startupdynamics.com', 
// //           role: 'manager',
// //           status: true 
// //         },
// //         { 
// //           id: 5, 
// //           firstName: 'Robert',
// //           lastName: 'Brown',
// //           email: 'robert.brown@enterprisesolutions.com', 
// //           role: 'user',
// //           status: false 
// //         },
// //         { 
// //           id: 6, 
// //           firstName: 'Emily',
// //           lastName: 'Davis',
// //           email: 'emily.davis@techcorp.com', 
// //           role: 'admin',
// //           status: true 
// //         },
// //         { 
// //           id: 7, 
// //           firstName: 'David',
// //           lastName: 'Miller',
// //           email: 'david.miller@innovatetech.com', 
// //           role: 'user',
// //           status: true 
// //         },
// //         { 
// //           id: 8, 
// //           firstName: 'Lisa',
// //           lastName: 'Taylor',
// //           email: 'lisa.taylor@futuresoft.com', 
// //           role: 'manager',
// //           status: false 
// //         },
// //       ];
// //     } catch (error) {
// //       return rejectWithValue(error.response?.data || 'Failed to fetch users');
// //     }
// //   }
// // );
// export const fetchUserProfile = createAsyncThunk(
//   'auth/fetchProfile',
//   async (_, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.get(PROFILE_API);
//       // console.log('API response:', response);  // Log the response
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data);
//     }
//   }
// );


// // Async Thunk
// export const createUserAsync = createAsyncThunk(
//   'users/createUser',
//   async (userData, { rejectWithValue }) => {
//     try {
//       const response = await createUser(userData);
//       return response;
//     } catch (error) {
//       return rejectWithValue(error.response?.data || error.message);
//     }
//   }
// );


// // Initial hardcoded data
// const initialUsers = [
//   { 
//     id: 1, 
//     firstName: 'John',
//     lastName: 'Doe',
//     email: 'john.doe@techsolutions.com', 
//     role: 'admin',
//     status: true 
//   },
//   { 
//     id: 2, 
//     firstName: 'Jane',
//     lastName: 'Smith',
//     email: 'jane.smith@digitalinnovations.com', 
//     role: 'manager',
//     status: true 
//   },
//   { 
//     id: 3, 
//     firstName: 'Mike',
//     lastName: 'Johnson',
//     email: 'mike.johnson@globalenterprises.com', 
//     role: 'user',
//     status: false 
//   },
//   { 
//     id: 4, 
//     firstName: 'Sarah',
//     lastName: 'Wilson',
//     email: 'sarah.wilson@startupdynamics.com', 
//     role: 'manager',
//     status: true 
//   },
//   { 
//     id: 5, 
//     firstName: 'Robert',
//     lastName: 'Brown',
//     email: 'robert.brown@enterprisesolutions.com', 
//     role: 'user',
//     status: false 
//   },
//   { 
//     id: 6, 
//     firstName: 'Emily',
//     lastName: 'Davis',
//     email: 'emily.davis@techcorp.com', 
//     role: 'admin',
//     status: true 
//   },
//   { 
//     id: 7, 
//     firstName: 'David',
//     lastName: 'Miller',
//     email: 'david.miller@innovatetech.com', 
//     role: 'user',
//     status: true 
//   },
//   { 
//     id: 8, 
//     firstName: 'Lisa',
//     lastName: 'Taylor',
//     email: 'lisa.taylor@futuresoft.com', 
//     role: 'manager',
//     status: false 
//   },
// ];

// const userSlice = createSlice({
//   name: 'users',
//   initialState: {
//     users: initialUsers,
//     loading: false,
//     error: null,
//     successMessage: null,
//     searchTerm: '',
//     currentPage: 1,
//     itemsPerPage: 10,
//     filter: {
//       status: 'all', // 'all', 'active', 'inactive'
//       role: 'all' // 'all', 'admin', 'manager', 'user'
//     },
//     showFilterPanel: false
//   },
//   reducers: {
//     setSearchTerm: (state, action) => {
//       state.searchTerm = action.payload;
//       state.currentPage = 1; // Reset to first page when searching
//     },
//     setCurrentPage: (state, action) => {
//       state.currentPage = action.payload;
//     },
//     setItemsPerPage: (state, action) => {
//       state.itemsPerPage = action.payload;
//       state.currentPage = 1; // Reset to first page when changing page size
//     },
//     clearStatus: (state) => {
//       state.successMessage = null;
//       state.error = null;
//     },
//     setError: (state, action) => {
//       state.successMessage = null;
//       state.error = action.payload;
//     },
//     setFilter: (state, action) => {
//       state.filter = { ...state.filter, ...action.payload };
//       state.currentPage = 1; // Reset to first page when filtering
//     },
//     toggleFilterPanel: (state) => {
//       state.showFilterPanel = !state.showFilterPanel;
//     },
//     addUserLocal: (state, action) => {
//       const newUser = {
//         ...action.payload,
//         id: Date.now(),
//         status: true
//       };
//       state.users.push(newUser);
//       state.successMessage = 'User added successfully!';
//     },
//     updateUserLocal: (state, action) => {
//       const { id, ...updates } = action.payload;
//       const index = state.users.findIndex(user => user.id === id);
//       if (index !== -1) {
//         state.users[index] = { ...state.users[index], ...updates };
//         state.successMessage = 'User updated successfully!';
//       }
//     },
//     deleteUserLocal: (state, action) => {
//       state.users = state.users.filter(user => user.id !== action.payload);
//       state.successMessage = 'User deleted successfully!';
//     },
//     toggleUserStatus: (state, action) => {
//       const user = state.users.find(u => u.id === action.payload);
//       if (user) {
//         user.status = !user.status;
//         state.successMessage = `User status updated to ${user.status ? 'Active' : 'Inactive'}!`;
//       }
//     },
//     updateUserRole: (state, action) => {
//       const { id, role } = action.payload;
//       const user = state.users.find(u => u.id === id);
//       if (user) {
//         user.role = role;
//         state.successMessage = 'User role updated successfully!';
//       }
//     },
//   },
// });

// export const {
//   setSearchTerm,
//   setCurrentPage,
//   setItemsPerPage,
//   clearStatus,
//   setError,
//   setFilter,
//   toggleFilterPanel,
//   addUserLocal,
//   updateUserLocal,
//   deleteUserLocal,
//   toggleUserStatus,
//   updateUserRole,
// } = userSlice.actions;

// export default userSlice.reducer;import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axiosInstance'; // Fixed import path
import { createUser } from '../../api/services/UserService.jsx'; // Add other service imports

// Create new user via API
export const createUserAsync = createAsyncThunk(
  'users/createUser',
  async (userData, { rejectWithValue, getState }) => {
    try {
      // Debug logging - check if accessToken exists
      const state = getState();
      const accessToken = state.auth?.accessToken;
      
      console.log('🔍 Debug Info:');
      console.log('- Auth state:', state.auth);
      console.log('- Access Token:', accessToken);
      console.log('- User Data being sent:', userData);
      
      if (!accessToken) {
        console.error('❌ No access token found in Redux state!');
        return rejectWithValue('No access token available');
      }

      const response = await createUser(userData);
      console.log('✅ User created successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ CreateUser Error Details:');
      console.error('- Error object:', error);
      console.error('- Error response:', error.response);
      console.error('- Error status:', error.response?.status);
      console.error('- Error data:', error.response?.data);
      console.error('- Error message:', error.message);

      // Handle different types of errors
      if (error.response?.data) {
        return rejectWithValue(error.response.data);
      } else if (error.message) {
        return rejectWithValue(error.message);
      } else {
        return rejectWithValue('Failed to create user');
      }
    }
  }
);

// Update user async thunk
export const updateUserAsync = createAsyncThunk(
  'users/updateUser',
  async ({ id, userData }, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const accessToken = state.auth?.accessToken;
      
      if (!accessToken) {
        return rejectWithValue('No access token available');
      }

      const response = await updateUser(id, userData);
      return response;
    } catch (error) {
      console.error('❌ UpdateUser Error:', error);
      if (error.response?.data) {
        return rejectWithValue(error.response.data);
      } else if (error.message) {
        return rejectWithValue(error.message);
      } else {
        return rejectWithValue('Failed to update user');
      }
    }
  }
);

// Delete user async thunk
export const deleteUserAsync = createAsyncThunk(
  'users/deleteUser',
  async (userId, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const accessToken = state.auth?.accessToken;
      
      if (!accessToken) {
        return rejectWithValue('No access token available');
      }

      await deleteUser(userId);
      return userId;
    } catch (error) {
      console.error('❌ DeleteUser Error:', error);
      if (error.response?.data) {
        return rejectWithValue(error.response.data);
      } else if (error.message) {
        return rejectWithValue(error.message);
      } else {
        return rejectWithValue('Failed to delete user');
      }
    }
  }
);

// Fetch all users async thunk
export const fetchUsersAsync = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const accessToken = state.auth?.accessToken;
      
      if (!accessToken) {
        return rejectWithValue('No access token available');
      }

      // Replace with your actual API endpoint for fetching users
      const response = await axiosInstance.get('/api/users/'); // Adjust endpoint as needed
      return response.data;
    } catch (error) {
      console.error('❌ FetchUsers Error:', error);
      if (error.response?.data) {
        return rejectWithValue(error.response.data);
      } else if (error.message) {
        return rejectWithValue(error.message);
      } else {
        return rejectWithValue('Failed to fetch users');
      }
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState: {
    users: [
      // Your hardcoded users for development
      { 
        id: 1, 
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@techsolutions.com', 
        phone: '+1234567890',
        role: 'admin',
        status: true 
      },
      { 
        id: 2, 
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@digitalinnovations.com', 
        phone: '+1234567891',
        role: 'primary_admin',
        status: true 
      },
    ],
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
    // Local operations (for fallback or immediate UI updates)
    addUserLocal: (state, action) => {
      const newUser = {
        ...action.payload,
        id: Date.now(),
        status: true
      };
      state.users.push(newUser);
      state.successMessage = 'User added successfully!';
    },
    updateUserLocal: (state, action) => {
      const { id, ...updates } = action.payload;
      const index = state.users.findIndex(user => user.id === id);
      if (index !== -1) {
        state.users[index] = { ...state.users[index], ...updates };
        state.successMessage = 'User updated successfully!';
      }
    },
    deleteUserLocal: (state, action) => {
      state.users = state.users.filter(user => user.id !== action.payload);
      state.successMessage = 'User deleted successfully!';
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
      })
      .addCase(fetchUsersAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsersAsync.rejected, (state, action) => {
        state.loading = false;
        // Handle different error formats
        if (typeof action.payload === 'object' && action.payload.message) {
          state.error = action.payload.message;
        } else if (typeof action.payload === 'string') {
          state.error = action.payload;
        } else {
          state.error = 'Failed to fetch users';
        }

        // If 401 error, the auth interceptor should handle logout
        if (action.payload?.status === 401 || action.payload?.message?.includes('401')) {
          // Let the auth slice handle the logout via interceptor
          console.log('401 error detected in users slice');
        }
      })
      
      // Create User
      .addCase(createUserAsync.pending, (state) => {
        console.log('📝 CreateUser: Pending...');
        state.creating = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createUserAsync.fulfilled, (state, action) => {
        console.log('✅ CreateUser: Fulfilled with data:', action.payload);
        const newUser = {
          ...action.payload,
          id: action.payload.id || Date.now(),
          status: action.payload.status !== undefined ? action.payload.status : true,
        };
        state.users.push(newUser);
        state.creating = false;
        state.successMessage = 'User created successfully!';
      })
      .addCase(createUserAsync.rejected, (state, action) => {
        console.error('❌ CreateUser: Rejected with payload:', action.payload);
        state.creating = false;
        // Handle different error formats
        if (typeof action.payload === 'object' && action.payload.message) {
          state.error = action.payload.message;
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
      })
      .addCase(updateUserAsync.fulfilled, (state, action) => {
        const { id, ...updates } = action.payload;
        const index = state.users.findIndex(user => user.id === id);
        if (index !== -1) {
          state.users[index] = { ...state.users[index], ...updates };
        }
        state.updating = false;
        state.successMessage = 'User updated successfully!';
      })
      .addCase(updateUserAsync.rejected, (state, action) => {
        state.updating = false;
        // Handle different error formats
        if (typeof action.payload === 'object' && action.payload.message) {
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
      })
      .addCase(deleteUserAsync.fulfilled, (state, action) => {
        state.users = state.users.filter(user => user.id !== action.payload);
        state.deleting = false;
        state.successMessage = 'User deleted successfully!';
      })
      .addCase(deleteUserAsync.rejected, (state, action) => {
        state.deleting = false;
        // Handle different error formats
        if (typeof action.payload === 'object' && action.payload.message) {
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