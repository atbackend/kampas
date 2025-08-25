import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { 
  selectCurrentProject,
  selectProjects, 
  selectProjectsError, 
  selectProjectsSuccessMessage,
  selectProjectsLoading,
  clearStatus,
  fetchProjectDetails
} from './ProjectSlice'; // Fixed import path

const ProjectDetailsPage = ({ onNavigateBack }) => {
  const dispatch = useDispatch();
  const { projectId } = useParams();
  const projects = useSelector(selectProjects);
  const currentProject = useSelector(selectCurrentProject);
  const loading = useSelector(selectProjectsLoading);
  const error = useSelector(selectProjectsError);
  const successMessage = useSelector(selectProjectsSuccessMessage);
  
  // Try to get project from list first, then from currentProject
  const project = projects.find(p => p.id === projectId) || currentProject;

  React.useEffect(() => {
    console.log('ProjectDetailsPage mounted with projectId:', projectId);
    console.log('Current project from list:', projects.find(p => p.id === projectId));
    console.log('Current project from state:', currentProject);
    
    // Always fetch project details to ensure we have the latest data
    if (projectId) {
      dispatch(fetchProjectDetails(projectId));
    }
  }, [dispatch, projectId]);

  React.useEffect(() => {
    if (error || successMessage) {
      const timeout = setTimeout(() => dispatch(clearStatus()), 3000);
      return () => clearTimeout(timeout);
    }
  }, [error, successMessage, dispatch]);

  const handleToggleStatus = async () => {
    if (project) {
      try {
        await dispatch(toggleProjectStatus({
          projectId: project.id,
          isActive: project.status
        })).unwrap();
      } catch (error) {
        console.error('Error toggling project status:', error);
      }
    }
  };

  const handleDeleteProject = async () => {
    if (project && window.confirm('Are you sure you want to delete this project?')) {
      try {
        await dispatch(deleteProject(project.id)).unwrap();
        if (onNavigateBack) {
          onNavigateBack();
        }
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  // Show loading state
  if (loading && !project) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="text-center bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 shadow-2xl">
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 border-r-purple-500"></div>
          </div>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Loading project details...
          </h1>
        </div>
      </div>
    );
  }

  // Show error state if project not found and not loading
  if (!loading && !project) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="text-center bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 shadow-2xl max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 14.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-4 text-red-400">Project Not Found</h1>
          <p className="text-gray-400 mb-6">
            Project with ID "{projectId}" could not be found.
          </p>
          <button
            onClick={() => {
              if (onNavigateBack) {
                onNavigateBack();
              } else {
                window.history.back();
              }
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Go Back to Projects
          </button>
        </div>
      </div>
    );
  }

  // Get original API data if available for additional fields
  const apiData = project?.originalData || {};
  
  const getStatusColor = (status) => {
    if (status === 'Active' || project.status) return 'from-green-500 to-emerald-500';
    return 'from-gray-500 to-slate-500';
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'from-red-500 to-pink-500';
      case 'medium': return 'from-yellow-500 to-orange-500';
      case 'low': return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="p-6">
        {/* Header Section */}
        <div className="relative bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl border border-gray-700 shadow-2xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
            <div className="flex items-start space-x-4">
              <button
                onClick={() => {
                  if (onNavigateBack) {
                    onNavigateBack();
                  } else {
                    window.history.back();
                  }
                }}
                className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 backdrop-blur-sm border border-gray-600 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  {project.projectName}
                </h1>
                <p className="text-gray-300 text-lg max-w-2xl leading-relaxed">
                  {project.description || 'No description available'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleToggleStatus}
                className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                {project.status ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={handleDeleteProject}
                className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-gradient-to-r from-green-800/50 to-emerald-800/50 backdrop-blur-sm border border-green-600/50 text-green-200 px-6 py-4 rounded-xl mb-6 shadow-lg">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </div>
          </div>
        )}
        {error && (
          <div className="bg-gradient-to-r from-red-800/50 to-pink-800/50 backdrop-blur-sm border border-red-600/50 text-red-200 px-6 py-4 rounded-xl mb-6 shadow-lg">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 14.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {typeof error === 'string' ? error : JSON.stringify(error)}
            </div>
          </div>
        )}

        {/* Project Info Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            Project Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-400 font-medium">Client</h3>
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">{project.client || 'Not specified'}</p>
            </div>

            <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-400 font-medium">Manager</h3>
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">{project.projectManager || 'Not assigned'}</p>
            </div>

            <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-400 font-medium">Status</h3>
                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getStatusColor(apiData.status)}`}></div>
              </div>
              <p className="text-white font-semibold text-lg">{apiData.status || (project.status ? 'Active' : 'Inactive')}</p>
            </div>

            <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-400 font-medium">Start Date</h3>
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">{project.startDate || 'Not set'}</p>
            </div>

            <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-400 font-medium">End Date</h3>
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">{project.endDate || 'Not set'}</p>
            </div>

            <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-400 font-medium">Priority</h3>
                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getPriorityColor(project.priority)}`}></div>
              </div>
              <p className="text-white font-semibold text-lg capitalize">{project.priority || 'Not set'}</p>
            </div>

            <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-400 font-medium">Quantity</h3>
                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">{apiData.quantity || 'Not specified'}</p>
            </div>

            <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-400 font-medium">Unit</h3>
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">{apiData.unit || 'Not specified'}</p>
            </div>

            <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-400 font-medium">Created At</h3>
                <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">
                {apiData.created_at ? new Date(apiData.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 col-span-1 md:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-400 font-medium">Location</h3>
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">{project.location?.address || 'Not specified'}</p>
            </div>
          </div>
        </div>

        {/* Client Details Section */}
        {apiData.client_details && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
              </div>
              Client Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-gray-400 font-medium">Contact Person</h3>
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-white font-semibold text-lg">{apiData.client_details.contact_person || 'Not specified'}</p>
              </div>

              <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-gray-400 font-medium">Primary Contact</h3>
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <p className="text-white font-semibold text-lg">{apiData.client_details.primary_contact_number || 'Not specified'}</p>
              </div>

              <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-gray-400 font-medium">Email</h3>
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-white font-semibold text-lg break-all">{apiData.client_details.email || 'Not specified'}</p>
              </div>

              <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-gray-400 font-medium">Client Type</h3>
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className="text-white font-semibold text-lg">{apiData.client_details.client_type || 'Not specified'}</p>
              </div>

              <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-gray-400 font-medium">Address</h3>
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-white font-semibold text-lg">{apiData.client_details.address || 'Not specified'}</p>
              </div>

              <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-gray-400 font-medium">Project Head</h3>
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-white font-semibold text-lg">{apiData.project_head_name || 'Not specified'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Project Team Section */}
        {(apiData.manager_names?.length > 0 || apiData.reviewers?.length > 0 || apiData.editors?.length > 0 || apiData.viewers?.length > 0) && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              Project Team
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-800/20 to-blue-700/10 backdrop-blur-sm p-6 rounded-xl border border-blue-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-blue-300 font-medium">Managers</h3>
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <p className="text-white font-semibold text-sm leading-relaxed">
                  {apiData.manager_names?.length > 0 ? apiData.manager_names.join(', ') : 'None assigned'}
                </p>
                {apiData.manager_names?.length > 0 && (
                  <div className="mt-2 text-xs text-blue-300">
                    {apiData.manager_names.length} manager{apiData.manager_names.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-green-800/20 to-green-700/10 backdrop-blur-sm p-6 rounded-xl border border-green-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-green-300 font-medium">Reviewers</h3>
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-white font-semibold text-sm leading-relaxed">
                  {apiData.reviewer_names?.length > 0 ? apiData.reviewer_names.join(', ') : 'None assigned'}
                </p>
                {apiData.reviewer_names?.length > 0 && (
                  <div className="mt-2 text-xs text-green-300">
                    {apiData.reviewer_names.length} reviewer{apiData.reviewer_names.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-purple-800/20 to-purple-700/10 backdrop-blur-sm p-6 rounded-xl border border-purple-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-purple-300 font-medium">Editors</h3>
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                </div>
                <p className="text-white font-semibold text-sm leading-relaxed">
                  {apiData.editor_names?.length > 0 ? apiData.editor_names.join(', ') : 'None assigned'}
                </p>
                {apiData.editor_names?.length > 0 && (
                  <div className="mt-2 text-xs text-purple-300">
                    {apiData.editor_names.length} editor{apiData.editor_names.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-orange-800/20 to-orange-700/10 backdrop-blur-sm p-6 rounded-xl border border-orange-600/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-orange-300 font-medium">Viewers</h3>
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
                <p className="text-white font-semibold text-sm leading-relaxed">
                  {apiData.viewer_names?.length > 0 ? apiData.viewer_names.join(', ') : 'None assigned'}
                </p>
                {apiData.viewer_names?.length > 0 && (
                  <div className="mt-2 text-xs text-orange-300">
                    {apiData.viewer_names.length} viewer{apiData.viewer_names.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailsPage;






// import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
// import { createProjectService, fetchProjectDetailsService , updateProjectService,fetchProject } from '../../api/services/ProjectService';

// // Async thunks for API calls
// export const fetchProjects = createAsyncThunk(
//   'projects/fetchProjects',
//   async (_, { rejectWithValue }) => {
//     try {
//       const data = await fetchProject();
//       return data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || error.message);
//     }
//   }
// );

// export const createProject = createAsyncThunk(
//   'projects/createProject',
//   async (projectData, { rejectWithValue }) => {
//     try {
//       const data = await createProjectService(projectData);
//       return data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || error.message);
//     }
//   }
// );

// export const updateProject = createAsyncThunk(
//   'projects/updateProject',
//   async ({ projectId, projectData }, { rejectWithValue }) => {
//     try {
//       console.log('Updating project:', projectId);
//       console.log('Update data being sent:', JSON.stringify(projectData, null, 2));
      
//       const data = await updateProjectService(projectId, projectData);
//       console.log('Update response received:', data);
//       return data;
//     } catch (error) {
//       console.error('Update project error details:', {
//         message: error.message,
//         response: error.response?.data,
//         status: error.response?.status,
//         projectId,
//         projectData
//       });
      
//       return rejectWithValue({
//         message: error.response?.data?.message || error.message,
//         details: error.response?.data,
//         status: error.response?.status
//       });
//     }
//   }
// );

// export const fetchProjectDetails = createAsyncThunk(
//   'projects/fetchProjectDetails',
//   async (projectId, { rejectWithValue }) => {
//     console.log("🔄 fetchProjectDetails thunk started", projectId);
//     try {
//       const data = await fetchProjectDetailsService(projectId);
//       console.log("✅ fetchProjectDetails thunk success", data);
//       return data;
//     } catch (error) {
//       console.log("❌ fetchProjectDetails thunk failed", error);
//       return rejectWithValue(error.response?.data?.message || error.message);
//     }
//   }
// );

// // Optimized helper function to normalize API project data
// const normalizeProject = (apiProject) => {
//   // Use Object.freeze to prevent accidental mutations and help with memoization
//   return Object.freeze({
//     id: apiProject.id,
//     projectName: apiProject.project_name || '',
//     client: apiProject.client_details?.contact_person || apiProject.client || '',
//     clientId: apiProject.client,
//     client_details: apiProject.client_details || null,
//     projectHead: apiProject.project_head,
//     projectHeadName: apiProject.project_head_name || '',
//     // Include team member names - THIS WAS MISSING
//    managers: apiProject.managers || [],
//   reviewers: apiProject.reviewers || [],
//   editors: apiProject.editors || [],
//   viewers: apiProject.viewers || [],
//    description: apiProject.description || '',
//     quantity: apiProject.quantity || '0.00',
//     unit: apiProject.unit || '',
//     startDate: apiProject.start_date || '',
//     endDate: apiProject.end_date || '',
//     status: apiProject.status || 'In Progress',
//  is_active: apiProject.is_active, // ✅ Changed from 'isActive' to 'is_active'
//   isActive: apiProject.is_active, 
//     createdBy: apiProject.created_by,
//     createdAt: apiProject.created_at,
//     modifiedBy: apiProject.modified_by,
//     modifiedAt: apiProject.modified_at,
//   });
// };

// // Initial state
// const initialState = {
//   projects: [],
//   currentProject: null,
//   loading: false,
//   error: null,
//   successMessage: null,
//   searchTerm: '',
//   filter: {
//     status: 'all',
//     priority: 'all'
//   },
//   showFilterPanel: false,
//   // Add cache for filtered results
//   filteredProjectsCache: [],
//   lastFilterState: null
// };

// // Slice
// const projectSlice = createSlice({
//   name: 'projects',
//   initialState,
//   reducers: {
//     setSearchTerm: (state, action) => {
//       state.searchTerm = action.payload;
//       // Clear cache when search changes
//       state.filteredProjectsCache = [];
//       state.lastFilterState = null;
//     },
//     setFilter: (state, action) => {
//       state.filter = { ...state.filter, ...action.payload };
//       // Clear cache when filter changes
//       state.filteredProjectsCache = [];
//       state.lastFilterState = null;
//     },
//     toggleFilterPanel: (state) => {
//       state.showFilterPanel = !state.showFilterPanel;
//     },
//     clearStatus: (state) => {
//       state.error = null;
//       state.successMessage = null;
//     },
//     clearCurrentProject: (state) => {
//       state.currentProject = null;
//     },
//     // Add action to clear projects when leaving page
//     clearProjects: (state) => {
//       state.projects = [];
//       state.filteredProjectsCache = [];
//       state.lastFilterState = null;
//       state.currentProject = null;
//     }
//   },
//   extraReducers: (builder) => {
//     builder
//       // Fetch Projects
//       .addCase(fetchProjects.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(fetchProjects.fulfilled, (state, action) => {
//         state.loading = false;
//         // Process projects in batches to prevent blocking
//          const processProjects = (projects) => {
//     return projects.map(normalizeProject);
//   };
  
//   const projects = Array.isArray(action.payload) 
//     ? processProjects(action.payload)
//     : [];
    
//   state.projects = projects;
  
//   // Clear cache when data changes
//   state.filteredProjectsCache = [];
//   state.lastFilterState = null;
// })
//       .addCase(fetchProjects.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload;
//       })
      
//       // Create Project
//       .addCase(createProject.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(createProject.fulfilled, (state, action) => {
//         state.loading = false;
//         const normalizedProject = normalizeProject(action.payload.project || action.payload);
//         state.projects.push(normalizedProject);
//         state.successMessage = action.payload.message || 'Project created successfully!';
//         // Clear cache
//         state.filteredProjectsCache = [];
//         state.lastFilterState = null;
//       })
//       .addCase(createProject.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload;
//       })
      
//       // Update Project
//       .addCase(updateProject.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(updateProject.fulfilled, (state, action) => {
//         state.loading = false;
//         const normalizedProject = normalizeProject(action.payload.project || action.payload);
//         const index = state.projects.findIndex(p => p.id === normalizedProject.id);
//         if (index !== -1) {
//           state.projects[index] = normalizedProject;
//         }
//         if (state.currentProject && state.currentProject.id === normalizedProject.id) {
//           state.currentProject = normalizedProject;
//         }
//         state.successMessage = action.payload.message || 'Project updated successfully!';
//         // Clear cache
//         state.filteredProjectsCache = [];
//         state.lastFilterState = null;
//       })
//       .addCase(updateProject.rejected, (state, action) => {
//         state.loading = false;
//         if (typeof action.payload === 'object' && action.payload.message) {
//           state.error = action.payload.message;
//         } else {
//           state.error = action.payload || 'Failed to update project';
//         }
//       })
      
//       // Fetch Project Details
//       .addCase(fetchProjectDetails.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(fetchProjectDetails.fulfilled, (state, action) => {
//         state.loading = false;
//         state.currentProject = normalizeProject(action.payload);
//       })
//       .addCase(fetchProjectDetails.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload;
//         state.currentProject = null;
//       });
//   }
// });

// export default projectSlice.reducer;

// // Export actions
// export const {
//   setSearchTerm,
//   setFilter,
//   toggleFilterPanel,
//   clearStatus,
//   clearCurrentProject,
//   clearProjects
// } = projectSlice.actions;

// // Basic selectors
// export const selectProjects = (state) => state.projects.projects;
// export const selectCurrentProject = (state) => state.projects.currentProject;
// export const selectProjectsLoading = (state) => state.projects.loading;
// export const selectProjectsError = (state) => state.projects.error;
// export const selectProjectsSuccessMessage = (state) => state.projects.successMessage;
// export const selectSearchTerm = (state) => state.projects.searchTerm;
// export const selectFilter = (state) => state.projects.filter;
// export const selectShowFilterPanel = (state) => state.projects.showFilterPanel;

// // Optimized filtered projects selector with better caching
// export const selectFilteredProjects = createSelector(
//   [selectProjects, selectSearchTerm, selectFilter],
//   (projects, searchTerm, filter) => {
//     // Return early if no projects
//     if (!projects || projects.length === 0) {
//       return [];
//     }

//     // Use cached result if filter state hasn't changed
//     const currentFilterState = JSON.stringify({ searchTerm, filter });
    
//    return projects.filter((project) => {
//       // Optimize search by avoiding repeated toLowerCase calls
//       const searchLower = searchTerm ? searchTerm.toLowerCase() : '';
      
//       const matchesSearch = !searchTerm || (
//         project.projectName.toLowerCase().includes(searchLower) ||
//         project.client.toLowerCase().includes(searchLower) ||
//         (project.projectHeadName && project.projectHeadName.toLowerCase().includes(searchLower)) ||
//         project.description.toLowerCase().includes(searchLower)
//       );

//       const matchesStatus = filter.status === 'all' || 
//         (filter.status === 'active' && project.is_active) ||     
//         (filter.status === 'inactive' && !project.is_active);

//       const matchesPriority = filter.priority === 'all' || project.priority === filter.priority;

//       return matchesSearch && matchesStatus && matchesPriority;
//     });
//   },
//   {
//     // Add custom equality check to prevent unnecessary recalculations
//     memoizeOptions: {
//       equalityCheck: (a, b) => {
//         // Custom equality check for better performance
//         return a === b;
//       },
//       maxSize: 1 // Only keep one cached result
//     }
//   }
// );

// export const selectPaginationMeta = createSelector(
//   [selectFilteredProjects],
//   (filteredProjects) => ({
//     totalItems: filteredProjects.length,
//     isEmpty: filteredProjects.length === 0,
//     hasItems: filteredProjects.length > 0
//   })
// );
