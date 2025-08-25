// streetSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchStreetImageById, fetchStreetImages } from '../api/services/Mapservice';


// Thunk to fetch street image by ID
export const getStreetImageById = createAsyncThunk(
  'street/getStreetImageById',
  async ({ projectId, imageId }, { rejectWithValue }) => {
    console.log("👉 Thunk getStreetImageById CALLED with:", { projectId, imageId });

    const result = await fetchStreetImageById(projectId, imageId);

    console.log("👉 Thunk getStreetImageById RESULT:", result);

    if (result.success) {
      return result.data;
    } else {
      return rejectWithValue(result.error);
    }
  }
);
// Thunk to fetch street images
export const getStreetImages = createAsyncThunk(
  'street/getStreetImages',
  async ({ projectId, params = {} }, { rejectWithValue }) => {
    console.log("Thunk called with:", projectId, params);
    const result = await fetchStreetImages(projectId, params);
    console.log("Thunk result:", result);
    if (result.success) {
      return result.data;
    } else {
      return rejectWithValue(result.error);
    }
  }
);
// Slice
const streetSlice = createSlice({
  name: 'street',
  initialState: {
    items: [],
    loading: false,
    error: null,
    count: 0,
    currentImage: null,
    currentImageLoading: false,
    currentImageError: null,
    visibility: false,
  },
  reducers: {
    clearStreetData: (state) => {
      console.log("🧹 Clearing street data");
      state.items = [];
      state.loading = false;
      state.error = null;
      state.count = 0;
      state.currentImage = null;
      state.currentImageLoading = false;
      state.currentImageError = null;
    },
    setStreetImageVisibility: (state, action) => {
      console.log("👁️ Setting visibility:", action.payload);
      state.visibility = action.payload;
    },
    setCurrentImage: (state, action) => {
      console.log("🖼️ Setting currentImage manually:", action.payload);
      state.currentImage = action.payload;
    },
    clearCurrentImage: (state) => {
      console.log("🧹 Clearing currentImage");
      state.currentImage = null;
      state.currentImageError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getStreetImages (list)
      .addCase(getStreetImages.pending, (state) => {
        console.log("📡 getStreetImages.pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(getStreetImages.fulfilled, (state, action) => {
        console.log("✅ getStreetImages.fulfilled with:", action.payload);
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : [action.payload];
        state.count = state.items.length;
      })
      .addCase(getStreetImages.rejected, (state, action) => {
        console.log("❌ getStreetImages.rejected with:", action.payload);
        state.loading = false;
        state.error = action.payload || 'Failed to fetch street images';
      })

      // getStreetImageById (single)
      .addCase(getStreetImageById.pending, (state) => {
        console.log("📡 getStreetImageById.pending");
        state.currentImageLoading = true;
        state.currentImageError = null;
      })
      .addCase(getStreetImageById.fulfilled, (state, action) => {
        console.log("✅ getStreetImageById.fulfilled with:", action.payload);
        state.currentImageLoading = false;
        state.currentImage = action.payload;
      })
      .addCase(getStreetImageById.rejected, (state, action) => {
        console.log("❌ getStreetImageById.rejected with:", action.payload);
        state.currentImageLoading = false;
        state.currentImageError = action.payload || 'Failed to fetch street image';
      });
  },
});

export const {
  clearStreetData,
  setStreetImageVisibility,
  setCurrentImage,
  clearCurrentImage,
} = streetSlice.actions;

export default streetSlice.reducer;