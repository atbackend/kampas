// TerrainLayerManager.jsx - Manages base layers (OSM, Satellite, Terrain)
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";

export class TerrainLayerManager {
  constructor(dispatch, layerVisibility) {
    this.dispatch = dispatch;
    this.layerVisibility = layerVisibility;
  }

  createBaseLayers() {
    const osmLayer = new TileLayer({
      source: new OSM(),
      properties: { name: 'osm', type: 'base', id: 'osm' }
    });

    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        crossOrigin: "anonymous",
      }),
      visible: false,
      properties: { name: 'satellite', type: 'base', id: 'satellite' }
    });

    const terrainLayer = new TileLayer({
      source: new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
        crossOrigin: "anonymous",
      }),
      visible: this.layerVisibility['terrain'] === true,
      properties: { name: 'terrain', type: 'base', id: 'terrain' }
    });

    return [osmLayer, satelliteLayer, terrainLayer];
  }

  switchBaseLayer(map, layerName, dispatch) {
    console.log('Switching to base layer:', layerName);
    const layers = map.getLayers().getArray();

    layers.forEach(layer => {
      if (layer.get('type') === 'base') {
        const shouldShow = layer.get('name') === layerName;
        layer.setVisible(shouldShow);
        
        if (layer.get('name') === 'terrain') {
          dispatch({ type: 'SET_LAYER_VISIBILITY', payload: { layerId: 'terrain', visibility: shouldShow } });
        }
      }
    });
  }

  getActiveBaseLayer(map) {
    const layers = map.getLayers().getArray();
    const activeBase = layers.find(layer => 
      layer.get('type') === 'base' && layer.getVisible()
    );
    return activeBase ? activeBase.get('name') : 'osm';
  }
}