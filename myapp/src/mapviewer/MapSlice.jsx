// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import { fetchVectorLayers, fetchStreetImages, fetchRasterImages } from '../api/services/Mapservice';

// // Async thunk to fetch all layers for a project
// export const fetchAllLayers = createAsyncThunk(
//   'map/fetchAllLayers',
//   async (projectId, { rejectWithValue }) => {
//     try {
//       console.log('Fetching all layers for project:', projectId);
      
//       // Fetch all three types of layers concurrently
//       const [vectorResult, streetResult, rasterResult] = await Promise.allSettled([
//         fetchVectorLayers(projectId),
//         fetchStreetImages(projectId),
//         fetchRasterImages(projectId)
//       ]);

//       // Process vector layers result
//       const vectorLayers = vectorResult.status === 'fulfilled' && vectorResult.value.success 
//         ? vectorResult.value.data || []
//         : [];
      
//       // Process street images result
//       const streetImages = streetResult.status === 'fulfilled' && streetResult.value.success 
//         ? streetResult.value.data || []
//         : [];
      
//       // Process raster layers result
//       const rasterLayers = rasterResult.status === 'fulfilled' && rasterResult.value.success 
//         ? rasterResult.value.data || []
//         : [];

//       console.log('Fetched layers:', { 
//         vector: vectorLayers.length, 
//         street: streetImages.length, 
//         raster: rasterLayers.length 
//       });

//       return {
//         projectId,
//         vectorLayers,
//         streetImages,
//         rasterLayers,
//         totalCount: vectorLayers.length + streetImages.length + rasterLayers.length
//       };
//     } catch (error) {
//       console.error('Error fetching all layers:', error);
//       return rejectWithValue(error.message || 'Failed to fetch layers');
//     }
//   }
// );

// // Async thunk to fetch vector layers only
// export const fetchVectorLayersAsync = createAsyncThunk(
//   'map/fetchVectorLayers',
//   async (projectId, { rejectWithValue }) => {
//     try {
//       console.log('Fetching vector layers for project:', projectId);
//       const result = await fetchVectorLayers(projectId);
//       if (result.success) {
//         return { projectId, layers: result.data || [] };
//       } else {
//         return rejectWithValue(result.error);
//       }
//     } catch (error) {
//       console.error('Error fetching vector layers:', error);
//       return rejectWithValue(error.message || 'Failed to fetch vector layers');
//     }
//   }
// );

// // Async thunk to fetch street images only
// export const fetchStreetImagesAsync = createAsyncThunk(
//   'map/fetchStreetImages',
//   async ({ projectId, params = {} }, { rejectWithValue }) => {
//     try {
//       console.log('Fetching street images for project:', projectId);
//       const result = await fetchStreetImages(projectId, params);
//       if (result.success) {
//         return { projectId, images: result.data || [] };
//       } else {
//         return rejectWithValue(result.error);
//       }
//     } catch (error) {
//       console.error('Error fetching street images:', error);
//       return rejectWithValue(error.message || 'Failed to fetch street images');
//     }
//   }
// );

// // Async thunk to fetch raster layers only
// export const fetchRasterLayersAsync = createAsyncThunk(
//   'map/fetchRasterLayers',
//   async ({ projectId, params = {} }, { rejectWithValue }) => {
//     try {
//       console.log('Fetching raster layers for project:', projectId);
//       const result = await fetchRasterImages(projectId, params);
//       if (result.success) {
//         return { projectId, layers: result.data || [] };
//       } else {
//         return rejectWithValue(result.error);
//       }
//     } catch (error) {
//       console.error('Error fetching raster layers:', error);
//       return rejectWithValue(error.message || 'Failed to fetch raster layers');
//     }
//   }
// );


// const mapSlice = createSlice({
//   name: 'map',
//   initialState: {
//     // Project-specific layer data
//     projectLayers: {}, // { [projectId]: { vectorLayers, streetImages, rasterLayers } }
    
//     // Layer visibility states (permanent)
//     layerVisibility: {}, // { [layerId]: boolean }
    
//     // Temporary visibility states (for street view mode, etc.)
//     temporaryVisibility: {}, // { [layerId]: boolean }
    
//     // Loading states
//     loading: {
//       fetchingAll: false,
//       fetchingVector: false,
//       fetchingStreet: false,
//       fetchingRaster: false,
//       uploading: false
//     },
    
//     // Error states
//     error: {
//       general: null,
//       vector: null,
//       street: null,
//       raster: null,
//       upload: null
//     },
    
//     // Current active project
//     activeProjectId: null,
    
//     // Layer settings (opacity, style, etc.)
//     layerSettings: {}, // { [layerId]: { opacity, style, etc } }
    
//     // Street view mode state
//     streetViewMode: false,
//     streetViewImageData: null,
    
//     // Upload progress
//     uploadProgress: {},  // { [projectId]: { progress, files, loading, error } }
//   },
//   reducers: {
//     // Set active project
//     setActiveProject: (state, action) => {
//       const projectId = action.payload;
//       console.log('Setting active project:', projectId);
//       state.activeProjectId = projectId;
      
//       // Clear temporary visibility when switching projects
//       state.temporaryVisibility = {};
//       state.streetViewMode = false;
//       state.streetViewImageData = null;
//     },
    
//     // Toggle layer visibility (permanent)
//     toggleLayerVisibility: (state, action) => {
//       const { layerId } = action.payload;
//       const currentVisibility = state.layerVisibility[layerId];
//       state.layerVisibility[layerId] = currentVisibility !== false ? false : true;
//       console.log(`Toggled layer ${layerId} visibility to:`, state.layerVisibility[layerId]);
//     },
    
//     // Set layer visibility (permanent)
//     setLayerVisibility: (state, action) => {
//       const { layerId, visibility } = action.payload;
//       state.layerVisibility[layerId] = visibility;
//       console.log(`Set layer ${layerId} visibility to:`, visibility);
//     },
    
//     // Set temporary layer visibility (for street view mode, etc.)
//     setTemporaryLayerVisibility: (state, action) => {
//       const { layerId, visibility } = action.payload;
//       if (visibility) {
//         state.temporaryVisibility[layerId] = visibility;
//         console.log(`Set temporary visibility for layer ${layerId} to:`, visibility);
//       } else {
//         delete state.temporaryVisibility[layerId];
//         console.log(`Cleared temporary visibility for layer ${layerId}`);
//       }
//     },
    
//     // FIXED: Enhanced clearTemporaryVisibility
//     clearTemporaryVisibility: (state) => {
//       console.log('Clearing all temporary visibility');
//       state.temporaryVisibility = {};
//       state.streetViewMode = false;
//       state.streetViewImageData = null;
      
//       // FIXED: Trigger map refresh after clearing temporary visibility
//       state.refreshTrigger = state.refreshTrigger + 1;
//     },
    
//     // FIXED: Enhanced setStreetViewMode
//     setStreetViewMode: (state, action) => {
//       const { active, imageData = null, allImages = [] } = action.payload;
//       state.streetViewMode = active;
//       state.streetViewImageData = imageData;
      
//       if (active) {
//         // Hide other layers when entering street view
//         state.temporaryVisibility = {};
//         // You can add logic to hide specific layers if needed
//       } else {
//         // FIXED: Clear temporary visibility when exiting street view
//         state.temporaryVisibility = {};
//       }
      
//       // FIXED: Trigger map refresh
//       state.refreshTrigger = state.refreshTrigger + 1;
      
//       console.log('Street view mode:', active, imageData ? 'with image data' : '');
//     },

//     // NEW: Trigger map refresh
//     triggerMapRefresh: (state) => {
//       state.refreshTrigger = state.refreshTrigger + 1;
//     },
    
//     // Update layer settings (opacity, style, etc.)
//     updateLayerSettings: (state, action) => {
//       const { layerId, settings } = action.payload;
//       state.layerSettings[layerId] = {
//         ...state.layerSettings[layerId],
//         ...settings
//       };
//       console.log(`Updated settings for layer ${layerId}:`, settings);
//     },
    
    
//    // FIXED: Enhanced setDefaultLayerVisibility with delayed execution
//     setDefaultLayerVisibility: (state, action) => {
//       const { projectId, delay = false } = action.payload;
//       const projectLayers = state.projectLayers[projectId];
      
//       if (!projectLayers) return;
      
//       console.log('Setting default layer visibility for project:', projectId, delay ? '(delayed)' : '(immediate)');
      
//       // Vector layers: visible by default
//       if (projectLayers.vectorLayers) {
//         projectLayers.vectorLayers.forEach(layer => {
//           if (state.layerVisibility[layer.id] === undefined) {
//             state.layerVisibility[layer.id] = true;
//             console.log(`Set vector layer ${layer.id} to visible by default`);
//           }
//         });
//       }
      
//       // Raster layers: hidden by default
//       if (projectLayers.rasterLayers) {
//         projectLayers.rasterLayers.forEach(layer => {
//           if (state.layerVisibility[layer.id] === undefined) {
//             state.layerVisibility[layer.id] = false;
//             console.log(`Set raster layer ${layer.id} to hidden by default`);
//           }
//         });
//       }
      
//       // Street images: hidden by default
//       if (projectLayers.streetImages && projectLayers.streetImages.length > 0) {
//         const streetImagesId = `street_images_${projectId}`;
//         const streetImagesWMSId = `street_images_wms_${projectId}`;
//         const streetConnectionsId = `street_connections_${projectId}`;
        
