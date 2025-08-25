// store/streetViewSlice.js - Redux slice for street view management
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isActive: false,
  currentImage: null,
  allImages: [],
  viewSettings: {
    yaw: 0,
    pitch: 0,
    zoom: 1,
    isPanoramic: false
  },
  nearbyImages: [],
  isLoading: false,
  error: null
};

const streetViewSlice = createSlice({
  name: 'streetView',
  initialState,
  reducers: {
    // Open street view with specific image
    openStreetView: (state, action) => {
      const { imageData, allImages = [] } = action.payload;
      state.isActive = true;
      state.currentImage = imageData;
      state.allImages = allImages;
      state.error = null;
      state.viewSettings = {
        yaw: 0,
        pitch: 0,
        zoom: 1,
        isPanoramic: false
      };
    },

    // Close street view
    closeStreetView: (state) => {
      state.isActive = false;
      state.currentImage = null;
      state.error = null;
    },

    // Navigate to different image
    navigateToImage: (state, action) => {
      const imageData = action.payload;
      state.currentImage = imageData;
      state.error = null;
      // Reset view settings for new image
      state.viewSettings = {
        yaw: 0,
        pitch: 0,
        zoom: 1,
        isPanoramic: false
      };
    },

    // Update view settings (yaw, pitch, zoom)
    updateViewSettings: (state, action) => {
      state.viewSettings = {
        ...state.viewSettings,
        ...action.payload
      };
    },

    // Set nearby images for navigation
    setNearbyImages: (state, action) => {
      state.nearbyImages = action.payload;
    },

    // Set loading state
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    // Set error state
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    // Set image as panoramic
    setImageType: (state, action) => {
      const { isPanoramic } = action.payload;
      state.viewSettings.isPanoramic = isPanoramic;
    },

    // Update all images list
    updateAllImages: (state, action) => {
      state.allImages = action.payload;
    }
  }
});

// Action creators
export const {
  openStreetView,
  closeStreetView,
  navigateToImage,
  updateViewSettings,
  setNearbyImages,
  setLoading,
  setError,
  setImageType,
  updateAllImages
} = streetViewSlice.actions;

// Selectors
export const selectStreetView = (state) => state.streetView;
export const selectIsStreetViewActive = (state) => state.streetView.isActive;
export const selectCurrentStreetImage = (state) => state.streetView.currentImage;
export const selectAllStreetImages = (state) => state.streetView.allImages;
export const selectStreetViewSettings = (state) => state.streetView.viewSettings;
export const selectNearbyImages = (state) => state.streetView.nearbyImages;
export const selectStreetViewError = (state) => state.streetView.error;
export const selectStreetViewLoading = (state) => state.streetView.isLoading;

// Thunks for async operations
export const loadStreetImage = (imageData, allImages = []) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    dispatch(openStreetView({ imageData, allImages }));
    
    // Calculate nearby images
    const currentLat = imageData.latitude;
    const currentLng = imageData.longitude;
    
    const nearby = allImages
      .filter(img => img.id !== imageData.id)
      .map(img => ({
        ...img,
        distance: calculateDistance(currentLat, currentLng, img.latitude, img.longitude),
        bearing: calculateBearing(currentLat, currentLng, img.latitude, img.longitude)
      }))
      .filter(img => img.distance < 0.002) // Within ~200m
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);
    
    dispatch(setNearbyImages(nearby));
    dispatch(setLoading(false));
  } catch (error) {
    dispatch(setError(error.message));
  }
};

// Helper functions
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
};

export default streetViewSlice.reducer;