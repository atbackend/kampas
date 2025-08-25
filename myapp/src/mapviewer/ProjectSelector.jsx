import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProjects } from '../redux+page/Project/ProjectSlice';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ProjectSearchFilter } from './commons/Searchfilter';
import { ProjectList } from './commons/ProjectList';

const ProjectSelector = ({ selectedProjectId, onProjectSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { projects, loading } = useSelector((state) => state.projects);

  // Fetch projects when component mounts or user changes
  useEffect(() => {
    if (user) {
      dispatch(fetchProjects());
    }
  }, [dispatch, user?.id]);

  // Memoized filtered projects with user access control
  const filteredProjects = useMemo(() => {
    if (!projects || !user) return [];
    
    // Filter projects where user has access
    const userProjects = projects.filter(project => {
      const isProjectHead = project.project_head_id === user.id || project.projectHead === user.id;
      const isAssigned = project.assigned_users?.some(assignedUser => assignedUser.id === user.id);
      const isAdmin = user.role?.toLowerCase() === 'admin';
      
      return isProjectHead || isAssigned || isAdmin;
    });

    // Apply search filter
    let filtered = userProjects;
    if (searchTerm) {
      filtered = userProjects.filter(project =>
        (project.project_name || project.projectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        filtered = filtered.filter(project => project.is_active || project.isActive);
      } else {
        filtered = filtered.filter(project => 
          project.status?.toLowerCase() === filterStatus.toLowerCase()
        );
      }
    }

    return filtered;
  }, [projects, user, searchTerm, filterStatus]);

  // Find current project
  const currentProject = projects?.find((p) => p.id === selectedProjectId);

  const handleProjectSelect = (projectId) => {
    setIsExpanded(false);
    onProjectSelect(projectId);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
  };

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
    <div className="bg-gray-700 border-b border-gray-600">
      {/* Project Selection Header */}
      <div className="p-3 border-b border-gray-600">
      <button
  onClick={() => setIsExpanded(!isExpanded)}
  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white rounded-lg border border-gray-500 transition-all duration-200 shadow-sm"
>
  {/* Left section: icon + project info */}
  <div className="flex items-center space-x-3 min-w-0">
    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">
      {currentProject ? (currentProject.project_name || currentProject.projectName || 'P')[0]?.toUpperCase() : 'P'}
    </div>
    <div className="text-left min-w-0">
      <div className="text-sm font-medium truncate">
        {currentProject ? (currentProject.project_name || currentProject.projectName) : 'Select Project'}
      </div>
      {currentProject && (
        <div className="text-xs text-gray-300 truncate">
          {getClientCompanyName(currentProject)}
        </div>
      )}
    </div>
  </div>

  {/* Right section: status badge + chevron */}
  <div className="flex items-center space-x-2 flex-shrink-0">
    {currentProject && (
      <span className={`px-2 py-0.5 rounded whitespace-nowrap text-[10px] font-medium border ${getStatusColor(currentProject.status)}`}>
        {currentProject.status || 'Unknown'}
      </span>
    )}
    {isExpanded ? 
      <ChevronUp size={16} className="text-gray-400" /> : 
      <ChevronDown size={16} className="text-gray-400" />
    }
  </div>
</button>

      </div>

      {/* Expanded Project Selection */}
      {isExpanded && (
        <div className="border-t border-gray-600 bg-gray-800">
          {/* Search and Filter */}
          <ProjectSearchFilter
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
          />

          {/* Projects List */}
          <div className="max-h-80 overflow-y-auto">
            <ProjectList
              projects={filteredProjects}
              loading={loading}
              selectedProjectId={selectedProjectId}
              onProjectSelect={handleProjectSelect}
              searchTerm={searchTerm}
              filterStatus={filterStatus}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* Stats Footer */}
          {filteredProjects.length > 0 && (
            <div className="p-3 border-t border-gray-600 bg-gray-900/50">
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>
                  {filteredProjects.length} of {projects?.length || 0} projects
                </span>
                <span className="text-blue-400">
                  {user?.role || 'User'} Access
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default ProjectSelector;
