import { createClient, fetchClient, fetchClientDetails, updateClient } from "../../api/services/ClientService";
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';



// 2. FIXED ASYNC THUNKS - Better error handling and data validation
export const createClientAsync = createAsyncThunk(
  'clients/createClient',
  async (clientData, { dispatch, rejectWithValue }) => {
    try {
      console.log('🔄 CreateClient: Making API call with data:', clientData);
      
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
      
      console.log('🔄 CreateClient: Sending API data:', apiData);
      const response = await createClient(apiData);
      console.log('✅ CreateClient: API response:', response);
      
      return response;
    } catch (error) {
      console.error('❌ CreateClient API Error:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        return rejectWithValue({
          message: errorData.detail || errorData.message || 'Failed to create client',
          errors: errorData.errors || {}
        });
      }
      
      return rejectWithValue({
        message: error.message || 'Failed to create client'
      });
    }
  }
);

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}



// UPDATED UPDATE CLIENT ASYNC THUNK
export const updateClientAsync = createAsyncThunk(
  'clients/updateClient',
  async ({ id, clientData }, { dispatch, rejectWithValue }) => {
    try {
      console.log('🔄 UpdateClient: Making API call for client:', id, 'with data:', clientData);
      
      if (!id) {
        return rejectWithValue({
          message: 'Client ID is required for update'
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
      
      console.log('🔄 UpdateClient: Sending API data:', apiData);
      const response = await updateClient(id, apiData);
      console.log('✅ UpdateClient: API response:', response);
      
      return response;
    } catch (error) {
      console.error('❌ UpdateClient API Error:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        return rejectWithValue({
          message: errorData.detail || errorData.message || 'Failed to update client',
          errors: errorData.errors || {}
        });
      }
      
      return rejectWithValue({
        message: error.message || 'Failed to update client'
      });
    }
  }
);






export const fetchClientsAsync = createAsyncThunk(
  'clients/fetchClients',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 FetchClients: Making API call...');
      const response = await fetchClient();
      console.log('✅ FetchClients: API response:', response);
      return response;
    } catch (error) {
      console.error('❌ FetchClients API Error:', error);
      
      if (error.response?.data) {
        return rejectWithValue(
          error.response.data.detail ||
          error.response.data.message ||
          error.response.data
        );
      } else if (error.message) {
        return rejectWithValue(error.message);
      } else {
        return rejectWithValue('Failed to fetch clients');
      }
    }
  }
);

export const fetchClientDetailsAsync = createAsyncThunk(
  'clients/fetchClientDetails',
  async (clientId, { rejectWithValue }) => {
    try {
      console.log('🔄 FetchClientDetails: Making API call for client:', clientId);
      const response = await fetchClientDetails(clientId);
      console.log('✅ FetchClientDetails: API response:', response);
      return response;
    } catch (error) {
      console.error('❌ FetchClientDetails API Error:', error);
      
      if (error.response?.data) {
        return rejectWithValue(
          error.response.data.detail ||
          error.response.data.message ||
          error.response.data
        );
      } else if (error.message) {
        return rejectWithValue(error.message);
      } else {
        return rejectWithValue('Failed to fetch client details');
      }
    }
  }
);
const clientSlice = createSlice({
  name: 'clients',
  initialState: {
    clients: [],
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
      status: 'all',
      clientType: 'all'
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

    toggleClientStatus: (state, action) => {
      const client = state.clients.find(c => c.id === action.payload);
      if (client) {
        client.status = !client.status;
        state.successMessage = `Client status updated to ${client.status ? 'Active' : 'Inactive'}!`;
      }
    },
    updateClientType: (state, action) => {
      const { id, clientType } = action.payload;
      const client = state.clients.find(c => c.id === id);
      if (client) {
        client.client_type = clientType;
        client.clientType = clientType;
        state.successMessage = 'Client type updated successfully!';
      }
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Fetch Clients
      .addCase(fetchClientsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientsAsync.fulfilled, (state, action) => {
        state.loading = false;
        // state.clients = action.payload;
        state.clients = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchClientsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch clients';
      })
      
      // Create Client
      .addCase(createClientAsync.pending, (state) => {
        state.creating = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createClientAsync.fulfilled, (state, action) => {
        state.creating = false;
        
        // Normalize the response data
        let clientData = action.payload;
        if (action.payload.client) {
          clientData = action.payload.client;
        } else if (action.payload.data) {
          clientData = action.payload.data;
        }

        const newClient = {
          ...clientData,
          id: clientData.id || Date.now(),
          status: clientData.status !== undefined ? clientData.status : true,
          company_name: clientData.company_name || clientData.companyName,
          primary_contact: clientData.primary_contact || clientData.primaryContact,
          client_type: clientData.client_type || clientData.clientType,
        };
        
        // Add to clients array if not already present
        const existingIndex = state.clients.findIndex(c => c.id === newClient.id);
        if (existingIndex === -1) {
          state.clients.push(newClient);
        } else {
          state.clients[existingIndex] = newClient;
        }
        
        state.successMessage = action.payload.message || 'Client created successfully!';
      })
      .addCase(createClientAsync.rejected, (state, action) => {
        state.creating = false;
        console.error('Create client error:', action.payload);
        
        // Better error handling
        if (action.payload && typeof action.payload === 'object') {
          if (action.payload.errors) {
            // Handle validation errors
            const errorMessages = [];
            Object.keys(action.payload.errors).forEach(field => {
              const fieldErrors = action.payload.errors[field];
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
            state.error = 'Failed to create client. Please check your input data.';
          }
        } else if (typeof action.payload === 'string') {
          state.error = action.payload;
        } else {
          state.error = 'Failed to create client. Please try again.';
        }
      })
      
      // Update Client
      .addCase(updateClientAsync.pending, (state) => {
        state.updating = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateClientAsync.fulfilled, (state, action) => {
        state.updating = false;
        
        // Normalize the response data
        let updatedClient = action.payload;
        if (action.payload.client) {
          updatedClient = action.payload.client;
        } else if (action.payload.data) {
          updatedClient = action.payload.data;
        }
        
        const index = state.clients.findIndex(client => client.id === updatedClient.id);
        if (index !== -1) {
          state.clients[index] = {
            ...state.clients[index],
            ...updatedClient,
            company_name: updatedClient.company_name || updatedClient.companyName,
            primary_contact: updatedClient.primary_contact || updatedClient.primaryContact,
            client_type: updatedClient.client_type || updatedClient.clientType,
          };
        }
        
        state.successMessage = action.payload.message || 'Client updated successfully!';
      })
      .addCase(updateClientAsync.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload || 'Failed to update client';
      })



      // Fetch Client Details
      .addCase(fetchClientDetailsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientDetailsAsync.fulfilled, (state, action) => {
        state.loading = false;
      })
      .addCase(fetchClientDetailsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch client details';
      });
  }
});




// Export actions and reducer
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
  toggleClientStatus,
  updateClientType
} = clientSlice.actions;

export default clientSlice.reducer;

