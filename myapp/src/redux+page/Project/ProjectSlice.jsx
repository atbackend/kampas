import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { createProjectService, fetchProjectDetailsService , updateProjectService,fetchProject } from '../../api/services/ProjectService';

// Async thunks for API calls
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchProject();
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData, { rejectWithValue }) => {
    try {
      // Use the data directly as passed from the component
      const data = await createProjectService(projectData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ projectId, projectData }, { rejectWithValue }) => {
    try {
      console.log('Updating project:', projectId);
      console.log('Update data being sent:', JSON.stringify(projectData, null, 2));
      
      const data = await updateProjectService(projectId, projectData);
      console.log('Update response received:', data);
      return data;
    } catch (error) {
      console.error('Update project error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        projectId,
        projectData
      });
      
      // Return detailed error information
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        details: error.response?.data,
        status: error.response?.status
      });
    }
  }
);

export const fetchProjectDetails = createAsyncThunk(
  'projects/fetchProjectDetails',
  async (projectId, { rejectWithValue }) => {
    try {
      const data = await fetchProjectDetailsService(projectId);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Helper function to normalize API project data
const normalizeProject = (apiProject) => ({
  id: apiProject.id,
  projectName: apiProject.project_name,
  client: apiProject.client_details?.contact_person || apiProject.client,
  clientId: apiProject.client,
  client_details: apiProject.client_details || null,
  projectHead: apiProject.project_head,
  projectHeadName: apiProject.project_head_name,
  managers: apiProject.managers || [],
  reviewers: apiProject.reviewers || [],
  editors: apiProject.editors || [],
  viewers: apiProject.viewers || [],
  description: apiProject.description || '',
  quantity: apiProject.quantity || '0.00',
  unit: apiProject.unit || '',
  startDate: apiProject.start_date || '',
  endDate: apiProject.end_date || '',
  status: apiProject.status || 'In Progress',
  is_active: apiProject.is_active, // ✅ Changed from 'isActive' to 'is_active'
  isActive: apiProject.is_active, 
  createdBy: apiProject.created_by,
  createdAt: apiProject.created_at,
  modifiedBy: apiProject.modified_by,
  modifiedAt: apiProject.modified_at,
  // Keep original API data for reference
  originalData: apiProject
});

// Initial state
const initialState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  successMessage: null,
  searchTerm: '',
  filter: {
    status: 'all',
    priority: 'all'
  },
  showFilterPanel: false,
  filteredProjectsCache: [],
  lastFilterState: null
};

// Slice
const projectSlice = createSlice({
  name: 'projects',
  initialState,
  
  projects: [],
  selectedProject: null,
  reducers: {
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
        state.filteredProjectsCache = [];
      state.lastFilterState = null;
    },
    setFilter: (state, action) => {
      state.filter = { ...state.filter, ...action.payload };
        state.filteredProjectsCache = [];
      state.lastFilterState = null;
    },
    toggleFilterPanel: (state) => {
      state.showFilterPanel = !state.showFilterPanel;
    },
    clearStatus: (state) => {
      state.error = null;
      state.successMessage = null;
    },
    clearCurrentProject: (state) => {
      state.currentProject = null;
    },
    clearProjects: (state) => {
      state.projects = [];
      state.filteredProjectsCache = [];
      state.lastFilterState = null;
      state.currentProject = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Projects
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = Array.isArray(action.payload) 
          ? action.payload.map(normalizeProject)
          : [];
      })
      
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create Project (unchanged)
      .addCase(createProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
        .addCase(createProject.fulfilled, (state, action) => {
        state.loading = false;
        const normalizedProject = normalizeProject(action.payload.project || action.payload);
        state.projects.push(normalizedProject);
        state.successMessage = action.payload.message || 'Project created successfully!';
        // Clear cache
        state.filteredProjectsCache = [];
        state.lastFilterState = null;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Project (improved error handling)
      .addCase(updateProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
           .addCase(updateProject.fulfilled, (state, action) => {
        state.loading = false;
        const normalizedProject = normalizeProject(action.payload.project || action.payload);
        const index = state.projects.findIndex(p => p.id === normalizedProject.id);
        if (index !== -1) {
          state.projects[index] = normalizedProject;
        }
        if (state.currentProject && state.currentProject.id === normalizedProject.id) {
          state.currentProject = normalizedProject;
        }
        state.successMessage = action.payload.message || 'Project updated successfully!';
        // Clear cache
        state.filteredProjectsCache = [];
        state.lastFilterState = null;
      })

      .addCase(updateProject.rejected, (state, action) => {
        state.loading = false;
        // Handle both string and object error payloads
        if (typeof action.payload === 'object' && action.payload.message) {
          state.error = action.payload.message;
        } else {
          state.error = action.payload || 'Failed to update project';
        }
      })
      
      // Fetch Project Details
      .addCase(fetchProjectDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProject = normalizeProject(action.payload);
      })
      .addCase(fetchProjectDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.currentProject = null;
      });
  }
});

export default projectSlice.reducer;

// Export actions
export const {
  setSearchTerm,
  setFilter,
  toggleFilterPanel,
  clearStatus,
  clearCurrentProject,
} = projectSlice.actions;

// Basic selectors
export const selectProjects = (state) => state.projects.projects;
export const selectCurrentProject = (state) => state.projects.currentProject;
export const selectProjectsLoading = (state) => state.projects.loading;
export const selectProjectsError = (state) => state.projects.error;
export const selectProjectsSuccessMessage = (state) => state.projects.successMessage;
export const selectSearchTerm = (state) => state.projects.searchTerm;
export const selectFilter = (state) => state.projects.filter;
export const selectShowFilterPanel = (state) => state.projects.showFilterPanel;

 // Optimized filtered projects selector with better caching
export const selectFilteredProjects = createSelector(
  [selectProjects, selectSearchTerm, selectFilter],
  (projects, searchTerm, filter) => {
    // Return early if no projects
    if (!projects || projects.length === 0) {
      return [];
    }

    // Use cached result if filter state hasn't changed
    const currentFilterState = JSON.stringify({ searchTerm, filter });
    
   return projects.filter((project) => {
      // Optimize search by avoiding repeated toLowerCase calls
      const searchLower = searchTerm ? searchTerm.toLowerCase() : '';
      
      const matchesSearch = !searchTerm || (
        project.projectName.toLowerCase().includes(searchLower) ||
        project.client.toLowerCase().includes(searchLower) ||
        (project.projectHeadName && project.projectHeadName.toLowerCase().includes(searchLower)) ||
        project.description.toLowerCase().includes(searchLower)
      );

      const matchesStatus = filter.status === 'all' || 
        (filter.status === 'active' && project.is_active) ||     
        (filter.status === 'inactive' && !project.is_active);

      const matchesPriority = filter.priority === 'all' || project.priority === filter.priority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  },
  {
    // Add custom equality check to prevent unnecessary recalculations
    memoizeOptions: {
      equalityCheck: (a, b) => {
        // Custom equality check for better performance
        return a === b;
      },
      maxSize: 1 // Only keep one cached result
    }
  }
);

export const selectPaginationMeta = createSelector(
  [selectFilteredProjects],
  (filteredProjects) => ({
    totalItems: filteredProjects.length,
    isEmpty: filteredProjects.length === 0,
    hasItems: filteredProjects.length > 0
  })
);


