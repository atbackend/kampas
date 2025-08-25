// VectorLayerManager.jsx - Enhanced version with robust error handling
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import TileWMS from "ol/source/TileWMS";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Fill, Stroke } from "ol/style";
import { bbox as bboxStrategy } from 'ol/loadingstrategy';
import { GeoServerDiagnostics } from "./GeoServerDiagnostics";

// Add this method to your existing VectorLayerManager class
export class VectorLayerManager {
  constructor(dispatch, getLayerVisibility, layerSettings) {
    this.dispatch = dispatch;
    this.getLayerVisibility = getLayerVisibility;
    this.layerSettings = layerSettings;
  }

  // ADD THIS NEW METHOD
  convertToProxyUrl(geoserverUrl) {
    // Convert direct GeoServer URL to use Vite proxy
    if (geoserverUrl.includes('192.168.29.247:8080')) {
      return geoserverUrl.replace('http://192.168.29.247:8080', '');
    }
    return geoserverUrl;
  }

  // CHANGE THIS METHOD
  createVectorLayer(vectorData) {
    if (!vectorData.geoserver_url || !vectorData.name) {
      console.warn('Missing GeoServer URL or layer name for vector layer:', vectorData);
      return null;
    }
    
    // REPLACE THE HARDCODED URL WITH PROXY URL
    const proxyUrl = this.convertToProxyUrl(vectorData.geoserver_url);
  
    
    const diagnostics = new GeoServerDiagnostics(proxyUrl, 'in');
    diagnostics.runDiagnostics();

  

    // For now, always use WMS due to CORS issues with WFS
    // TODO: Configure GeoServer CORS settings to enable WFS
   
    return this.createVectorLayerFromWMS(vectorData);
  }

  // CHANGE THIS METHOD
  createVectorLayerFromWMS(vectorData) {

    
    // CONVERT TO PROXY URL
    const proxyUrl = this.convertToProxyUrl(vectorData.geoserver_url);
    
    // Ensure we have the correct WMS URL
    let wmsUrl = proxyUrl; // USE PROXY URL INSTEAD OF DIRECT URL
    if (!wmsUrl.includes('/wms')) {
      wmsUrl = wmsUrl.replace(/\/[^\/]*$/, '/wms');
    }

    const wmsParams = {
      'LAYERS': vectorData.name,
      'TILED': true,
      'FORMAT': 'image/png',
      'TRANSPARENT': true,
      'VERSION': '1.1.1',
      'SRS': 'EPSG:3857',
      'STYLES': '',
      'BGCOLOR': '0xFFFFFF'
    };

 
    const wmsSource = new TileWMS({
      url: wmsUrl, // THIS NOW USES PROXY URL
      params: wmsParams,
      serverType: 'geoserver',
      crossOrigin: 'anonymous',
      transition: 300,
      projection: 'EPSG:3857'
    });

    const layer = new TileLayer({
      source: wmsSource,
      visible: this.getLayerVisibility(vectorData.id),
      opacity: this.layerSettings[vectorData.id]?.opacity || 1,
      properties: { 
        id: vectorData.id, 
        name: vectorData.display_name || vectorData.name,
        type: 'vector',
        layerData: vectorData,
        isWMS: true
      }
    });

    this.addEnhancedTileLoadEventListeners(wmsSource, vectorData.name, vectorData);
    this.testWMSUrl(wmsSource, vectorData.name);
    
    return layer;
  }


  createVectorStyle(vectorData) {
    // Create different styles based on geometry type
    const geometryType = vectorData.geometry_type?.toLowerCase();
    
    let strokeColor = '#3399CC';
    let fillColor = 'rgba(51, 153, 204, 0.1)';
    let strokeWidth = 2;
    
    // Customize style based on geometry type
    switch (geometryType) {
      case 'point':
      case 'multipoint':
        strokeColor = '#CC3333';
        fillColor = 'rgba(204, 51, 51, 0.7)';
        strokeWidth = 2;
        break;
      case 'linestring':
      case 'multilinestring':
        strokeColor = '#33CC33';
        strokeWidth = 3;
        fillColor = 'transparent';
        break;
      case 'polygon':
      case 'multipolygon':
        strokeColor = '#3399CC';
        fillColor = 'rgba(51, 153, 204, 0.2)';
        strokeWidth = 2;
        break;
    }

    return new Style({
      stroke: new Stroke({
        color: strokeColor,
        width: strokeWidth
      }),
      fill: new Fill({
        color: fillColor
      })
    });
  }

