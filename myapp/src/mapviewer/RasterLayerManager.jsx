// Optimized RasterLayerManager.jsx - Fast loading with caching and preloading
import ImageLayer from "ol/layer/Image";
import ImageWMS from "ol/source/ImageWMS";
import TileLayer from "ol/layer/Tile";
import TileWMS from "ol/source/TileWMS";
import { GeoServerDiagnostics } from './GeoServerDiagnostics';

export class RasterLayerManager {
  constructor(dispatch, getLayerVisibility, layerSettings) {
    this.dispatch = dispatch;
    this.getLayerVisibility = getLayerVisibility;
    this.layerSettings = layerSettings;
    this.loadingLayers = new Set();
    this.layerCache = new Map(); // Cache for validation results
    this.preloadedLayers = new Map(); // Cache for preloaded layer data
  }

  // Helper method to convert direct GeoServer URL to proxy URL
  convertToProxyUrl(geoserverUrl) {
    if (geoserverUrl.includes('192.168.29.247:8080')) {
      return geoserverUrl.replace('http://192.168.29.247:8080', '');
    }
    return geoserverUrl;
  }

  // Discover available layers in GeoServer with caching
  async discoverAvailableLayers(geoserverUrl) {
    const cacheKey = `layers_${geoserverUrl}`;
    
    // Check cache first
    if (this.layerCache.has(cacheKey)) {
     
      return this.layerCache.get(cacheKey);
    }

    try {
      const proxyUrl = this.convertToProxyUrl(geoserverUrl);
      const capabilitiesUrl = `${proxyUrl}?service=WMS&version=1.3.0&request=GetCapabilities`;
      
     
      
      const response = await fetch(capabilitiesUrl, {
        method: 'GET',
        headers: { 
          'Accept': 'text/xml,application/xml',
          'Cache-Control': 'max-age=300' // Cache for 5 minutes
        }
      });
      
      if (!response.ok) {
        throw new Error(`GetCapabilities failed: ${response.status}`);
      }
      
      const xmlText = await response.text();
      
      // Parse XML to extract layer names
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Failed to parse GetCapabilities XML');
      }
      
      // Get all Layer elements with Name child elements
      const layerElements = xmlDoc.querySelectorAll('Layer > Name');
      const availableLayers = Array.from(layerElements).map(el => el.textContent.trim());
      
      // Cache the result
      this.layerCache.set(cacheKey, availableLayers);
      
     
      return availableLayers;
      
    } catch (error) {
      console.error('❌ Failed to discover layers:', error);
      return [];
    }
  }

  // Find best matching layer name
  findBestLayerMatch(targetLayerName, availableLayers) {
    if (!targetLayerName || !availableLayers || availableLayers.length === 0) {
      return null;
    }

    // Direct match
    const exactMatch = availableLayers.find(layer => layer === targetLayerName);
    if (exactMatch) {
   
      return exactMatch;
    }

    // Partial match (case insensitive)
    const partialMatch = availableLayers.find(layer => 
      layer.toLowerCase().includes(targetLayerName.toLowerCase()) ||
      targetLayerName.toLowerCase().includes(layer.toLowerCase())
    );
    if (partialMatch) {
      return partialMatch;
    }

    // Look for common raster layer patterns
    const rasterPatterns = [
      /.*raster.*/i,
      /.*tif.*/i,
      /.*img.*/i,
      /.*world.*/i,
      /.*map.*/i,
      /.*ne1.*/i,  // Natural Earth
      /.*hr.*/i,   // High resolution
      /.*lc.*/i    // Land cover
    ];

    for (const pattern of rasterPatterns) {
      const patternMatch = availableLayers.find(layer => pattern.test(layer));
      if (patternMatch) {
        return patternMatch;
      }
    }

    // If all else fails, suggest first available layer
    if (availableLayers.length > 0) {
      return availableLayers[0];
    }


    return null;
  }

  // Validate layer exists and get corrected name with caching
  async validateAndCorrectLayerName(geoserverUrl, layerName) {
    const cacheKey = `validation_${geoserverUrl}_${layerName}`;
    
    // Check cache first for faster validation
    if (this.layerCache.has(cacheKey)) {
      
      return this.layerCache.get(cacheKey);
    }

    try {
      
      
      const availableLayers = await this.discoverAvailableLayers(geoserverUrl);
      if (availableLayers.length === 0) {
        console.warn('⚠️ No layers found in GeoServer');
        const result = { isValid: false, correctedName: layerName };
        this.layerCache.set(cacheKey, result);
        return result;
      }

      const correctedName = this.findBestLayerMatch(layerName, availableLayers);
      
      let result;
      if (correctedName && correctedName !== layerName) {
      
        result = { isValid: true, correctedName, wasCorrect: false };
      } else if (correctedName) {
       
        result = { isValid: true, correctedName, wasCorrect: true };
      } else {
       
        result = { isValid: false, correctedName: layerName, availableLayers };
      }
      
      // Cache the result
      this.layerCache.set(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error('❌ Layer validation failed:', error);
      const result = { isValid: false, correctedName: layerName, error: error.message };
      this.layerCache.set(cacheKey, result);
      return result;
    }
  }

  // OPTIMIZED: Create raster layer with better performance
  createRasterLayer(rasterData) {
    if (!rasterData.geoserver_url || !rasterData.geoserver_layer_name) {
      console.warn('Missing GeoServer URL or layer name for raster layer:', rasterData);
      return null;
    }

    // Prevent duplicate loading
    const layerKey = `${rasterData.id}_${rasterData.geoserver_layer_name}`;
    if (this.loadingLayers.has(layerKey)) {
    
      return null;
    }

  
    this.loadingLayers.add(layerKey);
    
    try {
      const proxyUrl = this.convertToProxyUrl(rasterData.geoserver_url);
    
      
      // Choose optimal layer type based on data size
      const layer = this.createOptimalWMSLayer(proxyUrl, rasterData.geoserver_layer_name, rasterData);
      
      // Start async validation and correction in background
      this.validateAndCorrectLayerAsync(layer, rasterData);

      // Preload layer if not visible to speed up later visibility changes
      if (!this.getLayerVisibility(rasterData.id)) {
        this.preloadLayer(layer);
      }


      return layer;

    } catch (error) {
      console.error('❌ Error creating raster layer:', error);
      return null;
    } finally {
      this.loadingLayers.delete(layerKey);
    }
  }

  // NEW: Create optimal WMS layer (Tile vs Image based on data characteristics)
  createOptimalWMSLayer(proxyUrl, layerName, rasterData) {
    const isLargeRaster = rasterData.width > 5000 || rasterData.height > 5000;
    const hasMultipleBands = rasterData.band_count > 1;
    
    // Use TileWMS for large rasters for better performance
    if (isLargeRaster) {
      
      return this.createTileWMSLayer(proxyUrl, layerName, rasterData);
    } else {
     
      return this.createImageWMSLayer(proxyUrl, layerName, rasterData);
    }
  }

  // Create TileWMS layer for better performance with large rasters
  createTileWMSLayer(proxyUrl, layerName, rasterData) {
    const wmsConfig = {
      version: '1.3.0',
      params: {
        'LAYERS': layerName,
        'FORMAT': 'image/png',
        'TRANSPARENT': true,
        'CRS': 'EPSG:3857', // Use Web Mercator for tiling
        'STYLES': '',
        'TILED': true
      }
    };

  

    return new TileLayer({
      source: new TileWMS({
        url: proxyUrl,
        params: wmsConfig.params,
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
        cacheSize: 2048, // Increase cache size
        transition: 0 // Disable transition for faster rendering
      }),
      visible: this.getLayerVisibility(rasterData.id),
      opacity: this.layerSettings[rasterData.id]?.opacity || 1,
      preload: 2, // Preload 2 levels for smoother zooming
      properties: {
        id: rasterData.id,
        name: rasterData.display_name || rasterData.file_name,
        type: 'raster',
        layerData: rasterData,
        isWMS: true,
        isTiled: true,
        actualLayerName: layerName,
        originalLayerName: rasterData.geoserver_layer_name,
        proxyUrl: proxyUrl,
        originalUrl: rasterData.geoserver_url,
        wmsConfig: wmsConfig,
        loadingStatus: 'pending',
        layerCorrected: false
      }
    });
  }

  // Create ImageWMS layer for standard rasters
  createImageWMSLayer(proxyUrl, layerName, rasterData) {
    const wmsConfig = {
      version: '1.3.0',
      params: {
        'LAYERS': layerName,
        'FORMAT': 'image/png',
        'TRANSPARENT': true,
        'CRS': 'EPSG:4326',  // Keep original for smaller rasters
        'STYLES': ''
      }
    };

    

    return new ImageLayer({
      source: new ImageWMS({
        url: proxyUrl,
        params: {
          ...wmsConfig.params,
          'VERSION': wmsConfig.version
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
        ratio: 1.5, // Slightly larger ratio for better caching
        imageLoadFunction: undefined // Use default loading
      }),
      visible: this.getLayerVisibility(rasterData.id),
      opacity: this.layerSettings[rasterData.id]?.opacity || 1,
      properties: {
        id: rasterData.id,
        name: rasterData.display_name || rasterData.file_name,
        type: 'raster',
        layerData: rasterData,
        isWMS: true,
        isTiled: false,
        actualLayerName: layerName,
        originalLayerName: rasterData.geoserver_layer_name,
        proxyUrl: proxyUrl,
        originalUrl: rasterData.geoserver_url,
        wmsConfig: wmsConfig,
        loadingStatus: 'pending',
        layerCorrected: false
      }
    });
  }

  // NEW: Preload layer data to speed up visibility changes
 preloadLayer(layer) {
  const layerId = layer.get('id');
  if (this.preloadedLayers.has(layerId)) return;



  const source = layer.getSource();

  // Create a new invisible temp layer with the same source
  const tempLayer = new layer.constructor({
    source: source, // reuse same source reference
    visible: true,
    opacity: 0,
    properties: layer.getProperties()
  });

  const handlePreloadComplete = () => {

    this.preloadedLayers.set(layerId, true);
    if (tempLayer.getMap()) {
      tempLayer.getMap().removeLayer(tempLayer);
    }
  };

  if (source.on) {
    source.once('imageloadend', handlePreloadComplete);
    source.once('tileloadend', handlePreloadComplete);
  }

  setTimeout(() => {
    this.preloadedLayers.set(layerId, 'attempted');
  }, 100);
}


  // NEW: Fast visibility toggle with preloaded data
  fastVisibilityToggle(layer, visible) {
    const layerId = layer.get('id');
    const isPreloaded = this.preloadedLayers.has(layerId);
    
    if (visible && !isPreloaded) {
      
      // Apply optimizations for faster loading
      const source = layer.getSource();
      
      if (source.setRatio) {
        source.setRatio(1); // Reduce ratio for faster initial load
      }
      
      // Set loading indicator
      layer.set('fastLoading', true);
      
      const handleFastLoad = () => {
        layer.set('fastLoading', false);
       
      };
      
      if (source.once) {
        source.once('imageloadend', handleFastLoad);
        source.once('tileloadend', handleFastLoad);
      }
    }
    
    layer.setVisible(visible);
  }

  // Async validation and correction of layer name
  async validateAndCorrectLayerAsync(layer, rasterData) {
    try {
      // Validate and potentially correct the layer name
      const validation = await this.validateAndCorrectLayerName(
        rasterData.geoserver_url, 
        rasterData.geoserver_layer_name
      );
      
      if (!validation.isValid) {
        console.error('❌ Layer validation failed:', validation);
        layer.set('loadingStatus', 'error');
        layer.set('errorMessage', `Layer "${rasterData.geoserver_layer_name}" not found`);
        this.showLayerError(rasterData.geoserver_layer_name, validation);
        return;
      }

      const finalLayerName = validation.correctedName;
      
      if (!validation.wasCorrect) {

        // Update the layer source with corrected name
        const source = layer.getSource();
        const currentParams = source.getParams ? source.getParams() : source.getParams?.() || {};
        
        if (source.updateParams) {
          source.updateParams({
            ...currentParams,
            'LAYERS': finalLayerName
          });
        }
        
        // Update layer properties
        layer.set('actualLayerName', finalLayerName);
        layer.set('layerCorrected', true);
      }

      // Set up async loading with performance optimizations
      this.setupOptimizedAsyncLoading(layer, finalLayerName);

    } catch (error) {
      console.error('❌ Async validation failed:', error);
      layer.set('loadingStatus', 'error');
      layer.set('errorMessage', error.message);
    }
  }

  // OPTIMIZED: Set up async layer loading with performance enhancements
  setupOptimizedAsyncLoading(layer, layerName) {
    const source = layer.getSource();
    let loadAttempted = false;
    let loadStartTime = Date.now();

    // Set up event listeners for loading status
    const handleImageLoadStart = () => {
      loadStartTime = Date.now();
 
      layer.set('loadingStatus', 'loading');
    };

    const handleImageLoadEnd = () => {
      const loadTime = Date.now() - loadStartTime;
   
      layer.set('loadingStatus', 'loaded');
      layer.set('loadTime', loadTime);
    };

    const handleImageLoadError = (event) => {
      console.warn('⚠️ Optimized image load error for:', layerName, event);
      layer.set('loadingStatus', 'error');
      
      // Try fallback configuration
      if (!loadAttempted) {
        loadAttempted = true;

        this.tryOptimizedFallbackConfiguration(layer);
      }
    };

    // Add event listeners
    if (source.on) {
      source.on('imageloadstart', handleImageLoadStart);
      source.on('imageloadend', handleImageLoadEnd);
      source.on('imageloaderror', handleImageLoadError);
      
      // For tile sources
      source.on('tileloadstart', handleImageLoadStart);
      source.on('tileloadend', handleImageLoadEnd);
      source.on('tileloaderror', handleImageLoadError);
    }

    // Trigger initial load with optimizations
    try {
      // Apply loading optimizations
      if (source.setRatio && typeof source.setRatio === 'function') {
        source.setRatio(1.2); // Slightly larger ratio for better caching
      }
      
      source.refresh();
    } catch (error) {
      console.warn('Error triggering optimized initial refresh:', error);
    }
  }

  // OPTIMIZED: Try fallback WMS configuration with performance tweaks
  tryOptimizedFallbackConfiguration(layer) {
    const source = layer.getSource();
    const currentParams = source.getParams ? source.getParams() : {};
    
    // Try with different optimizations
    const fallbackParams = {
      ...currentParams,
      'CRS': 'EPSG:3857',  // Web Mercator for better performance
      'VERSION': '1.1.1',  // Older version fallback
      'SRS': 'EPSG:3857',   // For older version compatibility
      'FORMAT': 'image/jpeg', // Try JPEG for faster loading (if transparency not needed)
      'BGCOLOR': '0xFFFFFF' // White background for JPEG
    };

    if (source.updateParams) {
      source.updateParams(fallbackParams);
    }
    
    // Update layer properties
    layer.set('loadingStatus', 'retrying');
    if (layer.get('wmsConfig')) {
      layer.get('wmsConfig').params = fallbackParams;
    }
  }

  // Enhanced error display for users
  showLayerError(originalLayerName, validation) {
    const errorMessage = `
🚨 Raster Layer Error: "${originalLayerName}"

❌ Problem: Layer not found in GeoServer

🔍 Available layers: ${validation.availableLayers?.join(', ') || 'none found'}

💡 Suggestions:
1. Check the layer name spelling
2. Ensure the layer is published in GeoServer
3. Verify the workspace is correct
4. Contact your GeoServer administrator
    `.trim();

    console.error(errorMessage);
    
    // Dispatch error to Redux store for UI display
    if (this.dispatch) {
      this.dispatch({
        type: 'SHOW_LAYER_ERROR',
        payload: {
          layerName: originalLayerName,
          error: errorMessage,
          availableLayers: validation.availableLayers
        }
      });
    }
  }

  // Query WMS layer (enhanced with better error handling)
  async queryWMSLayer(map, layer, evt) {
    const source = layer.getSource();
    const view = map.getView();
    const resolution = view.getResolution();
    const projection = view.getProjection();
   
    let url;
   
    if (source instanceof ImageWMS) {
      try {
        url = source.getFeatureInfoUrl(
          evt.coordinate,
          resolution,
          projection,
          {
            'INFO_FORMAT': 'application/json',
            'FEATURE_COUNT': 50
          }
        );
      } catch (error) {
        console.error('Error creating GetFeatureInfo URL:', error);
        return [];
      }
    } else if (source instanceof TileWMS) {
      try {
        url = source.getFeatureInfoUrl(
          evt.coordinate,
          resolution,
          projection,
          {
            'INFO_FORMAT': 'application/json',
            'FEATURE_COUNT': 50
          }
        );
      } catch (error) {
        console.error('Error creating TileWMS GetFeatureInfo URL:', error);
        return [];
      }
    }

    if (!url) {
      console.warn('No GetFeatureInfo URL generated for layer:', layer.get('name'));
      return [];
    }

    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json,text/plain,*/*',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
        
          return data.features.map(feature => ({
            feature: feature,
            layer: layer.get('name'),
            layerType: layer.get('type'),
            properties: feature.properties,
            layerData: layer.get('layerData'),
            geometry: feature.geometry,
            isWMSFeature: true
          }));
        } else {
          console.log('WMS query returned no features for layer:', layer.get('name'));
        }
      } else {
        console.warn('WMS query returned non-JSON response:', contentType);
      }
    } catch (error) {
      console.error('Error querying WMS raster layer (via proxy):', error);
    }
    
    return [];
  }

  // NEW: Get layer performance metrics
  getLayerPerformanceMetrics(layer) {
    return {
      loadingStatus: layer.get('loadingStatus'),
      loadTime: layer.get('loadTime'),
      isTiled: layer.get('isTiled'),
      isPreloaded: this.preloadedLayers.has(layer.get('id')),
      isFastLoading: layer.get('fastLoading')
    };
  }

  // NEW: Clear caches for better memory management
  clearCaches() {
    this.layerCache.clear();
    this.preloadedLayers.clear();
  }

  // Get layer loading status
  getLayerLoadingStatus(layer) {
    return layer.get('loadingStatus') || 'unknown';
  }

  // Refresh layer if needed
  refreshLayer(layer) {
    const source = layer.getSource();
    if (source instanceof ImageWMS || source instanceof TileWMS) {
 
      layer.set('loadingStatus', 'refreshing');
      source.refresh();
    }
  }
}