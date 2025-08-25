import { createAsyncThunk } from '@reduxjs/toolkit';// FIXED: Fetch company profile async thunk
import { fetchCompany, updateCompany } from '../../api/services/CompanyService';


export const fetchCompanyAsync = createAsyncThunk(
  'company/fetchCompany',
  async (companyData = {}, { rejectWithValue }) => {
    try {
      console.log('🔄 FetchCompany: Making API call...');
      const response = await fetchCompany(companyData);
      console.log('✅ FetchCompany: API response:', response);
      return response;
    } catch (error) {
      console.error('❌ FetchCompany API Error:', error);
     
      if (error.response?.data) {
        return rejectWithValue({
          message: error.response.data.detail || error.response.data.message || 'Failed to fetch company profile',
          status: error.response.status,
          data: error.response.data
        });
      } else if (error.message) {
        return rejectWithValue({
          message: error.message,
          status: null
        });
      } else {
        return rejectWithValue({
          message: 'Failed to fetch company profile',
          status: null
        });
      }
    }
  }
);

// FIXED: Update company profile async thunk with better error handling
export const updateCompanyAsync = createAsyncThunk(
  'company/updateCompany',
  async (companyData, { rejectWithValue, getState }) => {
    try {
      console.log('🔄 UpdateCompany: Making API call...');
      console.log('📤 UpdateCompany: Sending data:', companyData);
     
      const response = await updateCompany(companyData);
      console.log('✅ UpdateCompany: API response:', response);
     
      // FIXED: Return structured response for better handling
      return {
        message: response.message || response.msg || 'Company profile updated successfully!',
        company: response.company || response.data || response,
        updatedFields: companyData // Keep track of what was updated
      };
     
    } catch (error) {
      console.error('❌ UpdateCompany API Error:', error);
     
      if (error.response?.data) {
        return rejectWithValue({
          message: error.response.data.detail || error.response.data.message || 'Failed to update company profile',
          status: error.response.status,
          data: error.response.data
        });
      } else if (error.message) {
        return rejectWithValue({
          message: error.message,
          status: null
        });
      } else {
        return rejectWithValue({
          message: 'Failed to update company profile',
          status: null
        });
      }
    }
  }
);

// FIXED: Alternative thunk that updates and then refreshes with better error handling
export const updateCompanyWithRefreshAsync = createAsyncThunk(
  'company/updateCompanyWithRefresh',
  async (companyData, { rejectWithValue, dispatch, getState }) => {
    try {
      // Step 1: Update the company
      console.log('🔄 UpdateWithRefresh: Step 1 - Updating company...');
      const updateResponse = await updateCompany(companyData);
      console.log('✅ UpdateWithRefresh: Update successful:', updateResponse);
     
      // Step 2: Fetch fresh data
      console.log('🔄 UpdateWithRefresh: Step 2 - Fetching fresh data...');
      
      try {
        const fetchResult = await dispatch(fetchCompanyAsync({}));
        
        if (fetchResult.type.endsWith('/fulfilled')) {
          console.log('✅ UpdateWithRefresh: Fresh data fetched successfully');
          return {
            message: updateResponse.message || updateResponse.msg || 'Company profile updated successfully!',
            refreshed: true,
            company: fetchResult.payload?.company || fetchResult.payload?.data || fetchResult.payload
          };
        } else {
          // If fetch fails, still return success but indicate refresh failed
          console.warn('⚠️ UpdateWithRefresh: Fetch failed, but update was successful');
          return {
            message: updateResponse.message || updateResponse.msg || 'Company profile updated successfully!',
            refreshed: false,
            company: updateResponse.company || updateResponse.data || updateResponse
          };
        }
      } catch (fetchError) {
        console.warn('⚠️ UpdateWithRefresh: Fetch error after successful update:', fetchError);
        return {
          message: updateResponse.message || updateResponse.msg || 'Company profile updated successfully!',
          refreshed: false,
          company: updateResponse.company || updateResponse.data || updateResponse
        };
      }
     
    } catch (error) {
      console.error('❌ UpdateWithRefresh API Error:', error);
     
      if (error.response?.data) {
        return rejectWithValue({
          message: error.response.data.detail || error.response.data.message || 'Failed to update company profile',
          status: error.response.status,
          data: error.response.data
        });
      } else if (error.message) {
        return rejectWithValue({
          message: error.message,
          status: null
        });
      } else {
        return rejectWithValue({
          message: 'Failed to update company profile',
          status: null
        });
      }
    }
  }
);

// ADDITIONAL: Thunk for updating single field with optimistic updates
export const updateCompanyFieldAsync = createAsyncThunk(
  'company/updateCompanyField',
  async ({ field, value }, { rejectWithValue, getState, dispatch }) => {
    try {
      // Get current profile state
      const currentProfile = getState().company.profile;
      
      // Prepare update data with only the changed field
      const updateData = { [field]: value };
      
      console.log(`🔄 UpdateField: Updating ${field} to:`, value);
      
      const response = await updateCompany(updateData);
      console.log('✅ UpdateField: API response:', response);
      
      return {
        message: response.message || response.msg || `${field} updated successfully!`,
        field,
        value,
        company: response.company || response.data || response
      };
      
    } catch (error) {
      console.error(`❌ UpdateField: Failed to update ${field}:`, error);
      
      if (error.response?.data) {
        return rejectWithValue({
          message: error.response.data.detail || error.response.data.message || `Failed to update ${field}`,
          status: error.response.status,
          field,
          data: error.response.data
        });
      } else if (error.message) {
        return rejectWithValue({
          message: error.message,
          status: null,
          field
        });
      } else {
        return rejectWithValue({
          message: `Failed to update ${field}`,
          status: null,
          field
        });
      }
    }
  }
);