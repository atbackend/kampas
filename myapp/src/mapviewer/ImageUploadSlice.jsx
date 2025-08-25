// imageUploadSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { uploadImages } from '../api/services/ImageUploadService';
import { logout } from '../redux/authSlice'; // Adjust path as needed

// Async thunk for uploading images
export const uploadProjectImages = createAsyncThunk(
  'imageUpload/uploadProjectImages',
  async ({ projectId, files, onProgress }, { getState, rejectWithValue, dispatch }) => {
    try {
      const token = getState().auth?.accessToken || localStorage.getItem('access_token');
      if (!token) throw new Error('No access token found');

      const response = await uploadImages(projectId, files, onProgress);
      return {
        projectId,
        uploadedFiles: response,
        files: files.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type
        }))
      };
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data || 'Upload failed');
    }
  }
);

const imageUploadSlice = createSlice({
  name: 'imageUpload',
  initialState: {
    uploads: {}, // { [projectId]: { files: [], loading: false, error: null, progress: 0 } }
    loading: false,
    error: null,
  },
  reducers: {
    // Set upload progress for a specific project
    setUploadProgress: (state, action) => {
      const { projectId, progress } = action.payload;
      if (!state.uploads[projectId]) {
        state.uploads[projectId] = { files: [], loading: false, error: null, progress: 0 };
      }
      state.uploads[projectId].progress = progress;
    },
    
    // Clear upload data for a project
    clearProjectUploads: (state, action) => {
      const projectId = action.payload;
      delete state.uploads[projectId];
    },
    
    // Reset all upload data
    resetUploads: (state) => {
      state.uploads = {};
      state.loading = false;
      state.error = null;
    },
    
    // Clear error for a specific project
    clearProjectError: (state, action) => {
      const projectId = action.payload;
      if (state.uploads[projectId]) {
        state.uploads[projectId].error = null;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Upload images
      .addCase(uploadProjectImages.pending, (state, action) => {
        const projectId = action.meta.arg.projectId;
        if (!state.uploads[projectId]) {
          state.uploads[projectId] = { files: [], loading: false, error: null, progress: 0 };
        }
        state.uploads[projectId].loading = true;
        state.uploads[projectId].error = null;
        state.uploads[projectId].progress = 0;
        state.loading = true;
      })
      .addCase(uploadProjectImages.fulfilled, (state, action) => {
        const { projectId, uploadedFiles, files } = action.payload;
        if (!state.uploads[projectId]) {
          state.uploads[projectId] = { files: [], loading: false, error: null, progress: 0 };
        }
        state.uploads[projectId].loading = false;
        
        // Process upload results
        const successfulUploads = uploadedFiles.uploadResults?.filter(result => !result.error) || [];
        const failedUploads = uploadedFiles.uploadResults?.filter(result => result.error) || [];
        
        // Add successful uploads to the files array
        state.uploads[projectId].files = [
          ...state.uploads[projectId].files,
          ...successfulUploads.map((result, index) => ({
            id: Date.now() + index,
            name: result.originalFile.name,
            size: result.originalFile.size,
            type: result.originalFile.type,
            uploadedAt: new Date().toISOString(),
            status: 'completed',
            s3_key: result.s3_key,
            unique_filename: result.unique_filename,
            serverResponse: result
          }))
        ];
        
        state.uploads[projectId].progress = 100;
        state.loading = false;
        
        // Store task info for status checking
        if (uploadedFiles.task_id) {
          state.uploads[projectId].task_id = uploadedFiles.task_id;
          state.uploads[projectId].status_check_url = uploadedFiles.status_check_url;
        }
        
        // If there were failures, store error info
        if (failedUploads.length > 0) {
          state.uploads[projectId].error = `${failedUploads.length} file(s) failed to upload`;
        }
      })
      .addCase(uploadProjectImages.rejected, (state, action) => {
        const projectId = action.meta.arg.projectId;
        if (!state.uploads[projectId]) {
          state.uploads[projectId] = { files: [], loading: false, error: null, progress: 0 };
        }
        state.uploads[projectId].loading = false;
        state.uploads[projectId].error = typeof action.payload === 'string' ? action.payload : action.payload?.error || 'Upload failed';
        state.uploads[projectId].progress = 0;
        state.loading = false;
        state.error = typeof action.payload === 'string' ? action.payload : action.payload?.error || 'Upload failed';
      });
  },
});

export const { 
  setUploadProgress, 
  clearProjectUploads, 
  resetUploads, 
  clearProjectError 
} = imageUploadSlice.actions;

export default imageUploadSlice.reducer;