import React from 'react';

const PropertiesPanel = ({ onClose }) => {
  return (
    <div className="h-[20%] w-full bg-gray-100 border-t border-gray-300 p-2 relative">
      <button onClick={onClose} className="absolute top-1 right-2 text-sm text-gray-600">✖</button>
      <p className="text-sm">Feature Properties</p>
      {/* Add properties here */}
    </div>
  );
};

export default PropertiesPanel;