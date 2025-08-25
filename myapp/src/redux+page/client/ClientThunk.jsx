import { createAsyncThunk } from '@reduxjs/toolkit';
import { createClient } from '../../api/services/ClientService';

export const fetchClientsAsync = createAsyncThunk(
  'clients/fetchClients',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 FetchClients: Making API call...');
      const response = await fetchClients();
      console.log('✅ FetchClients: API response:', response);
      return response;
    } catch (error) {
      console.error('❌ FetchClients API Error:', error);
      
      if (error.status === 401) {
        // Handle auth error
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      
      return rejectWithValue(error.message || 'Failed to fetch clients');
    }
  }
);

// Enhanced createClientAsync with better error logging
export const createClientAsync = createAsyncThunk(
  'clients/createClient',
  async (clientData, { dispatch, rejectWithValue }) => {
    try {
      console.log('🔄 CreateClient: Starting with form data:', clientData);
      
      // FIXED: Map form fields to API expected field names for CREATE
      const apiData = {
        client_company_name: clientData.company_name,
        email: clientData.email,
        contact_person: clientData.primary_contact,
        primary_contact_number: clientData.phone || '',
        address: clientData.address || '',
        city: clientData.city || '',
        state: clientData.state || '',
        pin: clientData.pin || '',
        country: clientData.country || '',
        // Ensure client_type is properly capitalized for API
        client_type: capitalizeFirstLetter(clientData.client_type || 'individual'),
        description: clientData.description || '',
        // FIXED: Properly handle status field - ensure boolean conversion
        status: Boolean(clientData.status),
        is_active: Boolean(clientData.status), // Include both fields for compatibility
        owner_company: 'ansimap'
      };
      
      console.log('🔄 CreateClient: Mapped API data:', apiData);
      
      // Validate required fields before API call
      if (!apiData.client_company_name) {
        console.error('❌ CreateClient: Missing company name');
        return rejectWithValue({
          message: 'Company name is required',
          errors: { client_company_name: ['Company name is required'] }
        });
      }
      
      if (!apiData.email) {
        console.error('❌ CreateClient: Missing email');
        return rejectWithValue({
          message: 'Email is required',
          errors: { email: ['Email is required'] }
        });
      }
      
      if (!apiData.contact_person) {
        console.error('❌ CreateClient: Missing contact person');
        return rejectWithValue({
          message: 'Primary contact is required',
          errors: { contact_person: ['Primary contact is required'] }
        });
      }
      
      console.log('🔄 CreateClient: Making API call...');
      const response = await createClient(apiData);
      console.log('✅ CreateClient: API response received:', response);
      
      return response;
    } catch (error) {
      console.error('❌ CreateClient API Error Details:');
      console.error('Error object:', error);
      console.error('Error status:', error.status);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error message:', error.message);
      
      // Handle different error types
      if (error.response) {
        // Server responded with error status
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        console.error(`❌ Server responded with status ${statusCode}:`, errorData);
        
        if (statusCode === 400) {
          // Validation errors
          return rejectWithValue({
            message: errorData.detail || errorData.message || 'Validation failed',
            errors: errorData.errors || errorData.non_field_errors || {}
          });
        } else if (statusCode === 401) {
          // Authentication error
          return rejectWithValue({
            message: 'Authentication failed. Please login again.',
            errors: {}
          });
        } else if (statusCode === 403) {
          // Permission error
          return rejectWithValue({
            message: 'You do not have permission to create clients.',
            errors: {}
          });
        } else if (statusCode === 500) {
          // Server error
          return rejectWithValue({
            message: 'Server error. Please try again later.',
            errors: {}
          });
        } else {
          // Other HTTP errors
          return rejectWithValue({
            message: errorData.detail || errorData.message || `Server error (${statusCode})`,
            errors: errorData.errors || {}
          });
        }
      } else if (error.request) {
        // Network error - no response received
        console.error('❌ Network error - no response received:', error.request);
        return rejectWithValue({
          message: 'Network error. Please check your internet connection.',
          errors: {}
        });
      } else {
        // Something else happened
        console.error('❌ Unexpected error:', error.message);
        return rejectWithValue({
          message: error.message || 'An unexpected error occurred',
          errors: {}
        });
      }
    }
  }
);

// Also enhance the updateClientAsync with similar error handling
export const updateClientAsync = createAsyncThunk(
  'clients/updateClient',
  async ({ id, clientData }, { dispatch, rejectWithValue }) => {
    try {
      console.log('🔄 UpdateClient: Starting with ID:', id, 'and data:', clientData);
      
      if (!id) {
        return rejectWithValue({
          message: 'Client ID is required for update',
          errors: {}
        });
      }
      
      // FIXED: Map form fields to API expected field names for UPDATE
      const apiData = {
        client_company_name: clientData.company_name,
        email: clientData.email,
        contact_person: clientData.primary_contact,
        primary_contact_number: clientData.phone || '',
        address: clientData.address || '',
        city: clientData.city || '',
        state: clientData.state || '',
        pin: clientData.pin || '',
        country: clientData.country || '',
        // Ensure client_type is properly capitalized for API
        client_type: capitalizeFirstLetter(clientData.client_type || 'individual'),
        description: clientData.description || '',
        // FIXED: Properly handle status field - ensure boolean conversion
        status: Boolean(clientData.status),
        is_active: Boolean(clientData.status), // Include both fields for compatibility
        owner_company: 'ansimap'
      };
      
      console.log('🔄 UpdateClient: Mapped API data:', apiData);
      console.log('🔄 UpdateClient: Making API call...');
      
      const response = await updateClient(id, apiData);
      console.log('✅ UpdateClient: API response received:', response);
      
      return response;
    } catch (error) {
      console.error('❌ UpdateClient API Error Details:');
      console.error('Error object:', error);
      console.error('Error status:', error.status);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error message:', error.message);
      
      // Handle different error types (similar to create)
      if (error.response) {
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        console.error(`❌ Server responded with status ${statusCode}:`, errorData);
        
        return rejectWithValue({
          message: errorData.detail || errorData.message || `Update failed (${statusCode})`,
          errors: errorData.errors || {}
        });
      } else if (error.request) {
        console.error('❌ Network error - no response received:', error.request);
        return rejectWithValue({
          message: 'Network error. Please check your internet connection.',
          errors: {}
        });
      } else {
        console.error('❌ Unexpected error:', error.message);
        return rejectWithValue({
          message: error.message || 'An unexpected error occurred during update',
          errors: {}
        });
      }
    }
  }
);

export const deleteClientAsync = createAsyncThunk(
  'clients/deleteClient',
  async (id, { rejectWithValue }) => {
    try {
      console.log('🗑️ DeleteClient: Making API call for id:', id);
      await deleteClient(id);
      console.log('✅ DeleteClient: Successfully deleted client');
      return id;
    } catch (error) {
      console.error('❌ DeleteClient API Error:', error);
      
      if (error.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      
      return rejectWithValue(error.message || 'Failed to delete client');
    }
  }
);

export const toggleClientStatusAsync = createAsyncThunk(
  'clients/toggleClientStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      console.log('🔄 ToggleClientStatus: Making API call for id:', id, 'status:', status);
      const response = await toggleClientStatus(id, status);
      console.log('✅ ToggleClientStatus: API response:', response);
      return { id, status, ...response };
    } catch (error) {
      console.error('❌ ToggleClientStatus API Error:', error);
      
      if (error.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      
      return rejectWithValue(error.message || 'Failed to toggle client status');
    }
  }
);
