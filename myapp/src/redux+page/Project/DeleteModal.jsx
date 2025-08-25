import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const DeleteConfirmationModal = ({ isOpen, onClose, project, onConfirm, loading = false }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(project);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <AlertTriangle className="text-red-400 mr-2" size={20} />
            Delete Project
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-2">
            Are you sure you want to delete this project?
          </p>
          <div className="bg-gray-700 p-3 rounded border-l-4 border-red-500">
            <p className="text-white font-medium">{project?.projectName}</p>
            <p className="text-sm text-gray-400">Client: {project?.client || 'N/A'}</p>
          </div>
          <p className="text-red-400 text-sm mt-2">
            <strong>Warning:</strong> This action cannot be undone. All project data, including associated files and records, will be permanently deleted.
          </p>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              'Delete Project'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;