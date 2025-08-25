import { Filter, Search } from "lucide-react";

export const ProjectSearchFilter = ({ searchTerm, setSearchTerm, filterStatus, setFilterStatus }) => {
  return (
    <div className="p-3 border-b border-gray-600 space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm bg-gray-700 text-white border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Filter size={14} className="text-gray-400" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="flex-1 px-3 py-2 text-sm bg-gray-700 text-white border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="in progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="planning">Planning</option>
          <option value="on hold">On Hold</option>
        </select>
      </div>
    </div>
  );
};