  addEnhancedLoadEventListeners(source, layerName, type, vectorData) {
    source.on('featuresloadstart', () => {
    
    });

    source.on('featuresloadend', () => {
      const featureCount = source.getFeatures().length;
      
      
      // Log additional info about the features
      if (featureCount > 0) {
        const firstFeature = source.getFeatures()[0];
      
      }
    });

    source.on('featuresloaderror', (event) => {
      console.error(`${type} features load error for:`, layerName);
      console.error('Error details:', event);
      console.error('Vector data:', vectorData);
      
      // Try to provide helpful error information
      if (event.target && event.target.getUrl) {
        console.error('Failed URL:', event.target.getUrl());
      }
      
      // Dispatch an action to notify the user about the error
      if (this.dispatch) {
        this.dispatch({
          type: 'LAYER_LOAD_ERROR',
          payload: {
            layerId: vectorData.id,
            layerName: layerName,
            error: 'Failed to load WFS features',
            details: event
          }
        });
      }
    });

    // Add change event listener to track feature loading progress
    source.on('change', () => {
      const state = source.getState();
 
      
      if (state === 'ready' && source.getFeatures().length === 0) {
        console.warn(`${type} layer ${layerName} loaded but contains no features`);
      }
    });
  }

  addEnhancedTileLoadEventListeners(source, layerName, vectorData = null) {
    let loadingTiles = 0;
    let errorCount = 0;
    let successCount = 0;

    source.on('tileloadstart', (event) => {
      loadingTiles++;
      
    });

    source.on('tileloadend', (event) => {
      loadingTiles--;
      successCount++;
    
      
      // Log first successful tile URL for debugging
      if (successCount === 1) {
        
      }
    });

    source.on('tileloaderror', (event) => {
      loadingTiles--;
      errorCount++;
      
      
      // If too many tile errors, dispatch a notification
      if (errorCount > 3 && successCount === 0) {
       
        
        if (this.dispatch && vectorData) {
          this.dispatch({
            type: 'LAYER_TILE_ERRORS',
            payload: {
              layerId: vectorData.id,
              layerName: layerName,
              errorCount: errorCount,
              successCount: successCount,
              suggestion: 'Check layer name and GeoServer configuration'
            }
          });
        }
      }
    });
  }

  async queryWMSLayer(map, layer, evt) {
    const source = layer.getSource();
    const view = map.getView();
    const resolution = view.getResolution();
    const projection = view.getProjection();
    
    let url;
    
    if (source instanceof TileWMS) {
      url = source.getFeatureInfoUrl(
        evt.coordinate,
        resolution,
        projection,
        {
          'INFO_FORMAT': 'application/json',
          'FEATURE_COUNT': 50,
          'FORMAT_OPTIONS': 'charset:UTF-8'
        }
      );
    }

    if (!url) return [];



    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
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
      
      }
    } catch (error) {
      console.error('Error querying WMS vector layer:', error);
      if (error.name === 'AbortError') {
        console.error('WMS query timed out');
      }
    }

    return [];
  }

  // Helper method to test WMS URL
  async testWMSUrl(source, layerName) {
    try {
      // Get a sample tile URL to test
      const tileGrid = source.getTileGrid();
      if (tileGrid) {
        const testCoord = [0, 0, 0]; // z=0, x=0, y=0
        const testUrl = source.getTileUrlFunction()(testCoord, 1, 'EPSG:3857');
        
       
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(testUrl, { 
          signal: controller.signal,
          method: 'HEAD'
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`WMS URL test successful for ${layerName}`);
        } else {
          console.warn(`WMS URL test failed for ${layerName}:`, response.status, response.statusText);
        }
      }
    } catch (error) {
      console.warn(`WMS URL test error for ${layerName}:`, error.message);
    }
  }

  // Helper method to validate GeoServer URL
  validateGeoServerUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      console.error('Invalid GeoServer URL:', url, error);
      return false;
    }
  }

  // Helper method to test GeoServer capabilities
  async testGeoServerCapabilities(baseUrl) {
    const capabilitiesUrl = `${baseUrl}?service=WFS&version=2.0.0&request=GetCapabilities`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(capabilitiesUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
      
        return true;
      } else {
        
        return false;
      }
    } catch (error) {
    
      return false;
    }
  }
}







