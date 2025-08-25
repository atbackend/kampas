import React from 'react';

const ProcessingToolbox = ({ onClose }) => (
  <div className="fixed top-0 right-0 h-full w-[300px] bg-white border-l shadow-lg z-50 flex flex-col">
    <div className="bg-gray-200 p-2 flex justify-between items-center">
      <h3 className="text-sm font-semibold">Processing Toolbox</h3>
      <button onClick={onClose} className="text-red-500">✕</button>
    </div>
    <div className="flex-grow p-4">Geo Analysis Tools</div>
  </div>
);

export default ProcessingToolbox;

