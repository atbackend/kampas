import React from 'react';

const ThreeDWindow = ({ onClose, width }) => (
  <div style={{ width }} className="h-full border-l bg-white shadow-md flex flex-col">
    <div className="bg-gray-200 p-2 flex justify-between items-center">
      <h3 className="text-sm font-semibold">3D View</h3>
      <button onClick={onClose} className="text-red-500">✕</button>
    </div>
    <div className="flex-grow p-4">3D Content</div>
  </div>
);

export default ThreeDWindow;