//         if (state.layerVisibility[streetImagesId] === undefined) {
//           state.layerVisibility[streetImagesId] = false;
//           console.log(`Set street images layer ${streetImagesId} to hidden by default`);
//         }
//         if (state.layerVisibility[streetImagesWMSId] === undefined) {
//           state.layerVisibility[streetImagesWMSId] = false;
//           console.log(`Set street images WMS layer ${streetImagesWMSId} to hidden by default`);
//         }
//         if (state.layerVisibility[streetConnectionsId] === undefined) {
//           state.layerVisibility[streetConnectionsId] = false;
//           console.log(`Set street connections layer ${streetConnectionsId} to hidden by default`);
//         }
//       }
      
//       // Terrain layer: hidden by default
//       if (state.layerVisibility['terrain'] === undefined) {
//         state.layerVisibility['terrain'] = false;
//         console.log('Set terrain layer to hidden by default');
//       }
//     },


//     // Clear project layers
//     clearProjectLayers: (state, action) => {
//       const projectId = action.payload;
//       if (state.projectLayers[projectId]) {
//         delete state.projectLayers[projectId];
//         console.log('Cleared layers for project:', projectId);
//       }
      
//       // Clear related visibility settings
//       Object.keys(state.layerVisibility).forEach(layerId => {
//         if (layerId.includes(projectId)) {
//           delete state.layerVisibility[layerId];
//         }
//       });
      
//       // Clear related layer settings
//       Object.keys(state.layerSettings).forEach(layerId => {
//         if (layerId.includes(projectId)) {
//           delete state.layerSettings[layerId];
//         }
//       });
      
//       // Clear temporary visibility
//       state.temporaryVisibility = {};
//       state.streetViewMode = false;
//       state.streetViewImageData = null;
//     },
    
//     // Clear all layers
//     clearAllLayers: (state) => {
//       state.projectLayers = {};
//       state.layerVisibility = {};
//       state.temporaryVisibility = {};
//       state.layerSettings = {};
//       state.activeProjectId = null;
//       state.streetViewMode = false;
//       state.streetViewImageData = null;
//       console.log('Cleared all layers and state');
//     },
    
//     // Clear errors
//     clearErrors: (state) => {
//       state.error = {
//         general: null,
//         vector: null,
//         street: null,
//         raster: null,
//         upload: null
//       };
//       console.log('Cleared all errors');
//     },
    
//     // Clear specific error
//     clearError: (state, action) => {
//       const errorType = action.payload;
//       if (state.error[errorType] !== undefined) {
//         state.error[errorType] = null;
//         console.log(`Cleared ${errorType} error`);
//       }
//     },

//     // NEW: Clear project error (missing export)
//     clearProjectError: (state, action) => {
//       const projectId = action.payload;
//       if (state.uploadProgress[projectId]) {
//         state.uploadProgress[projectId].error = null;
//         console.log(`Cleared error for project ${projectId}`);
//       }
//     },

//     // NEW: Set upload progress (missing export)
//     setUploadProgress: (state, action) => {
//       const { projectId, progress } = action.payload;
//       if (!state.uploadProgress[projectId]) {
//         state.uploadProgress[projectId] = { progress: 0, files: [], loading: false, error: null };
//       }
//       state.uploadProgress[projectId].progress = progress;
//       console.log(`Set upload progress for project ${projectId}: ${progress}%`);
//     }
//   },
//   extraReducers: (builder) => {
//     builder
//       // Fetch All Layers
//       .addCase(fetchAllLayers.pending, (state) => {
//         state.loading.fetchingAll = true;
//         state.error.general = null;
//         console.log('Started fetching all layers');
//       })

//       .addCase(fetchAllLayers.fulfilled, (state, action) => {
//         state.loading.fetchingAll = false;
//         const { projectId, vectorLayers, streetImages, rasterLayers, totalCount } = action.payload;
        
//         console.log(`Successfully fetched ${totalCount} layers for project ${projectId}`);
        
//         state.projectLayers[projectId] = {
//           vectorLayers: vectorLayers || [],
//           streetImages: streetImages || [],
//           rasterLayers: rasterLayers || []
//         };
        
//         // FIXED: Don't set default visibility immediately - let the component handle it
//         // This prevents race conditions with map initialization
//         console.log('Layers stored, default visibility will be set by component');
//       })

//       .addCase(fetchAllLayers.rejected, (state, action) => {
//         state.loading.fetchingAll = false;
//         state.error.general = action.payload || action.error.message;
//         console.error('Failed to fetch all layers:', state.error.general);
//       })
      
//       // Fetch Vector Layers
//       .addCase(fetchVectorLayersAsync.pending, (state) => {
//         state.loading.fetchingVector = true;
//         state.error.vector = null;
//         console.log('Started fetching vector layers');
//       })
//       .addCase(fetchVectorLayersAsync.fulfilled, (state, action) => {
//         state.loading.fetchingVector = false;
//         const { projectId, layers } = action.payload;
        
//         console.log(`Successfully fetched ${layers.length} vector layers for project ${projectId}`);
        
//         if (!state.projectLayers[projectId]) {
//           state.projectLayers[projectId] = { vectorLayers: [], streetImages: [], rasterLayers: [] };
//         }
//         state.projectLayers[projectId].vectorLayers = layers;
        
