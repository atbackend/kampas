// CoordinateDisplay.jsx - Component to display coordinates and feature information
import React from 'react';
import { toLonLat } from 'ol/proj';

const CoordinateDisplay = ({ mapClickData, showProperties, onClose }) => {
  if (!showProperties || !mapClickData) return null;

  const formatCoordinate = (coord) => {
    if (!coord || coord.length !== 2) return 'N/A';
    const [lon, lat] = toLonLat(coord);
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  };

  const formatFeatureProperties = (feature) => {
    if (!feature.properties) return {};
    
    // Filter out geometry and large data fields for display
    const filtered = {};
    Object.entries(feature.properties).forEach(([key, value]) => {
      if (key !== 'geometry' && typeof value !== 'object') {
        filtered[key] = value;
      }
    });
    return filtered;
  };

  return (
    <div className="absolute bottom-3 right-3 bg-white shadow-lg rounded-lg p-4 max-w-md max-h-80 overflow-auto z-10 border">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold text-lg text-gray-800">Feature Information</h4>
        <button 
          onClick={onClose}
          className="text-red-500 hover:text-red-700 font-bold text-lg"
          title="Close"
        >
          ✕
        </button>
      </div>
      
      {/* Coordinates Section */}
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <h5 className="font-semibold text-blue-800 mb-1">Coordinates</h5>
        <div className="text-sm">
          <div><strong>Lat, Lon:</strong> {formatCoordinate(mapClickData.coordinates)}</div>
          <div className="text-xs text-gray-600 mt-1">
            <strong>Web Mercator:</strong> 
            <br />
            X: {mapClickData.coordinates?.[0]?.toFixed(2) || 'N/A'}
            <br />
            Y: {mapClickData.coordinates?.[1]?.toFixed(2) || 'N/A'}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div>
        <h5 className="font-semibold text-gray-800 mb-2">
          Features ({mapClickData.features?.length || 0})
        </h5>
        
        {mapClickData.features && mapClickData.features.length > 0 ? (
          <div className="space-y-3">
            {mapClickData.features.map((feature, idx) => (
              <div key={idx} className="border-l-4 border-green-500 pl-3 py-2 bg-gray-50 rounded">
                <div className="flex justify-between items-center mb-2">
                  <strong className="text-green-700">{feature.layer}</strong>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {feature.layerType}
                  </span>
                </div>
                
                {feature.isWMSFeature && (
                  <div className="text-xs text-blue-600 mb-1">WMS Feature</div>
                )}
                
                <div className="text-sm">
                  {Object.keys(formatFeatureProperties(feature)).length > 0 ? (
                    <div className="bg-white p-2 rounded border max-h-32 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(formatFeatureProperties(feature), null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-gray-500 italic text-xs">No properties available</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-sm italic p-3 bg-gray-50 rounded">
            No features found at this location
          </div>
        )}
      </div>

      {/* Street Image Info */}
      {mapClickData.streetImage && (
        <div className="mt-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-500">
          <h5 className="font-semibold text-yellow-800 mb-2">Street Image</h5>
          <div className="text-sm">
            <div><strong>Filename:</strong> {mapClickData.streetImage.original_filename}</div>
            <div><strong>Type:</strong> {mapClickData.streetImage.image_type}</div>
            <div><strong>Status:</strong> {mapClickData.streetImage.processing_status}</div>
            {mapClickData.streetImage.captured_at && (
              <div><strong>Captured:</strong> {new Date(mapClickData.streetImage.captured_at).toLocaleString()}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinateDisplay;