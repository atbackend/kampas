import React, { useState, useEffect } from 'react';

const UploadPanel = ({ onClose, height = '180px' }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);

  // Setup global drag/drop handlers
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      setDragActive(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      setDragActive(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        setUploadedImage(URL.createObjectURL(file));
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedImage(URL.createObjectURL(file));
    }
  };

  return (
    <div style={{ height }} className="w-full fixed bottom-0 left-0 bg-white shadow-md border-t z-50 flex flex-col">
      {/* Title */}
      <div className="bg-gray-200 p-2 flex justify-between items-center">
        <h3 className="text-sm font-semibold">Upload Image</h3>
        <button onClick={onClose} className="text-red-500">✕</button>
      </div>

      {/* Drop Zone */}
      <div
        className={`flex-grow flex items-center justify-center border-2 border-dashed rounded-md m-4 transition ${
          dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-gray-500 text-sm">Drag & drop or click to upload image</p>
          {uploadedImage && (
            <img
              src={uploadedImage}
              alt="Preview"
              className="mt-4 max-w-xs max-h-32 object-contain rounded shadow"
            />
          )}
        </label>
      </div>
    </div>
  );
};

export default UploadPanel;
