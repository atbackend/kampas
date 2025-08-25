import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Users, MapPin, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

const ProjectTable = ({ 
  projects, 
  onNavigateToDetails, 
  onEditProject, 
  onViewMap, 
  loading, 
  clients = [], 
  users = [] 
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Handle navigation to project details 
  const handleNavigateToDetails = (projectId) => {
    navigate(`/project-details-page/${projectId}`);
  };

  // Helper function to get client company name by ID (matching ProjectModal style)
  const getClientCompanyName = (project) => {
    return project?.client_details?.client_company_name || 'Unknown Client';
  };

  // Helper function to get contact person from client
  const getClientContact = (clientId) => {
    if (!clientId) return '';
    
    const client = clients.find(c => c.id === clientId);
    return client?.contact_person || client?.primary_contact || '';
  };

 const handleNavigateToMap = (projectId) => {
  navigate(`/map/${projectId}`);
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

  const getActiveStatusColor = (isActive) => {
    return isActive 
      ? 'text-green-400 bg-green-900/20 border-green-500/30'
      : 'text-red-400 bg-red-900/20 border-red-500/30';
  };

  if (loading) {
    return (
      <div className="overflow-x-auto bg-gray-800 rounded-md shadow-md">
        <div className="p-8 text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          Loading projects...
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-gray-800 rounded-md shadow-md">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-700 border-b border-gray-600">
            <th className="p-4 text-left text-gray-300 font-semibold">Project Name</th>
            <th className="p-4 text-left text-gray-300 font-semibold">Client Company</th>
            <th className="p-4 text-left text-gray-300 font-semibold">Project Head</th>
            <th className="p-4 text-left text-gray-300 font-semibold">Quantity & Unit</th>
            <th className="p-4 text-left text-gray-300 font-semibold">Status</th>
            <th className="p-4 text-left text-gray-300 font-semibold">Active</th>
            <th className="p-4 text-left text-gray-300 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.length === 0 ? (
            <tr>
              <td colSpan="7" className="p-8 text-center text-gray-400">
                <div className="flex flex-col items-center space-y-2">
                  <Users size={48} className="text-gray-600" />
                  <span className="text-lg">No projects found</span>
                  <span className="text-sm">Create your first project to get started</span>
                </div>
              </td>
            </tr>
          ) : (
            projects.map((project, index) => {
              const clientCompanyName = getClientCompanyName(project);
              const clientContact = getClientContact(project.client);
              
              return (
                <tr 
                  key={project.id} 
                  className={`border-b border-gray-700 hover:bg-gray-700 transition-colors ${
                    index % 2 === 0 ? "bg-gray-800" : "bg-gray-900"
                  }`}
                >
                  <td className="p-4 text-gray-300">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                        {(project.project_name || project.projectName || 'P')[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white truncate">
                          {project.project_name || project.projectName || 'Unnamed Project'}
                        </div>
                        {project.description && (
                          <div className="text-sm text-gray-400 truncate max-w-xs">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-4 text-gray-300">
                    <div>
                      <div className="font-medium text-white">{clientCompanyName}</div>
                      {clientContact && <div className="text-sm text-gray-400">{clientContact}</div>}
                    </div>
                  </td>

                  <td className="p-4 text-gray-300">
                    {project.project_head_name || project.projectHeadName || 'Not Assigned'}
                  </td>
                  
                  <td className="p-4 text-gray-300">
                    <div className="text-sm">
                      <div className="font-medium flex gap-2">
                        {project.quantity ? parseFloat(project.quantity).toLocaleString() : '0'}
                         <div className="text-gray-400">
                        {project.unit || 'Unit'}
                      </div>
                      </div>
                     
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                      {project.status || 'Unknown'}
                    </span>
                  </td>
                  
                  <td className="p-4">
                    <div className="text-gray-300">
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-fit ${getActiveStatusColor(project.is_active)}`}>
                          {project.is_active ? (
                            <>
                              <CheckCircle size={12} />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle size={12} />
                              Inactive
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        className="bg-purple-600 text-white p-2 rounded-md hover:bg-purple-500 transition-colors group relative"
                        onClick={() => handleNavigateToDetails(project.id)}
                        title="View Project Details"
                      >
                        <Users size={16} />
                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          View Details
                        </span>
                      </button>
                      
                      <button
                        className="bg-green-600 text-white p-2 rounded-md hover:bg-green-500 transition-colors group relative"
                        onClick={() =>  handleNavigateToMap(project.id)}
                        title="View Location"
                      >
                        <MapPin size={16} />
                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          View Map
                        </span>
                      </button>
                      
                      <button
                        className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-500 transition-colors group relative"
                        onClick={() => onEditProject && onEditProject(project)}
                        title="Edit Project"
                      >
                        <Edit size={16} />
                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          Edit Project
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectTable;