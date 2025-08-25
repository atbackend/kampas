import React, { useState } from 'react';
import LayersWindow from './LayersWindow'; // Default import
import UploadPanel from './UploadPanel';   // Default import

const SidePanels = () => {
  const [showLayers, setShowLayers] = useState(true);
  const [showUpload, setShowUpload] = useState(false); // Changed to false initially

  return (
    <div className="flex h-screen">
      {showLayers && (
        <LayersWindow onClose={() => setShowLayers(false)} />
      )}
      {showUpload && (
        <UploadPanel onClose={() => setShowUpload(false)} />
      )}
      
      {/* Demo controls */}
      {!showLayers && !showUpload && (
        <div className="flex-1 flex items-center justify-center bg-gray-100">
          <div className="space-x-4">
            <button
              onClick={() => setShowLayers(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Show Layers Panel
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Show Upload Panel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SidePanels;