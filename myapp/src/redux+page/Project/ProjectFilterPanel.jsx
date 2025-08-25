// components/projects/ProjectFilterPanel.jsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { setFilter, toggleFilterPanel } from './ProjectSlice';

const ProjectFilterPanel = () => {
  const dispatch = useDispatch();
  const { filter, showFilterPanel } = useSelector(state => state.projects);

  if (!showFilterPanel) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-800 border-l border-gray-700 z-40 transition-transform duration-300">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">Filters</h3>
          <button
            onClick={() => dispatch(toggleFilterPanel())}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filter.status}
              onChange={(e) => dispatch(setFilter({ status: e.target.value }))}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={filter.priority}
              onChange={(e) => dispatch(setFilter({ priority: e.target.value }))}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => dispatch(setFilter({ status: 'all', priority: 'all' }))}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectFilterPanel;