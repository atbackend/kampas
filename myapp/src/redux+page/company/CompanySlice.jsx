import { createSlice,createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchCompanyAsync,
  updateCompanyAsync,
  updateCompanyWithRefreshAsync
} from './CompanyThunk';

const companySlice = createSlice({
  name: 'company',
  initialState: {
    profile: null,
    loading: false,
    updating: false,
    error: null,
    successMessage: null,
  },
  reducers: {
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
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    updateProfileField: (state, action) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
  },
 
  extraReducers: (builder) => {
    builder
      // Fetch Company Profile
      .addCase(fetchCompanyAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyAsync.fulfilled, (state, action) => {
        state.loading = false;
        console.log('🏪 Slice: Processing fetch response:', action.payload);
        
        let profileData = null;
        
        if (action.payload?.company) {
          profileData = action.payload.company;
        } else if (action.payload?.data?.company) {
          profileData = action.payload.data.company;
        } else if (action.payload?.data) {
          profileData = action.payload.data;
        } else if (action.payload && typeof action.payload === 'object') {
          profileData = action.payload;
        }
        
        console.log('🏪 Slice: Setting profile to:', profileData);
        state.profile = profileData;
      })
      .addCase(fetchCompanyAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch company profile';
        console.error('🏪 Slice: Fetch failed:', action.payload);
      })
     
      // Update Company Profile WITH Refresh
      .addCase(updateCompanyWithRefreshAsync.pending, (state) => {
        state.updating = true;
        state.error = null;
        state.successMessage = null;
        console.log('🏪 Slice: Update with refresh pending...');
      })
      .addCase(updateCompanyWithRefreshAsync.fulfilled, (state, action) => {
        state.updating = false;
        console.log('🏪 Slice: Processing update with refresh response:', action.payload);
        
        // Extract the updated profile data and message
        let updatedProfile = null;
        let message = 'Company profile updated successfully!';
        
        if (action.payload?.company) {
          updatedProfile = action.payload.company;
        } else if (action.payload?.data?.company) {
          updatedProfile = action.payload.data.company;
        } else if (action.payload?.data) {
          updatedProfile = action.payload.data;
        }
        
        // Extract success message
        if (action.payload?.message) {
          message = action.payload.message;
        }
        
        // Update profile with fresh data
        if (updatedProfile && typeof updatedProfile === 'object') {
          console.log('🏪 Slice: Setting updated profile data');
          state.profile = updatedProfile;
        } else {
          console.log('🏪 Slice: No profile data in response, keeping current profile');
        }
        
        state.successMessage = message;
        console.log('🏪 Slice: Update with refresh completed. New profile:', state.profile);
      })
      .addCase(updateCompanyWithRefreshAsync.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload?.message || 'Failed to update company profile';
        console.error('🏪 Slice: Update with refresh failed:', action.payload);
      })

      // OPTIONAL: Keep the regular update handler as fallback
      .addCase(updateCompanyAsync.pending, (state) => {
        state.updating = true;
        state.error = null;
        state.successMessage = null;
        console.log('🏪 Slice: Regular update pending...');
      })
      .addCase(updateCompanyAsync.fulfilled, (state, action) => {
        state.updating = false;
        console.log('🏪 Slice: Processing regular update response:', action.payload);
        
        // Extract message and updated data
        let message = action.payload?.message || 'Company profile updated successfully!';
        let updatedData = action.payload?.company || action.payload?.updatedFields;
        
        // Merge updated data with existing profile
        if (updatedData && typeof updatedData === 'object' && state.profile) {
          console.log('🏪 Slice: Merging updated data with existing profile');
          state.profile = { ...state.profile, ...updatedData };
        }
        
        state.successMessage = message;
        console.log('🏪 Slice: Regular update completed. Updated profile:', state.profile);
      })
      .addCase(updateCompanyAsync.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload?.message || 'Failed to update company profile';
        console.error('🏪 Slice: Regular update failed:', action.payload);
      });
  }
});

export const {
  clearStatus,
  clearError,
  setError,
  setSuccessMessage,
  setProfile,
  updateProfileField,
} = companySlice.actions;

export default companySlice.reducer;