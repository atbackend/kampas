import React, { useState } from 'react';
import { 
  Eye, 
  Settings, 
  Download, 
  Upload,
  Layers,
  Move3D,
  Filter,
  Palette,
  Grid,
  MoreVertical,
  List,


} from 'lucide-react';


export const LayerToolbar = () => {
  const [activeView, setActiveView] = useState('layers');

  const toolbarItems = [
    { id: 'select', icon: <Move3D size={16} />, tooltip: 'Select Tool', active: true },
    { id: 'visibility', icon: <Eye size={16} />, tooltip: 'Toggle Visibility' },
    { id: 'filter', icon: <Filter size={16} />, tooltip: 'Layer Filters' },
    { id: 'style', icon: <Palette size={16} />, tooltip: 'Layer Styling' },
    { id: 'export', icon: <Download size={16} />, tooltip: 'Export Layers' },
    { id: 'import', icon: <Upload size={16} />, tooltip: 'Import Data' },
    { id: 'grid', icon: <Grid size={16} />, tooltip: 'Grid View' },
    { id: 'settings', icon: <Settings size={16} />, tooltip: 'Layer Settings' },
  ];

  return (
    <div className="bg-gray-600 border-b border-gray-500 px-3 py-2">
      <div className="flex flex-wrap items-center gap-1">
        {/* Tools */}
        {toolbarItems.map((item) => (
          <button
            key={item.id}
            className={`p-2 rounded transition-colors ${
              item.active
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-300 hover:bg-gray-500 hover:text-white'
            }`}
            title={item.tooltip}
          >
            {item.icon}
          </button>
        ))}

        {/* View Toggle */}
        <div className="flex items-center space-x-1 bg-gray-700 rounded p-1 ml-auto">
          <button
            onClick={() => setActiveView('layers')}
            className={`p-1.5 rounded text-xs transition-colors ${
              activeView === 'layers'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Layers size={14} />
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`p-1.5 rounded text-xs transition-colors ${
              activeView === 'list'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <List size={14} />
          </button>
        </div>

        {/* More */}
        <button className="p-2 rounded text-gray-300 hover:bg-gray-500 hover:text-white transition-colors">
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  );
};