//         // Set default visibility for vector layers (visible by default)
//         layers.forEach(layer => {
//           if (state.layerVisibility[layer.id] === undefined) {
//             state.layerVisibility[layer.id] = true;
//           }
//         });
//       })
//       .addCase(fetchVectorLayersAsync.rejected, (state, action) => {
//         state.loading.fetchingVector = false;
//         state.error.vector = action.payload || action.error.message;
//         console.error('Failed to fetch vector layers:', state.error.vector);
//       })
      
//       // Fetch Street Images
//       .addCase(fetchStreetImagesAsync.pending, (state) => {
//         state.loading.fetchingStreet = true;
//         state.error.street = null;
//         console.log('Started fetching street images');
//       })
//       .addCase(fetchStreetImagesAsync.fulfilled, (state, action) => {
//         state.loading.fetchingStreet = false;
//         const { projectId, images } = action.payload;
        
//         console.log(`Successfully fetched ${images.length} street images for project ${projectId}`);
        
//         if (!state.projectLayers[projectId]) {
//           state.projectLayers[projectId] = { vectorLayers: [], streetImages: [], rasterLayers: [] };
//         }
//         state.projectLayers[projectId].streetImages = images;
        
//         // Set default visibility for street images (hidden by default)
//         if (images.length > 0) {
//           const streetImagesId = `street_images_${projectId}`;
//           const streetImagesWMSId = `street_images_wms_${projectId}`;
          
//           if (state.layerVisibility[streetImagesId] === undefined) {
//             state.layerVisibility[streetImagesId] = false;
//           }
//           if (state.layerVisibility[streetImagesWMSId] === undefined) {
//             state.layerVisibility[streetImagesWMSId] = false;
//           }
//         }
//       })
//       .addCase(fetchStreetImagesAsync.rejected, (state, action) => {
//         state.loading.fetchingStreet = false;
//         state.error.street = action.payload || action.error.message;
//         console.error('Failed to fetch street images:', state.error.street);
//       })
      
//       // Fetch Raster Layers
//       .addCase(fetchRasterLayersAsync.pending, (state) => {
//         state.loading.fetchingRaster = true;
//         state.error.raster = null;
//         console.log('Started fetching raster layers');
//       })
//       .addCase(fetchRasterLayersAsync.fulfilled, (state, action) => {
//         state.loading.fetchingRaster = false;
//         const { projectId, layers } = action.payload;
        
//         console.log(`Successfully fetched ${layers.length} raster layers for project ${projectId}`);
        
//         if (!state.projectLayers[projectId]) {
//           state.projectLayers[projectId] = { vectorLayers: [], streetImages: [], rasterLayers: [] };
//         }
//         state.projectLayers[projectId].rasterLayers = layers;
        
//         // Set default visibility for raster layers (hidden by default)
//         layers.forEach(layer => {
//           if (state.layerVisibility[layer.id] === undefined) {
//             state.layerVisibility[layer.id] = false;
//           }
//         });
//       })
//       .addCase(fetchRasterLayersAsync.rejected, (state, action) => {
//         state.loading.fetchingRaster = false;
//         state.error.raster = action.payload || action.error.message;
//         console.error('Failed to fetch raster layers:', state.error.raster);
//       })

    
//   },
// });

// export const {
//   setActiveProject,
//   toggleLayerVisibility,
//   setLayerVisibility,
//   setTemporaryLayerVisibility,
//   clearTemporaryVisibility,
//   setStreetViewMode,
//   updateLayerSettings,
//   setDefaultLayerVisibility,
//   clearProjectLayers,
//   clearAllLayers,
//   clearErrors,
//   clearError,
//   clearProjectError,  // ADDED: This was missing
//   setUploadProgress ,   // ADDED: This was missing
//     triggerMapRefresh  // NEW: Add this export
// } = mapSlice.actions;

// // Selectors
// export const selectProjectLayers = (state, projectId) => 
//   state.map.projectLayers[projectId] || { vectorLayers: [], streetImages: [], rasterLayers: [] };

// export const selectLayerVisibility = (state, layerId) => 
//   state.map.layerVisibility[layerId];

// export const selectTemporaryVisibility = (state, layerId) => 
//   state.map.temporaryVisibility[layerId];

// export const selectEffectiveLayerVisibility = (state, layerId) => {
//   // Temporary visibility overrides permanent visibility
//   if (state.map.temporaryVisibility[layerId] !== undefined) {
//     return state.map.temporaryVisibility[layerId];
//   }
//   return state.map.layerVisibility[layerId] !== false; // Default to true if undefined
// };

// export const selectActiveProjectLayers = (state) => 
//   selectProjectLayers(state, state.map.activeProjectId);

// export const selectIsLoading = (state) => 
//   Object.values(state.map.loading).some(loading => loading);

// export const selectHasErrors = (state) => 
//   Object.values(state.map.error).some(error => error !== null);

