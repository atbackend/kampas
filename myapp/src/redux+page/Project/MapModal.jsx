// components/projects/modals/MapModal.jsx
import React from 'react';
import { X } from 'lucide-react';

const MapModal = ({ project, onClose }) => {
  if (!project) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Project Location</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="text-white">
          <h4 className="font-medium mb-2">{project.projectName}</h4>
          <p className="text-gray-300 mb-4">{project.location?.address || 'No address available'}</p>
          <div className="bg-gray-700 p-4 rounded">
            <p className="text-sm text-gray-400">
              Coordinates: {project.location?.lat || 'N/A'}, {project.location?.lng || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapModal;