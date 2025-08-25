import { roadsLayer, satelliteLayer, terrainLayer, pointCloudLayer } from './maplayers';

const olLayersMap = {
  roads: roadsLayer,
  boundaries: null,
  rivers: null,
  adminAreas: null,
  satellite: satelliteLayer,
  elevationModel: terrainLayer,
  pointCloud: pointCloudLayer
};

export const toggleLayerVisibility = (layerId) => {
  const layer = olLayersMap[layerId];
  if (layer) {
    layer.setVisible(!layer.getVisible());
  }
};
