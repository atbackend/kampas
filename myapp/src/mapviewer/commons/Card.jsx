import { ChevronRight } from "lucide-react";

export const Card = ({ project, isSelected, onSelect }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'in progress': return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
      case 'completed': return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'on hold': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'planning': return 'text-purple-400 bg-purple-900/20 border-purple-500/30';
      case 'cancelled': return 'text-red-400 bg-red-900/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const getClientCompanyName = (project) => {
    return project?.client_details?.client_company_name || 'Unknown Client';
  };

  return (
    <button
      onClick={() => onSelect(project.id)}
      className={`w-full p-3 flex items-center justify-between rounded-lg transition-all duration-200 ${
        isSelected 
          ? 'bg-blue-900/40 border border-blue-500/30' 
          : 'hover:bg-gray-700 border border-transparent'
      }`}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Project Icon */}
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">
          {(project.project_name || project.projectName || 'P')[0]?.toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">
            {project.project_name || project.projectName || 'Unnamed Project'}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {getClientCompanyName(project)}
          </p>
          {project.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Status and Arrow */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        <div className="flex flex-col items-end space-y-1">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(project.status)}`}>
            {project.status || 'Unknown'}
          </span>
          {(project.is_active || project.isActive) && (
            <span className="text-[10px] text-green-400 font-medium">Active</span>
          )}
        </div>
        <ChevronRight size={14} className="text-gray-400" />
      </div>
    </button>
  );
};