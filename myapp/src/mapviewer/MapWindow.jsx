// MapWindow.jsx - Updated with Street View integration and thumbnail support
import { useRef, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

// Core OpenLayers imports
import Map from "ol/Map";
import View from "ol/View";

// Layer imports
import TileLayer from "ol/layer/Tile";

// Source imports
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import TileWMS from "ol/source/TileWMS";
import ImageWMS from "ol/source/ImageWMS";

import { fromLonLat, toLonLat, transformExtent } from "ol/proj";


// Redux slice import
import { setLayerVisibility, setDefaultLayerVisibility, selectEffectiveLayerVisibility } from './MapSlice';

// Import your managers
import { VectorLayerManager } from './VectorLayerManager';
import { RasterLayerManager } from './RasterLayerManager';
import { StreetImageLayerManager } from './StreetImageLayerManager';

// Import the new Street View component
import StreetViewViewer from './StreetViewViewer';
import MapControlButton from '../components/commons/MapButton';

const MapWindow = ({
  onMapClick,
  toggleToolbox,
  onOpen3D,
  onOpenImage,
  onOpenLayers,
  mapClickData,
  setMapInstance,
}) => {
  const mapElement = useRef();
  const mapRef = useRef();
  const [showProperties, setShowProperties] = useState(false);
  const [showStreetView, setShowStreetView] = useState(false);
  const [currentStreetImage, setCurrentStreetImage] = useState(null);
  const [allStreetImages, setAllStreetImages] = useState([]);
  const [currentBaseLayer, setCurrentBaseLayer] = useState('satellite'); // Track current base layer
  const dispatch = useDispatch();

  // Redux selectors
  const { 
    projectLayers, 
    layerVisibility, 
    activeProjectId, 
    layerSettings,
    temporaryVisibility,
    streetViewMode,
    streetViewImageData
  } = useSelector((state) => state.map);

  // Get current project layers
  const currentProjectLayers = activeProjectId ? projectLayers[activeProjectId] : null;

  // Helper function to get effective layer visibility
  const getLayerVisibility = (layerId) => {
    return selectEffectiveLayerVisibility({ map: { layerVisibility, temporaryVisibility } }, layerId);
  };

  // Initialize layer managers
  const vectorManager = new VectorLayerManager(dispatch, getLayerVisibility, layerSettings);
  const rasterManager = new RasterLayerManager(dispatch, getLayerVisibility, layerSettings);
  const streetImageManager = new StreetImageLayerManager(
    dispatch, 
    getLayerVisibility, 
    layerSettings, 
    activeProjectId
  );

  // Store all street images for navigation
  useEffect(() => {
    if (currentProjectLayers?.streetImages) {
      setAllStreetImages(currentProjectLayers.streetImages);
      
      // Preload thumbnails for better performance
      streetImageManager.preloadThumbnails(currentProjectLayers.streetImages);
    }
  }, [currentProjectLayers, streetImageManager]);

  // Handle street view opening
  const handleOpenStreetView = (imageData, allImages = []) => {
    console.log('Opening street view for:', imageData);
    setCurrentStreetImage(imageData);
    setAllStreetImages(allImages.length > 0 ? allImages : allStreetImages);
    setShowStreetView(true);
  };

  // Handle navigation between street images
  const handleNavigateToImage = (imageData) => {
    console.log('Navigating to image:', imageData);
    setCurrentStreetImage(imageData);
    
    // Update Redux state
    dispatch({
      type: 'SET_STREET_VIEW_MODE',
      payload: { 
        active: true, 
        imageData,
        allImages: allStreetImages 
      }
    });
  };

  // Close street view
  const handleCloseStreetView = () => {
    setShowStreetView(false);
    setCurrentStreetImage(null);
    
    // Update Redux state
    dispatch({
      type: 'SET_STREET_VIEW_MODE',
      payload: { active: false }
    });
  };

  // Initialize default layer visibility when project loads
  useEffect(() => {
    if (activeProjectId && currentProjectLayers) {
      console.log('Setting default visibility for project:', activeProjectId);
      dispatch(setDefaultLayerVisibility({ projectId: activeProjectId }));
    }
  }, [activeProjectId, currentProjectLayers, dispatch]);

  useEffect(() => {
    // Base Layers - Start with satellite as default
    const osmLayer = new TileLayer({
      source: new OSM(),
      visible: false, // Start hidden
      properties: { name: 'osm', type: 'base', id: 'osm' }
    });

    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        crossOrigin: "anonymous",
      }),
      visible: true, // Default visible
      properties: { name: 'satellite', type: 'base', id: 'satellite' }
    });

    const terrainLayer = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
        crossOrigin: "anonymous",
      }),
      visible: false, // Start hidden
      properties: { name: 'terrain', type: 'base', id: 'terrain' }
    });

    // Create Map
    const map = new Map({
      target: mapElement.current,
      layers: [osmLayer, satelliteLayer, terrainLayer],
      view: new View({
        center: fromLonLat([0, 0]),
        zoom: 2,
      }),
    });

    mapRef.current = map;

    if (setMapInstance) {
      setMapInstance(map);
    }

    // Enhanced map click handler
    map.on("click", async (evt) => {
      const coordinates = evt.coordinate;
      const features = [];
      let streetImageClicked = null;
      
      // Get features from vector layers
      map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        const layerData = layer.get('layerData');
        const featureData = {
          feature,
          layer: layer.get('name'),
          layerType: layer.get('type'),
          properties: feature.getProperties(),
          layerData
        };
        
        features.push(featureData);
        
        // Check if it's a street image
        if (layer.get('type') === 'street_images') {
          streetImageClicked = feature.get('imageData');
        }
      });

      // Query WMS layers
      const wmsLayers = map.getLayers().getArray().filter(layer => 
        layer.getSource() instanceof TileWMS || layer.getSource() instanceof ImageWMS
      );

      for (const layer of wmsLayers) {
        if (layer.getVisible() && layer.get('type') !== 'base') {
          try {
            let wmsFeatures = [];
            
            if (layer.get('type') === 'vector') {
              wmsFeatures = await vectorManager.queryWMSLayer(map, layer, evt);
            } else if (layer.get('type') === 'raster') {
              wmsFeatures = await rasterManager.queryWMSLayer(map, layer, evt);
            }
            
            if (wmsFeatures.length > 0) {
              features.push(...wmsFeatures);
            }
          } catch (error) {
            console.warn('Failed to query WMS layer:', layer.get('name'), error);
          }
        }
      }

      // Handle street image click - UPDATED to open street view directly
      if (streetImageClicked) {
        streetImageManager.handleStreetImageClick(
          streetImageClicked,
          dispatch,
          activeProjectId,
          allStreetImages,
          handleOpenStreetView // Pass the street view handler
        );
      }

      onMapClick({ 
        coordinates, 
        features,
        pixel: evt.pixel,
        streetImage: streetImageClicked
      });
      setShowProperties(true);
    });

    return () => {
      map.setTarget(null);
    };
  }, []); // Remove layerVisibility dependency to prevent recreation

  // Enhanced function to add layers to map with proper ordering
  const addLayersToMap = (map, layers) => {
    // Remove existing project layers (keep base layers)
    const existingLayers = map.getLayers().getArray().slice();
    existingLayers.forEach(layer => {
      const layerType = layer.get('type');
      if (layerType && layerType !== 'base') {
        console.log('Removing existing layer:', layer.get('name'));
        map.removeLayer(layer);
      }
    });

    // Filter out null/undefined layers and validate each layer
    const validLayers = layers.filter(layer => {
      if (!layer) {
        console.warn('Null or undefined layer detected, skipping');
        return false;
      }
      
      if (typeof layer.get !== 'function') {
        console.error('Invalid layer object (missing .get method):', layer);
        return false;
      }
      
      if (typeof layer.setVisible !== 'function') {
        console.error('Invalid layer object (missing .setVisible method):', layer);
        return false;
      }
      
      return true;
    });

    console.log('Adding layers to map:', {
      total: layers.length,
      valid: validLayers.length,
      invalid: layers.length - validLayers.length
    });

    // Add valid layers in proper order (raster -> vector -> street images -> connections)
    validLayers.forEach((layer, index) => {
      try {
        console.log(`Adding layer ${index + 1}/${validLayers.length}:`, {
          name: layer.get('name'),
          type: layer.get('type'),
          visible: layer.getVisible(),
          opacity: layer.getOpacity(),
          isWFS: layer.get('isWFS'),
          isWMS: layer.get('isWMS')
        });
        
        map.addLayer(layer);
      } catch (error) {
        console.error(`Error adding layer ${index + 1}:`, error, layer);
      }
    });
    
    console.log('Total layers on map after addition:', map.getLayers().getLength());
  };

  // Function to fit map to layer bounds
  const fitToLayerBounds = (map, layers) => {
    let extentToFit = null;

    const rasterLayers = layers.filter(layer => layer && layer.get('type') === 'raster');
    if (rasterLayers.length > 0) {
      const firstRaster = rasterLayers[0].get('layerData');
      if (firstRaster.bounding_box && firstRaster.bounding_box.length === 4) {
        const [minX, minY, maxX, maxY] = firstRaster.bounding_box;
        if (minX > -180 && maxX < 180 && minY > -90 && maxY < 90) {
          extentToFit = transformExtent([minX, minY, maxX, maxY], 'EPSG:4326', map.getView().getProjection());
        }
      }
    }

    if (!extentToFit) {
      const streetImageLayers = layers.filter(layer => layer && layer.get('type') === 'street_images');
      if (streetImageLayers.length > 0) {
        const streetLayer = streetImageLayers[0];
        const features = streetLayer.getSource().getFeatures();
        if (features.length > 0) {
          extentToFit = streetLayer.getSource().getExtent();
        }
      }
    }

    if (extentToFit) {
      try {
        console.log('Fitting map to extent:', extentToFit);
        map.getView().fit(extentToFit, { 
          padding: [50, 50, 50, 50], 
          maxZoom: 15,
          duration: 1000
        });
      } catch (error) {
        console.warn('Could not fit to extent:', error);
      }
    }
  };

  // Main effect to update layers on map using modular managers
  useEffect(() => {
    if (!mapRef.current || !currentProjectLayers) return;

    console.log('=== UPDATING LAYERS ON MAP ===');
    console.log('Active Project ID:', activeProjectId);
    console.log('Current Project Layers:', currentProjectLayers);
    
    const map = mapRef.current;
    const newLayers = [];

    // Add raster layers first (bottom layer)
    if (currentProjectLayers.rasterLayers && currentProjectLayers.rasterLayers.length > 0) {
      console.log('Processing raster layers:', currentProjectLayers.rasterLayers.length);
      currentProjectLayers.rasterLayers.forEach((rasterData, index) => {
        console.log(`Processing raster layer ${index + 1}:`, rasterData);
        try {
          const layer = rasterManager.createRasterLayer(rasterData);
          if (layer && typeof layer.get === 'function') {
            newLayers.push(layer);
            console.log(`Raster layer ${index + 1} created successfully (ImageWMS)`);
          } else {
            console.warn(`Failed to create raster layer ${index + 1} - invalid layer object`);
          }
        } catch (error) {
          console.error(`Error creating raster layer ${index + 1}:`, error);
        }
      });
    }

    // Add vector layers (middle layer)
    if (currentProjectLayers.vectorLayers && currentProjectLayers.vectorLayers.length > 0) {
      console.log('Processing vector layers:', currentProjectLayers.vectorLayers.length);
      currentProjectLayers.vectorLayers.forEach((vectorData, index) => {
        console.log(`Processing vector layer ${index + 1}:`, vectorData);
        try {
          const layer = vectorManager.createVectorLayer(vectorData);
          if (layer) {
            newLayers.push(layer);
            const layerType = layer.get('isWFS') ? 'WFS Vector' : 'WMS Vector';
            console.log(`Vector layer ${index + 1} created successfully (${layerType})`);
          } else {
            console.warn(`Failed to create vector layer ${index + 1}`);
          }
        } catch (error) {
          console.error(`Error creating vector layer ${index + 1}:`, error);
        }
      });
    }

    // Add street images layers (top layer) - UPDATED for thumbnail support
    if (currentProjectLayers.streetImages && currentProjectLayers.streetImages.length > 0) {
      console.log('Processing street image layers with thumbnails:', currentProjectLayers.streetImages.length);
      try {
        // Add WMS layer if available
        const wmsLayer = streetImageManager.createStreetImageWMSLayer(currentProjectLayers.streetImages);
        if (wmsLayer) {
          newLayers.push(wmsLayer);
          console.log('Street images WMS layer created successfully');
        }

        // Add point layer for individual images with thumbnails
        const validImages = currentProjectLayers.streetImages.filter(
          img => img.longitude && img.latitude && 
                (img.longitude !== 0 || img.latitude !== 0)
        );
        
        console.log('Valid street images for thumbnail points:', validImages.length);
        console.log('Sample image data:', validImages[0] || 'No valid images');
        
        if (validImages.length > 0) {
          const streetPointLayer = streetImageManager.createStreetImageLayer(validImages);
          if (streetPointLayer) {
            newLayers.push(streetPointLayer);
            console.log('Street images thumbnail layer created successfully');
          }

          // Add connection lines between nearby street images
          const connectionsLayer = streetImageManager.createStreetImageConnections(validImages);
          if (connectionsLayer) {
            newLayers.push(connectionsLayer);
            console.log('Street image connections layer created successfully');
          }
        }
      } catch (error) {
        console.error('Error creating street image layers:', error);
      }
    }

    console.log('Total layers created:', newLayers.length);

    // Add layers to map
    addLayersToMap(map, newLayers);

    // Fit to bounds if we have visible layers
    const visibleLayers = newLayers.filter(layer => layer && layer.getVisible());
    console.log('Visible layers for extent fitting:', visibleLayers.length);
    
    if (visibleLayers.length > 0) {
      console.log('Fitting to bounds for', visibleLayers.length, 'visible layers');
      setTimeout(() => {
        fitToLayerBounds(map, visibleLayers);
      }, 500);
    }

    console.log('=== LAYER UPDATE COMPLETE ===');

  }, [currentProjectLayers, activeProjectId, layerVisibility, temporaryVisibility]);

  // Effect to handle layer visibility changes - FIXED to not affect base layers
  useEffect(() => {
    if (!mapRef.current) return;

    console.log('Updating layer visibility on map');
    const map = mapRef.current;
    const layers = map.getLayers().getArray();

    layers.forEach(layer => {
      const layerId = layer.get('id');
      const layerType = layer.get('type');
      
      // Skip base layers - they're handled by switchBaseLayer function
      if (layerType === 'base') return;
      
      if (layerId) {
        const visibility = getLayerVisibility(layerId);
        const currentVisibility = layer.getVisible();
        
        if (currentVisibility !== visibility) {
          console.log(`Layer ${layerId} visibility changed from ${currentVisibility} to ${visibility}`);
          layer.setVisible(visibility);
        }
      }
    });
  }, [layerVisibility, temporaryVisibility]);

  // Effect to handle layer settings changes
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const layers = map.getLayers().getArray();

    layers.forEach(layer => {
      const layerId = layer.get('id');
      if (layerId && layerSettings[layerId]) {
        const settings = layerSettings[layerId];
        if (settings.opacity !== undefined) {
          layer.setOpacity(settings.opacity);
        }
      }
    });
  }, [layerSettings]);

  // FIXED: Function to switch base layers - maintain single active base layer
  const switchBaseLayer = (layerName) => {
    if (!mapRef.current) return;

    console.log('Switching to base layer:', layerName);
    const map = mapRef.current;
    const layers = map.getLayers().getArray();

    // Update local state
    setCurrentBaseLayer(layerName);

    layers.forEach(layer => {
      if (layer.get('type') === 'base') {
        const shouldShow = layer.get('name') === layerName;
        layer.setVisible(shouldShow);
        
        // Only update Redux for terrain layer (keep it in sync)
        if (layer.get('name') === 'terrain') {
          dispatch(setLayerVisibility({ layerId: 'terrain', visibility: shouldShow }));
        }
      }
    });
  };

  // Enhanced coordinate formatting function
  const formatCoordinate = (coord) => {
    if (!coord || coord.length !== 2) return 'N/A';
    const [lon, lat] = toLonLat(coord);
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  };



  return (
    <div className="h-full w-full flex flex-col bg-white relative">
      {/* Street View Viewer - Show when active */}
      {showStreetView && currentStreetImage && (
        <StreetViewViewer
          streetImageData={currentStreetImage}
          onClose={handleCloseStreetView}
          onNavigateToImage={handleNavigateToImage}
          allStreetImages={allStreetImages}
        />
      )}

      {/* Map container - Hide when street view is active */}
      <div className={`flex-grow relative ${showStreetView ? 'hidden' : ''}`}>
  <div ref={mapElement} className="w-full h-full" />

  {/* Top-right control buttons */}
  <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
    {toggleToolbox && (
    <MapControlButton
      onClick={toggleToolbox}
      title="Toggle Toolbox"
      className="transition-transform transform hover:scale-110 active:scale-95 animate-pulse"
    >
        🛠
      </MapControlButton>
    )}
    {onOpenLayers && (
      <MapControlButton onClick={onOpenLayers} title="Open Layers Panel">
        📑
      </MapControlButton>
    )}
    {onOpen3D && (
      <MapControlButton onClick={onOpen3D} title="Open 3D View">
        🗻
      </MapControlButton>
    )}
    {allStreetImages.length > 0 && (
      <MapControlButton
        onClick={() => handleOpenStreetView(allStreetImages[0], allStreetImages)}
        title="Enter Street View Mode"
      >
        📸
      </MapControlButton>
    )}
  </div>

  {/* Bottom-left base layer switcher */}
  <div className="absolute bottom-3 left-3 flex gap-2 z-10 bg-white rounded shadow-md p-2">
    <MapControlButton
      onClick={() => switchBaseLayer("osm")}
      active={currentBaseLayer === "osm"}
      title="OpenStreetMap"
    >
      OSM
    </MapControlButton>
    <MapControlButton
      onClick={() => switchBaseLayer("satellite")}
      active={currentBaseLayer === "satellite"}
      title="Satellite"
    >
     Satallite
    </MapControlButton>
    <MapControlButton
      onClick={() => switchBaseLayer("terrain")}
      active={currentBaseLayer === "terrain"}
      title="Terrain"
    >
      Terrain
    </MapControlButton>
  </div>
</div>

      {/* Enhanced Properties Panel - Hide when street view is active */}
      {showProperties && !showStreetView && (
        <div className="h-[25%] border-t border-gray-300 p-3 bg-gray-50 overflow-auto">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-semibold text-gray-800">Properties Panel</h4>
            <button 
              className="text-red-500 hover:text-red-700 font-bold text-lg" 
              onClick={() => setShowProperties(false)}
              title="Close"
            >
              ✕
            </button>
          </div>
          
          {/* Coordinates Display */}
          <div className="mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
            <h5 className="font-semibold text-blue-800 text-sm mb-2">Coordinates</h5>
            <div className="text-sm">
              <div><strong className="text-blue-500">Lat, Lon:</strong>
                <span className="text-blue-500 ml-2">{formatCoordinate(mapClickData?.coordinates)}</span>
              </div>
              <div className="text-gray-600 mt-1">
                <strong className="text-blue-500">Web Mercator:</strong>
                <br />
                X: {mapClickData?.coordinates?.[0]?.toFixed(2) || 'N/A'}
                <br />
                Y: {mapClickData?.coordinates?.[1]?.toFixed(2) || 'N/A'}
              </div>
            </div>
          </div>

          {/* Raw Data Display (Collapsible) */}
          <details className="text-sm mt-3">
            <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900 p-2 bg-gray-200 rounded">
              Raw Click Data
            </summary>
            <pre className="bg-white p-3 rounded border mt-2 text-xs overflow-auto max-h-40 text-gray-600">
              {JSON.stringify(mapClickData, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default MapWindow;