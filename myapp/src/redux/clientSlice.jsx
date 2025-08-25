// clientSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';

// Async thunk to fetch clients
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { getState, rejectWithValue }) => {
    // console.log('Current state:', getState());
    try {
      const token = getState().auth?.accessToken; // Get the token from the state
      // console.log("Token", token);
      const response = await axiosInstance.get('/customers/',{
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // return response.data; // Return the full response client data
    
    //* Filter the response to only include the client ID and name
    const filteredClients = response.data.map(client => ({
        id: client.id,
        name: client.name,
      }));
    return filteredClients;

    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        dispatch(logout()); // Logout user if token is invalid
      }
      return rejectWithValue(error.response?.data);
    }
  }
);

// Async thunk to add a new client
export const addClient = createAsyncThunk(
  'clients/addClient',
  async (clientData, { getState, rejectWithValue }) => {
    // console.log('Current state Add Client:', getState());
    try {
      const token = getState().auth?.accessToken || localStorage.getItem('access_token'); // Get the token from the state
      if (!token) throw new Error('No access token found');
      // console.log("Token", token);
      const response = await axiosInstance.post('/customers/', clientData,{
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }); // Use axiosInstance to make a POST request
      // console.log("New Client", response.data);
      return response.data; // Return the full response client data
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        dispatch(logout()); // Logout user if token is invalid
      }
      return rejectWithValue(error.response.data|| 'Something went wrong!' ); // Pass API errors to the Redux state
    }
  }
);

const clientSlice = createSlice({
  name: 'clients',
  initialState: {
    clients: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Handling fetchClients
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.clients = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Handling addClient
      .addCase(addClient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addClient.fulfilled, (state, action) => {
        state.loading = false;
        // Optionally, you can directly push the new client:
        state.clients.push(action.payload);
      })
      .addCase(addClient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        console.log("Error", action.error.message);
      });
  },
});

export default clientSlice.reducer;
