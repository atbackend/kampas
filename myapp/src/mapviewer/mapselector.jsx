// mapSelectors.js
import { createSelector } from '@reduxjs/toolkit';

// Base selectors
export const selectMapState = (state) => state.map;
export const selectProjectLayers = (state) => state.map.projectLayers;
export const selectLayerVisibility = (state) => state.map.layerVisibility;
export const selectLayerSettings = (state) => state.map.layerSettings;
export const selectActiveProjectId = (state) => state.map.activeProjectId;
export const selectMapLoading = (state) => state.map.loading;
export const selectMapError = (state) => state.map.error;

// Project-specific selectors
export const selectCurrentProjectLayers = createSelector(
  [selectProjectLayers, selectActiveProjectId],
  (projectLayers, activeProjectId) => {
    if (!activeProjectId || !projectLayers[activeProjectId]) {
      return {
        vectorLayers: [],
        streetImages: [],
        rasterLayers: []
      };
    }
    return projectLayers[activeProjectId];
  }
);

// Get all layers for current project
export const selectAllCurrentLayers = createSelector(
  [selectCurrentProjectLayers],
  (projectLayers) => {
    const { vectorLayers = [], streetImages = [], rasterLayers = [] } = projectLayers;
    return [
      ...vectorLayers.map(layer => ({ ...layer, layerType: 'vector' })),
      ...streetImages.map(layer => ({ ...layer, layerType: 'street' })),
      ...rasterLayers.map(layer => ({ ...layer, layerType: 'raster' }))
    ];
  }
);

// Get visible layers only
export const selectVisibleLayers = createSelector(
  [selectAllCurrentLayers, selectLayerVisibility],
  (allLayers, layerVisibility) => {
    return allLayers.filter(layer => layerVisibility[layer.id] !== false);
  }
);

// Get layer counts
export const selectLayerCounts = createSelector(
  [selectCurrentProjectLayers],
  (projectLayers) => {
    const { vectorLayers = [], streetImages = [], rasterLayers = [] } = projectLayers;
    return {
      vector: vectorLayers.length,
      street: streetImages.length,
      raster: rasterLayers.length,
      total: vectorLayers.length + streetImages.length + rasterLayers.length
    };
  }
);

// Get loading states
export const selectIsAnyLayerLoading = createSelector(
  [selectMapLoading],
  (loading) => {
    return loading.fetchingAll || loading.fetchingVector || 
           loading.fetchingStreet || loading.fetchingRaster;
  }
);

// Get layer by ID
export const makeSelectLayerById = () => createSelector(
  [selectAllCurrentLayers, (state, layerId) => layerId],
  (allLayers, layerId) => {
    return allLayers.find(layer => layer.id === layerId);
  }
);

// Get layers by type
export const selectLayersByType = createSelector(
  [selectAllCurrentLayers, (state, layerType) => layerType],
  (allLayers, layerType) => {
    return allLayers.filter(layer => layer.layerType === layerType);
  }
);

// mapUtils.js - Utility functions for map operations
export const mapUtils = {
  // Convert layer data to OpenLayers layer configuration
  createLayerConfig: (layer, layerType) => {
    const baseConfig = {
      id: layer.id,
      name: layer.display_name || layer.name || layer.original_filename,
      visible: true,
      opacity: 1,
      layerType
    };

    switch (layerType) {
      case 'vector':
        return {
          ...baseConfig,
          type: 'wms',
          url: layer.geoserver_url,
          params: {
            'LAYERS': layer.name,
            'TILED': true
          },
          geometryType: layer.geometry_type,
          featureCount: layer.feature_count
        };

      case 'raster':
        return {
          ...baseConfig,
          type: 'wms',
          url: layer.geoserver_url,
          params: {
            'LAYERS': layer.geoserver_layer_name,
            'TILED': true
          },
          bandCount: layer.band_count,
          boundingBox: layer.bounding_box
        };

      case 'street':
        return {
          ...baseConfig,
          type: 'wms',
          url: layer.geoserver_layer_url,
          params: {
            'TILED': true
          },
          coordinates: [layer.location_lng, layer.location_lat],
          imageType: layer.image_type
        };

      default:
        return baseConfig;
    }
  },

  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Get layer icon based on type
  getLayerIcon: (layerType) => {
    switch (layerType) {
      case 'vector':
        return 'vector-icon';
      case 'raster':
        return 'raster-icon';
      case 'street':
        return 'image-icon';
      default:
        return 'default-icon';
    }
  },

  // Get layer color based on type
  getLayerColor: (layerType) => {
    switch (layerType) {
      case 'vector':
        return '#10b981'; // green-500
      case 'raster':
        return '#f59e0b'; // amber-500
      case 'street':
        return '#3b82f6'; // blue-500
      default:
        return '#6b7280'; // gray-500
    }
  },

  // Check if layer has geographic coordinates
  hasCoordinates: (layer) => {
    return (
      (layer.location_lat && layer.location_lng) ||
      (layer.bounding_box && layer.bounding_box.length === 4) ||
      (layer.location && layer.location.coordinates)
    );
  },

  // Get layer extent for zooming
  getLayerExtent: (layer, layerType) => {
    switch (layerType) {
      case 'raster':
        if (layer.bounding_box && layer.bounding_box.length === 4) {
          return layer.bounding_box; // [minX, minY, maxX, maxY]
        }
        break;
      case 'street':
        if (layer.location_lat && layer.location_lng) {
          const buffer = 0.01; // Small buffer around point
          return [
            layer.location_lng - buffer,
            layer.location_lat - buffer,
            layer.location_lng + buffer,
            layer.location_lat + buffer
          ];
        }
        break;
      default:
        return null;
    }
  }
};

// Hooks for using selectors
export const useMapSelectors = () => {
  return {
    selectMapState,
    selectProjectLayers,
    selectLayerVisibility,
    selectLayerSettings,
    selectActiveProjectId,
    selectMapLoading,
    selectMapError,
    selectCurrentProjectLayers,
    selectAllCurrentLayers,
    selectVisibleLayers,
    selectLayerCounts,
    selectIsAnyLayerLoading,
    makeSelectLayerById,
    selectLayersByType
  };
};