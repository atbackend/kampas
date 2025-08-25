// import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import WorkspaceTable from "../components/workspaces/WorkspaceTable";
import WorkspaceModal from "../components/workspaces/WorkspaceModal";
import ClientModal from "../components/workspaces/ClientModal";
import DeleteConfirmationModal from "../components/workspaces/DeleteConfirmationModal";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWorkspaces, clearStatus } from '/src/redux/workspacesSlice';
import { actions } from "react-table";

const WorkspacesPage = () => {

  const dispatch = useDispatch();
  const { workspaces, loading, successMessage, error } = useSelector((state) => state.workspaces); // Get the workspaces from the state

  // Fetch users when component mounts
  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  // console.log("Workspaces", workspaces);

  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false); // State for customer modal

  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // State for delete modal

  // Handle Add Workspace
  const handleAddWorkspace = () => {
    setSelectedWorkspace(null); // Clear selected workspace
    setIsWorkspaceModalOpen(true);
  };

  // Handle Edit workspace
  const handleEditWorkspace = (workspace) => {
    // console.log("Edit Workspace", workspace);
    setSelectedWorkspace(workspace);
    setIsWorkspaceModalOpen(true); // Open the edit modal

  };

  // Initialize useNavigate
  const navigate = useNavigate();
  const handleRowClick = (workspace) => {
    // console.log("View Workspace", workspace.id);
    navigate(`/workspaces/${workspace.id}`);
  };

  const handleDeleteWorkspace = (workspace) => {
    // setSelectedWorkspace(workspace); // Set the user to be deleted
    // setIsDeleteModalOpen(true); // Open the delete confirmation modal
  };

  const confirmDelete = (workspace) => {
    // setWorkspaces(workspaces.filter((u) => u.id !== workspace.id)); // Delete the user
  };


  //Handle toggle Workspace & Client modals
  const openClientModal = () => {
    setIsClientModalOpen(true)
    setIsWorkspaceModalOpen(false);
  };
  const closeClientModal = () => {
    setIsClientModalOpen(false)
    setIsWorkspaceModalOpen(true);
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-semibold text-white mb-6">Workspaces</h1>
      <WorkspaceTable
        data={workspaces}
        onAddWorkspace={handleAddWorkspace}
        onEditWorkspace={handleEditWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        onRowClick={handleRowClick} 
      />
      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        workspace={selectedWorkspace}
        // onOpenClientModal={() => setIsClientModalOpen(true)} 
        onOpenClientModal={() => openClientModal()} 
      />
      <ClientModal
        isClientModalOpen={isClientModalOpen}
        // onClientModalClose={() => setIsClientModalOpen(false)}
        onClientModalClose={() => closeClientModal()}
      />
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        workspace={selectedWorkspace}
        onDelete={confirmDelete}
      />
    </div>
  );
};

export default WorkspacesPage;
