// MapControls.jsx - Control buttons and base layer switcher
import React from 'react';

const MapControls = ({ 
  toggleToolbox, 
  onOpen3D, 
  onOpenImage, 
  onOpenLayers, 
  onSwitchBaseLayer,
  activeBaseLayer = 'osm'
}) => {
  return (
    <>
      {/* Top-right control buttons */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
        {toggleToolbox && (
          <button
            onClick={toggleToolbox}
            className="bg-white shadow-md px-3 py-2 rounded hover:bg-gray-100 transition-colors"
            title="Toggle Toolbox"
          >
            🛠️
          </button>
        )}

        {onOpenLayers && (
          <button
            onClick={onOpenLayers}
            className="bg-white shadow-md px-3 py-2 rounded hover:bg-gray-100 transition-colors"
            title="Open Layers Panel"
          >
            📑
          </button>
        )}

        {onOpen3D && (
          <button
            onClick={onOpen3D}
            className="bg-white shadow-md px-3 py-2 rounded hover:bg-gray-100 transition-colors"
            title="Open 3D View"
          >
            🗻
          </button>
        )}

        {onOpenImage && (
          <button
            onClick={onOpenImage}
            className="bg-white shadow-md px-3 py-2 rounded hover:bg-gray-100 transition-colors"
            title="Open Street View"
          >
            📷
          </button>
        )}
      </div>

      {/* Bottom-left base layer switcher */}
      <div className="absolute bottom-3 left-3 flex gap-2 z-10 bg-white rounded-lg shadow-md p-2">
        <button
          onClick={() => onSwitchBaseLayer("osm")}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            activeBaseLayer === 'osm' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          OSM
        </button>
        <button
          onClick={() => onSwitchBaseLayer("satellite")}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            activeBaseLayer === 'satellite' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Satellite
        </button>
        <button
          onClick={() => onSwitchBaseLayer("terrain")}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            activeBaseLayer === 'terrain' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Terrain
        </button>
      </div>
    </>
  );
};

export default MapControls;