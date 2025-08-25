import React from "react";

const DeleteConfirmationModal = ({ isOpen, onClose, onDelete, workspace }) => {
  const handleDelete = () => {
    onDelete(workspace); // Pass the user to be deleted
    onClose(); // Close the modal
  };

  return (
    isOpen && (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-1/3">
          <h2 className="text-xl text-white mb-4">Confirm Delete</h2>
          <p className="text-white mb-4">
            Are you sure you want to delete Workspace <strong>{workspace.name}</strong>?
          </p>
          <div className="flex justify-end gap-4 mt-4">
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-md"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default DeleteConfirmationModal;