// // NEW: Upload selectors (missing from original)
// export const selectUploadData = (state, projectId) =>
//   state.map.uploadProgress[projectId] || { progress: 0, files: [], loading: false, error: null };

// export const selectIsUploading = (state, projectId) =>
//   state.map.uploadProgress[projectId]?.loading || false;

// export const selectUploadProgress = (state, projectId) =>
//   state.map.uploadProgress[projectId]?.progress || 0;

// export const selectUploadError = (state, projectId) =>
//   state.map.uploadProgress[projectId]?.error || null;

// export const selectUploadedFiles = (state, projectId) =>
//   state.map.uploadProgress[projectId]?.files || [];

// export default mapSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchVectorLayers, fetchStreetImages, fetchRasterImages } from '../api/services/Mapservice';

// Async thunk to fetch all layers for a project
export const fetchAllLayers = createAsyncThunk(
  'map/fetchAllLayers',
  async (projectId, { rejectWithValue }) => {
    try {
      console.log('Fetching all layers for project:', projectId);
      
      // Fetch all three types of layers concurrently
      const [vectorResult, streetResult, rasterResult] = await Promise.allSettled([
        fetchVectorLayers(projectId),
        fetchStreetImages(projectId),
        fetchRasterImages(projectId)
      ]);

      // Process vector layers result
      const vectorLayers = vectorResult.status === 'fulfilled' && vectorResult.value.success 
        ? vectorResult.value.data || []
        : [];
      
      // Process street images result
      const streetImages = streetResult.status === 'fulfilled' && streetResult.value.success 
        ? streetResult.value.data || []
        : [];
      
      // Process raster layers result
      const rasterLayers = rasterResult.status === 'fulfilled' && rasterResult.value.success 
        ? rasterResult.value.data || []
        : [];

      console.log('Fetched layers:', { 
        vector: vectorLayers.length, 
        street: streetImages.length, 
        raster: rasterLayers.length 
      });

      return {
        projectId,
        vectorLayers,
        streetImages,
        rasterLayers,
        totalCount: vectorLayers.length + streetImages.length + rasterLayers.length
      };
    } catch (error) {
      console.error('Error fetching all layers:', error);
      return rejectWithValue(error.message || 'Failed to fetch layers');
    }
  }
);

// Async thunk to fetch vector layers only
export const fetchVectorLayersAsync = createAsyncThunk(
  'map/fetchVectorLayers',
  async (projectId, { rejectWithValue }) => {
    try {
      console.log('Fetching vector layers for project:', projectId);
      const result = await fetchVectorLayers(projectId);
      if (result.success) {
        return { projectId, layers: result.data || [] };
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      console.error('Error fetching vector layers:', error);
      return rejectWithValue(error.message || 'Failed to fetch vector layers');
    }
  }
);

// Async thunk to fetch street images only
export const fetchStreetImagesAsync = createAsyncThunk(
  'map/fetchStreetImages',
  async ({ projectId, params = {} }, { rejectWithValue }) => {
    try {
      console.log('Fetching street images for project:', projectId);
      const result = await fetchStreetImages(projectId, params);
      if (result.success) {
        return { projectId, images: result.data || [] };
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      console.error('Error fetching street images:', error);
      return rejectWithValue(error.message || 'Failed to fetch street images');
    }
  }
);

// Async thunk to fetch raster layers only
export const fetchRasterLayersAsync = createAsyncThunk(
  'map/fetchRasterLayers',
  async ({ projectId, params = {} }, { rejectWithValue }) => {
    try {
      console.log('Fetching raster layers for project:', projectId);
      const result = await fetchRasterImages(projectId, params);
      if (result.success) {
        return { projectId, layers: result.data || [] };
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      console.error('Error fetching raster layers:', error);
      return rejectWithValue(error.message || 'Failed to fetch raster layers');
    }
  }
);


const mapSlice = createSlice({
  name: 'map',
  initialState: {
    // Project-specific layer data
    projectLayers: {}, // { [projectId]: { vectorLayers, streetImages, rasterLayers } }
    
    // Layer visibility states (permanent)
    layerVisibility: {}, // { [layerId]: boolean }
    
    // Temporary visibility states (for street view mode, etc.)
    temporaryVisibility: {}, // { [layerId]: boolean }
    
    // Loading states
    loading: {
      fetchingAll: false,
      fetchingVector: false,
      fetchingStreet: false,
      fetchingRaster: false,
      uploading: false
    },
    
    // Error states
    error: {
      general: null,
      vector: null,
      street: null,
      raster: null,
      upload: null
    },
    
    // Current active project
    activeProjectId: null,
    
    // Layer settings (opacity, style, etc.)
    layerSettings: {}, // { [layerId]: { opacity, style, etc } }
    
    // Street view mode state
    streetViewMode: false,
    streetViewImageData: null,
    
    // Upload progress
    uploadProgress: {},  // { [projectId]: { progress, files, loading, error } }
  },
  reducers: {
    // Set active project
    setActiveProject: (state, action) => {
      const projectId = action.payload;
      console.log('Setting active project:', projectId);
      state.activeProjectId = projectId;
      
      // Clear temporary visibility when switching projects
      state.temporaryVisibility = {};
      state.streetViewMode = false;
      state.streetViewImageData = null;
    },
    
    // Toggle layer visibility (permanent)
    toggleLayerVisibility: (state, action) => {
      const { layerId } = action.payload;
      const currentVisibility = state.layerVisibility[layerId];
      state.layerVisibility[layerId] = currentVisibility !== false ? false : true;
      console.log(`Toggled layer ${layerId} visibility to:`, state.layerVisibility[layerId]);
    },
    
    // Set layer visibility (permanent)
    setLayerVisibility: (state, action) => {
      const { layerId, visibility } = action.payload;
      state.layerVisibility[layerId] = visibility;
      console.log(`Set layer ${layerId} visibility to:`, visibility);
    },
    
    // Set temporary layer visibility (for street view mode, etc.)
    setTemporaryLayerVisibility: (state, action) => {
      const { layerId, visibility } = action.payload;
      if (visibility) {
        state.temporaryVisibility[layerId] = visibility;
        console.log(`Set temporary visibility for layer ${layerId} to:`, visibility);
      } else {
        delete state.temporaryVisibility[layerId];
        console.log(`Cleared temporary visibility for layer ${layerId}`);
      }
    },
    
    // Clear all temporary visibility
    clearTemporaryVisibility: (state) => {
      state.temporaryVisibility = {};
      state.streetViewMode = false;
      state.streetViewImageData = null;
      console.log('Cleared all temporary visibility');
    },
    
    // Set street view mode
    setStreetViewMode: (state, action) => {
      const { active, imageData = null } = action.payload;
      state.streetViewMode = active;
      state.streetViewImageData = imageData;
      console.log('Street view mode:', active, imageData ? 'with image data' : '');
    },
    
    // Update layer settings (opacity, style, etc.)
    updateLayerSettings: (state, action) => {
      const { layerId, settings } = action.payload;
      state.layerSettings[layerId] = {
        ...state.layerSettings[layerId],
        ...settings
      };
      console.log(`Updated settings for layer ${layerId}:`, settings);
    },
    
    // Set default layer visibility based on layer type
    setDefaultLayerVisibility: (state, action) => {
      const { projectId } = action.payload;
      const projectLayers = state.projectLayers[projectId];
      
      if (!projectLayers) return;
      
      console.log('Setting default layer visibility for project:', projectId);
      
      // Vector layers: visible by default
      if (projectLayers.vectorLayers) {
        projectLayers.vectorLayers.forEach(layer => {
          if (state.layerVisibility[layer.id] === undefined) {
            state.layerVisibility[layer.id] = true;
            console.log(`Set vector layer ${layer.id} to visible by default`);
          }
        });
      }
      
      // Raster layers: hidden by default
      if (projectLayers.rasterLayers) {
        projectLayers.rasterLayers.forEach(layer => {
          if (state.layerVisibility[layer.id] === undefined) {
            state.layerVisibility[layer.id] = false;
            console.log(`Set raster layer ${layer.id} to hidden by default`);
          }
        });
      }
      
      // Street images: hidden by default
      if (projectLayers.streetImages && projectLayers.streetImages.length > 0) {
        const streetImagesId = `street_images_${projectId}`;
        const streetImagesWMSId = `street_images_wms_${projectId}`;
        
        if (state.layerVisibility[streetImagesId] === undefined) {
          state.layerVisibility[streetImagesId] = false;
          console.log(`Set street images layer ${streetImagesId} to hidden by default`);
        }
        if (state.layerVisibility[streetImagesWMSId] === undefined) {
          state.layerVisibility[streetImagesWMSId] = false;
          console.log(`Set street images WMS layer ${streetImagesWMSId} to hidden by default`);
        }
      }
      
      // Terrain layer: hidden by default
      if (state.layerVisibility['terrain'] === undefined) {
        state.layerVisibility['terrain'] = false;
        console.log('Set terrain layer to hidden by default');
      }
    },
    
    // Clear project layers
    clearProjectLayers: (state, action) => {
      const projectId = action.payload;
      if (state.projectLayers[projectId]) {
        delete state.projectLayers[projectId];
        console.log('Cleared layers for project:', projectId);
      }
      
      // Clear related visibility settings
      Object.keys(state.layerVisibility).forEach(layerId => {
        if (layerId.includes(projectId)) {
          delete state.layerVisibility[layerId];
        }
      });
      
      // Clear related layer settings
      Object.keys(state.layerSettings).forEach(layerId => {
        if (layerId.includes(projectId)) {
          delete state.layerSettings[layerId];
        }
      });
      
      // Clear temporary visibility
      state.temporaryVisibility = {};
      state.streetViewMode = false;
      state.streetViewImageData = null;
    },
    
    // Clear all layers
    clearAllLayers: (state) => {
      state.projectLayers = {};
      state.layerVisibility = {};
      state.temporaryVisibility = {};
      state.layerSettings = {};
      state.activeProjectId = null;
      state.streetViewMode = false;
      state.streetViewImageData = null;
      console.log('Cleared all layers and state');
    },
    
    // Clear errors
    clearErrors: (state) => {
      state.error = {
        general: null,
        vector: null,
        street: null,
        raster: null,
        upload: null
      };
      console.log('Cleared all errors');
    },
    
    // Clear specific error
    clearError: (state, action) => {
      const errorType = action.payload;
      if (state.error[errorType] !== undefined) {
        state.error[errorType] = null;
        console.log(`Cleared ${errorType} error`);
      }
    },

    // NEW: Clear project error (missing export)
    clearProjectError: (state, action) => {
      const projectId = action.payload;
      if (state.uploadProgress[projectId]) {
        state.uploadProgress[projectId].error = null;
        console.log(`Cleared error for project ${projectId}`);
      }
    },

    // NEW: Set upload progress (missing export)
    setUploadProgress: (state, action) => {
      const { projectId, progress } = action.payload;
      if (!state.uploadProgress[projectId]) {
        state.uploadProgress[projectId] = { progress: 0, files: [], loading: false, error: null };
      }
      state.uploadProgress[projectId].progress = progress;
      console.log(`Set upload progress for project ${projectId}: ${progress}%`);
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Layers
      .addCase(fetchAllLayers.pending, (state) => {
        state.loading.fetchingAll = true;
        state.error.general = null;
        console.log('Started fetching all layers');
      })
      .addCase(fetchAllLayers.fulfilled, (state, action) => {
        state.loading.fetchingAll = false;
        const { projectId, vectorLayers, streetImages, rasterLayers, totalCount } = action.payload;
        
        console.log(`Successfully fetched ${totalCount} layers for project ${projectId}`);
        
        state.projectLayers[projectId] = {
          vectorLayers: vectorLayers || [],
          streetImages: streetImages || [],
          rasterLayers: rasterLayers || []
        };
        
        // Set default visibility immediately when layers are fetched
        const projectLayers = state.projectLayers[projectId];
        
        // Vector layers: visible by default
        if (projectLayers.vectorLayers) {
          projectLayers.vectorLayers.forEach(layer => {
            if (state.layerVisibility[layer.id] === undefined) {
              state.layerVisibility[layer.id] = true;
              console.log(`Set vector layer ${layer.id} to visible by default`);
            }
          });
        }
        
        // Raster layers: hidden by default
        if (projectLayers.rasterLayers) {
          projectLayers.rasterLayers.forEach(layer => {
            if (state.layerVisibility[layer.id] === undefined) {
              state.layerVisibility[layer.id] = false;
              console.log(`Set raster layer ${layer.id} to hidden by default`);
            }
          });
        }
        
        // Street images: hidden by default
        if (projectLayers.streetImages && projectLayers.streetImages.length > 0) {
          const streetImagesId = `street_images_${projectId}`;
          const streetImagesWMSId = `street_images_wms_${projectId}`;
          
          if (state.layerVisibility[streetImagesId] === undefined) {
            state.layerVisibility[streetImagesId] = false;
            console.log(`Set street images layer ${streetImagesId} to hidden by default`);
          }
          if (state.layerVisibility[streetImagesWMSId] === undefined) {
            state.layerVisibility[streetImagesWMSId] = false;
            console.log(`Set street images WMS layer ${streetImagesWMSId} to hidden by default`);
          }
        }
        
        // Terrain layer: hidden by default
        if (state.layerVisibility['terrain'] === undefined) {
          state.layerVisibility['terrain'] = false;
          console.log('Set terrain layer to hidden by default');
        }
      })
      .addCase(fetchAllLayers.rejected, (state, action) => {
        state.loading.fetchingAll = false;
        state.error.general = action.payload || action.error.message;
        console.error('Failed to fetch all layers:', state.error.general);
      })
      
      // Fetch Vector Layers
      .addCase(fetchVectorLayersAsync.pending, (state) => {
        state.loading.fetchingVector = true;
        state.error.vector = null;
        console.log('Started fetching vector layers');
      })
      .addCase(fetchVectorLayersAsync.fulfilled, (state, action) => {
        state.loading.fetchingVector = false;
        const { projectId, layers } = action.payload;
        
        console.log(`Successfully fetched ${layers.length} vector layers for project ${projectId}`);
        
        if (!state.projectLayers[projectId]) {
          state.projectLayers[projectId] = { vectorLayers: [], streetImages: [], rasterLayers: [] };
        }
        state.projectLayers[projectId].vectorLayers = layers;
        
        // Set default visibility for vector layers (visible by default)
        layers.forEach(layer => {
          if (state.layerVisibility[layer.id] === undefined) {
            state.layerVisibility[layer.id] = true;
          }
        });
      })
      .addCase(fetchVectorLayersAsync.rejected, (state, action) => {
        state.loading.fetchingVector = false;
        state.error.vector = action.payload || action.error.message;
        console.error('Failed to fetch vector layers:', state.error.vector);
      })
      
      // Fetch Street Images
      .addCase(fetchStreetImagesAsync.pending, (state) => {
        state.loading.fetchingStreet = true;
        state.error.street = null;
        console.log('Started fetching street images');
      })
      .addCase(fetchStreetImagesAsync.fulfilled, (state, action) => {
        state.loading.fetchingStreet = false;
        const { projectId, images } = action.payload;
        
        console.log(`Successfully fetched ${images.length} street images for project ${projectId}`);
        
        if (!state.projectLayers[projectId]) {
          state.projectLayers[projectId] = { vectorLayers: [], streetImages: [], rasterLayers: [] };
        }
        state.projectLayers[projectId].streetImages = images;
        
        // Set default visibility for street images (hidden by default)
        if (images.length > 0) {
          const streetImagesId = `street_images_${projectId}`;
          const streetImagesWMSId = `street_images_wms_${projectId}`;
          
          if (state.layerVisibility[streetImagesId] === undefined) {
            state.layerVisibility[streetImagesId] = false;
          }
          if (state.layerVisibility[streetImagesWMSId] === undefined) {
            state.layerVisibility[streetImagesWMSId] = false;
          }
        }
      })
      .addCase(fetchStreetImagesAsync.rejected, (state, action) => {
        state.loading.fetchingStreet = false;
        state.error.street = action.payload || action.error.message;
        console.error('Failed to fetch street images:', state.error.street);
      })
      
      // Fetch Raster Layers
      .addCase(fetchRasterLayersAsync.pending, (state) => {
        state.loading.fetchingRaster = true;
        state.error.raster = null;
        console.log('Started fetching raster layers');
      })
      .addCase(fetchRasterLayersAsync.fulfilled, (state, action) => {
        state.loading.fetchingRaster = false;
        const { projectId, layers } = action.payload;
        
        console.log(`Successfully fetched ${layers.length} raster layers for project ${projectId}`);
        
        if (!state.projectLayers[projectId]) {
          state.projectLayers[projectId] = { vectorLayers: [], streetImages: [], rasterLayers: [] };
        }
        state.projectLayers[projectId].rasterLayers = layers;
        
        // Set default visibility for raster layers (hidden by default)
        layers.forEach(layer => {
          if (state.layerVisibility[layer.id] === undefined) {
            state.layerVisibility[layer.id] = false;
          }
        });
      })
      .addCase(fetchRasterLayersAsync.rejected, (state, action) => {
        state.loading.fetchingRaster = false;
        state.error.raster = action.payload || action.error.message;
        console.error('Failed to fetch raster layers:', state.error.raster);
      })

    
  },
});

export const {
  setActiveProject,
  toggleLayerVisibility,
  setLayerVisibility,
  setTemporaryLayerVisibility,
  clearTemporaryVisibility,
  setStreetViewMode,
  updateLayerSettings,
  setDefaultLayerVisibility,
  clearProjectLayers,
  clearAllLayers,
  clearErrors,
  clearError,
  clearProjectError,  // ADDED: This was missing
  setUploadProgress    // ADDED: This was missing
} = mapSlice.actions;

// Selectors
export const selectProjectLayers = (state, projectId) => 
  state.map.projectLayers[projectId] || { vectorLayers: [], streetImages: [], rasterLayers: [] };

export const selectLayerVisibility = (state, layerId) => 
  state.map.layerVisibility[layerId];

export const selectTemporaryVisibility = (state, layerId) => 
  state.map.temporaryVisibility[layerId];

export const selectEffectiveLayerVisibility = (state, layerId) => {
  // Temporary visibility overrides permanent visibility
  if (state.map.temporaryVisibility[layerId] !== undefined) {
    return state.map.temporaryVisibility[layerId];
  }
  return state.map.layerVisibility[layerId] !== false; // Default to true if undefined
};

export const selectActiveProjectLayers = (state) => 
  selectProjectLayers(state, state.map.activeProjectId);

export const selectIsLoading = (state) => 
  Object.values(state.map.loading).some(loading => loading);

export const selectHasErrors = (state) => 
  Object.values(state.map.error).some(error => error !== null);

// NEW: Upload selectors (missing from original)
export const selectUploadData = (state, projectId) =>
  state.map.uploadProgress[projectId] || { progress: 0, files: [], loading: false, error: null };

export const selectIsUploading = (state, projectId) =>
  state.map.uploadProgress[projectId]?.loading || false;

export const selectUploadProgress = (state, projectId) =>
  state.map.uploadProgress[projectId]?.progress || 0;

export const selectUploadError = (state, projectId) =>
  state.map.uploadProgress[projectId]?.error || null;

export const selectUploadedFiles = (state, projectId) =>
  state.map.uploadProgress[projectId]?.files || [];

export default mapSlice.reducer;










