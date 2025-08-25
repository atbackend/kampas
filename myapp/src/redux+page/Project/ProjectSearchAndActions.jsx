import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Filter, FolderOpen } from 'lucide-react';
import { setSearchTerm, toggleFilterPanel } from './ProjectSlice';

const ProjectSearchAndActions = ({ onAddProject }) => {
  const dispatch = useDispatch();
  const { searchTerm, showFilterPanel } = useSelector(state => state.projects);

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          className="p-3 pl-10 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 w-80 shadow-sm"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => dispatch(setSearchTerm(e.target.value))}
        />
      </div>

      <div className="flex items-center space-x-2">
        
        <button
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-500 transition-colors shadow-md hover:shadow-lg flex items-center space-x-2 font-medium"
          onClick={onAddProject}
        >
          
         <FolderOpen size={18}  />
         <span>Add Project</span>
        </button>

        <button
          className={`h-12 px-4 py-3 rounded-lg transition-colors shadow-md hover:shadow-lg  ${
            showFilterPanel 
              ? 'bg-blue-600 text-white hover:bg-blue-500' 
              : 'bg-gray-600 text-white hover:bg-gray-500'
          }`}
          onClick={() => dispatch(toggleFilterPanel())}
          title="Filter"
        >
          <Filter size={20} />
        </button>
      </div>
    </div>
  );
};

export default ProjectSearchAndActions;