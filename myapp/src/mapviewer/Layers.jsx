import { Vector as VectorLayer } from 'ol/layer';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import { Group as LayerGroup } from 'ol/layer';

function getCategorizedLayers(map) {
  const categories = {
    vector: [],
    raster: [],
    terrain: [],
    pointCloud: []
  };

  if (!map) return categories;

  const layers = map.getLayers().getArray();

  const traverseLayers = (layerList) => {
    layerList.forEach(layer => {
      if (layer instanceof LayerGroup) {
        traverseLayers(layer.getLayers().getArray());
      } else if (layer instanceof VectorLayer) {
        categories.vector.push({
          name: layer.get('title') || 'Untitled Vector Layer',
          visible: layer.getVisible(),
          olLayer: layer
        });
      } else if (layer instanceof TileLayer || layer instanceof ImageLayer) {
        // Assume raster unless marked as terrain
        if (layer.get('type') === 'terrain') {
          categories.terrain.push({
            name: layer.get('title') || 'Terrain Layer',
            visible: layer.getVisible(),
            olLayer: layer
          });
        } else {
          categories.raster.push({
            name: layer.get('title') || 'Raster Layer',
            visible: layer.getVisible(),
            olLayer: layer
          });
        }
      } else if (layer.get('type') === 'pointCloud') {
        categories.pointCloud.push({
          name: layer.get('title') || 'Point Cloud Layer',
          visible: layer.getVisible(),
          olLayer: layer
        });
      }
    });
  };

  traverseLayers(layers);
  return categories;
}
export default getCategorizedLayers;