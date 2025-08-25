import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getStreetImages } from './streetSlice'; // adjust path

const ImageWindow = ({ onClose, width }) => {
  const dispatch = useDispatch();
 const projectId = useSelector((state) => state.map.activeProjectId);
 console.log('street',projectId)
  // Safe destructuring with defaults
  const { items = [], loading = false, error = null, count = 0 } =
    useSelector((state) => state.street || {});


  useEffect(() => {
    if (projectId) {
      dispatch(getStreetImages({ projectId }));
    }
  }, [projectId, dispatch]);


  // Log data to console whenever it changes
  useEffect(() => {
    if (items.length > 0) {
      console.log("Street Images Response:", items);
    }
  }, [items]);

  return (
    <div style={{ width }} className="h-full border-l bg-white shadow-md flex flex-col">
      {/* Header */}
      <div className="bg-gray-200 p-2 flex justify-between items-center">
        <h3 className="text-sm font-semibold">Street View</h3>
        <button onClick={onClose} className="text-red-500">✕</button>
      </div>

      {/* Body */}
      <div className="flex-grow p-4 overflow-auto">
        {loading && <p>Loading street images...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && count === 0 && <p>No street images found.</p>}

        <div className="grid grid-cols-1 gap-4">
          {items.map((img) => (
            <div key={img.id} className="border rounded shadow-sm p-2">
              <p className="text-xs text-gray-600">{img.original_filename}</p>
              <img
                src={img.file_path}
                alt={img.original_filename}
                className="mt-1 w-full object-cover rounded"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageWindow;
