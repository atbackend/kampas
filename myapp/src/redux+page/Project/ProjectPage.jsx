import React, { useState, useEffect,useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectProjectsLoading,
  selectProjectsError,
  selectProjectsSuccessMessage,
  selectShowFilterPanel,
  clearStatus,
  fetchProjects,
  selectFilteredProjects,
} from './ProjectSlice.jsx'; // Update import path as needed

import ProjectStatusMessages from './ProjectStatusMessages';
import ProjectSearchAndActions from './ProjectSearchAndActions';
import ProjectTable from './ProjectTable';
import ProjectPagination from './ProjectPagination';
import ProjectFilterPanel from './ProjectFilterPanel';
import ProjectModal from './ProjectModal';
import MapModal from './MapModal';
import { fetchClientsAsync } from '../client/ClientSlice.jsx';
import { fetchUsersAsync } from '../user/userSlice.jsx';
import PageHeader from '../commons/Header.jsx';
import { FolderOpen } from 'lucide-react';


const ProjectPage = ({ onNavigateToDetails }) => {
  const dispatch = useDispatch();
  
  // Redux state
  const loading = useSelector(selectProjectsLoading);
  const error = useSelector(selectProjectsError);
  const successMessage = useSelector(selectProjectsSuccessMessage);
  const showFilterPanel = useSelector(selectShowFilterPanel);
  const filteredProjects = useSelector(selectFilteredProjects); // Use filtered projects directly
  
  // Client state from Redux
  const clients = useSelector(state => state.clients.clients);
  const clientsLoading = useSelector(state => state.clients.loading);
  const clientsError = useSelector(state => state.clients.error);
  
  const users = useSelector(state => state.users.users);
  const usersLoading = useSelector(state => state.users.loading);
  
  // Local state for modals and pagination - removed paginatedProjects
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Made this constant to prevent re-renders
  
  // Memoize paginated data to prevent recalculation on every render
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProjects = filteredProjects.slice(startIndex, endIndex);
    
    return {
      projects: paginatedProjects,
      totalItems: filteredProjects.length,
      currentPage,
      itemsPerPage
    };
  }, [filteredProjects, currentPage, itemsPerPage]);
  
  // Fetch data on component mount
  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchUsersAsync());
    dispatch(fetchClientsAsync());
  }, [dispatch]);
  
  // Clear messages after 3 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        dispatch(clearStatus());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error, dispatch]);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProjects.length]);
  
  // Memoized event handlers to prevent child re-renders
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);
  
  const handleAddProject = useCallback(() => {
    setEditingProject(null);
    setShowModal(true);
  }, []);
  
  const handleEditProject = useCallback((project) => {
    setEditingProject(project);
    setShowModal(true);
  }, []);
  
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingProject(null);
  }, []);
  
  const handleViewMap = useCallback((project) => {
    setSelectedProject(project);
    setShowMapModal(true);
  }, []);
  
  const handleCloseMapModal = useCallback(() => {
    setShowMapModal(false);
    setSelectedProject(null);
  }, []);
  
  // Show loading only when initially loading and no projects are available
  if (loading && filteredProjects.length === 0) {
    return (
      <div className="flex h-screen bg-gray-700 text-white items-center justify-center">
        <div className="text-xl">Loading projects...</div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-700 text-white">
      {/* Main Content */}
      <div className={`flex-1 p-6 transition-all duration-300 ${showFilterPanel ? 'mr-80' : ''}`}>
        <PageHeader
          icon={FolderOpen}
          title="Project Management"
          subtitle="Manage your Projects and their information"
        />
        
        <ProjectStatusMessages
          successMessage={successMessage}
          error={error}
        />
        
        {/* Show client loading/error if needed */}
        {clientsError && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded text-red-400">
            Error loading clients: {clientsError}
          </div>
        )}
        
        <ProjectSearchAndActions onAddProject={handleAddProject} />
        
        <ProjectTable
          projects={paginatedData.projects} // Use memoized paginated projects
          onNavigateToDetails={onNavigateToDetails}
          onEditProject={handleEditProject}
          onViewMap={handleViewMap}
          loading={loading}
        />
        
        <ProjectPagination 
          totalItems={paginatedData.totalItems}
          itemsPerPage={paginatedData.itemsPerPage}
          currentPage={paginatedData.currentPage}
          onPageChange={handlePageChange}
        />
      </div>
      
      {/* Filter Panel */}
      <ProjectFilterPanel />
      
      {/* Modals */}
      {showMapModal && (
        <MapModal
          project={selectedProject}
          onClose={handleCloseMapModal}
        />
      )}
      
      {showModal && (
        <ProjectModal
          isOpen={showModal}
          onClose={handleCloseModal}
          editingProject={editingProject}
          clients={clients}
          clientsLoading={clientsLoading}
          users={users}
          usersLoading={usersLoading}
        />
      )}
    </div>
  );
};

export default React.memo(ProjectPage);