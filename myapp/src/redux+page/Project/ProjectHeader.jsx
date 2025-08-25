
// components/projects/ProjectHeader.jsx
import React from 'react';
import { FolderOpen } from 'lucide-react';

const ProjectHeader = ({header}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center space-x-3">
        <FolderOpen className="text-blue-400" size={28} />
        <h1 className="text-2xl font-semibold">{header}</h1>
      </div>
    </div>
  );
};

export default ProjectHeader;