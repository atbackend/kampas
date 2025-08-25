// src/api/userSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';

// Thunk for fetch Workspace
export const fetchWorkspaces = createAsyncThunk(
  'workspaces/fetchWorkspaces', 
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.accessToken; // Get the token from the state
      const response = await axiosInstance.get('/workspaces/',{
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // console.log("Log Workspaces", response.data);
      return response.data;
    } catch (error) {
      // console.log("Error", error.response?.data);
      return rejectWithValue(error.response?.data);
    }
  }
);

// Fetch a single Workspcae/project by ID
export const fetchWorkspaceById = createAsyncThunk(
  'workspaces/fetchWorkspaceById',
  async (id, { getState, rejectWithValue }) => {
    try {
      // console.log("ID", id);
      const token = getState().auth?.accessToken; // Get the token from the state
      const response = await axiosInstance.get(`/workspaces/${id}/`,{
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // console.log("Fetch Workspace by response", response);
      // console.log("Fetch Workspace by ID", response.data);
      return response.data;
    }catch (error) {
      return rejectWithValue(error.response.data);
    }
});

// Thunk for adding a Workspace
export const addWorkspace = createAsyncThunk(
  'workspaces/addWorkspace',
  async (workspaceData, { getState, rejectWithValue }) => {
    try {
      // console.log("workspaceData",workspaceData);
      const token = getState().auth?.accessToken; // Get the token from the state
      // console.log("Slice workspaceData", workspaceData);
      const response = await axiosInstance.post('/workspaces/', workspaceData,{
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }); // Use axiosInstance
      // console.log("New Workspace", response.data);
      return response.data; // The API should return the created workspaces
    } catch (error) {
      console.log(error.response.data);
      return rejectWithValue(error.response.data|| 'Something went wrong!' ); // Pass API errors to the Redux state
    }
  }
);

// Async thunk for updating the Workspace
export const updateWorkspace = createAsyncThunk(
  'workspaces/updateWorkspace',
  async ({ id, workspaceData }, { getState, rejectWithValue }) => {
    // console.log('Thunk received:', { id, workspaceData });
    try {
      const token = getState().auth?.accessToken; // Get the token from the state
      const response = await axiosInstance.patch(`/workspaces/${id}/`, workspaceData,{
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // console.log("Update Workspace", response.data);
      return response.data; // Return the updated user data
    } catch (error) {
      // console.log("Error", error.response?.data);
      return rejectWithValue(error.response?.data);
    }
  }
);

// ✅ Async action to update user role in a project
export const updateUserRole = createAsyncThunk(
  "workspaces/updateUserRole",
  async ({ id, userId, role }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.accessToken; // Get the token from the state
      const response = await axiosInstance.patch(`/workspaces/${id}/`,{ user_id: userId, role },{  
        headers: {
          Authorization: `Bearer ${token}`,
        },
       });
      // console.log("Update Workspace Role", response.data);
      // return response.data; // Return the updated user data
      return { userId, role }; // Return updated user role
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const workspaceSlice = createSlice({
  name: 'workspaces',
  initialState: { 
    workspaces: [],
    workspace: null,
    loading: false, 
    error: null,
    successMessage: null, 
    currentWorkspace: {
      project_head: '',
      project_managers: [],
      // add additional project properties as needed
    },
  },
  reducers: {
    clearStatus: (state) => {
      state.successMessage = null;
      state.error = null;
    },
    // For updating project_head locally in the form
    updateProjectHead(state, action) {
      state.currentProject.project_head = action.payload;
    },
    // For updating project_managers locally in the form
    updateProjectManagers(state, action) {
      state.currentWorkspace.project_managers = action.payload;
    },
    // To set the current project when editing
    setCurrentWorkspace(state, action) {
      state.currentWorkspace = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder

      // Handle Fetch Workspaces
      .addCase(fetchWorkspaces.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        // console.log(action.payload);
        state.workspaces = action.payload;
        state.loading = false;
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })

      // Handle Fetch Workspace by ID
      .addCase(fetchWorkspaceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaceById.fulfilled, (state, action) => {
        state.workspace = action.payload;
        state.loading = false;
      })
      .addCase(fetchWorkspaceById.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })

      // Handle Add Workspace
      .addCase(addWorkspace.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        state.workspaces.push(action.payload); // Add the new user to the state
      })
      .addCase(addWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Handle Update Workspaces
      .addCase(updateWorkspace.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        const updatedWorkspace = action.payload;
        // Update the workspace in the state
        state.workspaces = state.workspaces.map((workspace) =>
          workspace.id === updatedWorkspace.id ? updatedWorkspace : workspace
        );
        // Optionally update currentProject if that is what is being edited
        if (state.currentWorkspace.id === updatedWorkspace.id) {
          state.currentWorkspace = updatedWorkspace;
        }
        state.successMessage = 'Workspace updated successfully';
      })
      .addCase(updateWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Handle Update User Role
      .addCase(updateUserRole.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        state.loading = false;
        const { userId, role } = action.payload;
      
        state.workspaces = state.workspaces.map((workspace) => {
          // Find the user in any role group
          const allUsers = [
            workspace.project_head,
            ...workspace.project_managers,
            ...workspace.reviewers,
            ...workspace.editors,
            ...workspace.viewers,
          ];
          const user = allUsers.find((u) => u && u.id === userId);
          if (!user) return workspace;
      
          // Remove user from all role groups
          const removeUser = (arr) => arr.filter((u) => u.id !== userId);
      
          let updatedWorkspace = {
            ...workspace,
            project_managers: removeUser(workspace.project_managers),
            reviewers: removeUser(workspace.reviewers),
            editors: removeUser(workspace.editors),
            viewers: removeUser(workspace.viewers),
          };
      
          // Add user to the correct new role group
          if (role === "Project Head") {
            updatedWorkspace.project_head = { ...user, role };
          } else if (role === "Project Manager") {
            updatedWorkspace.project_managers.push({ ...user, role });
          } else if (role === "Reviewer") {
            updatedWorkspace.reviewers.push({ ...user, role });
          } else if (role === "Editor") {
            updatedWorkspace.editors.push({ ...user, role });
          } else if (role === "Viewer") {
            updatedWorkspace.viewers.push({ ...user, role });
          }
      
          return updatedWorkspace;
        });
      })      
      .addCase(updateUserRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.log("Error", action.payload);
      })

      ;
  },
});

export const { clearStatus } = workspaceSlice.actions;
export const { updateProjectHead, updateProjectManagers, setCurrentWorkspace } = workspaceSlice.actions;
export default workspaceSlice.reducer;
