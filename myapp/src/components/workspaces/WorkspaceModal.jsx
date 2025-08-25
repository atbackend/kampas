import React, { useState, useEffect } from "react";
import { X , PlusSquare, Trash2, ChevronDown} from "lucide-react";
// import { Button, Select, List, ListItem, ListItemText, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, Checkbox, ListItemSecondaryAction, TextField } from '@mui/material';
// import DeleteIcon from '@mui/icons-material/Delete';
// import SearchIcon from '@mui/icons-material/Search';

import ClientListCombobox from "/src/components/workspaces/ClientListCombobox"; // Import the ClientListCombobox component
import ProjectHeadListCombobox from "/src/components/workspaces/ProjectHeadListCombobox"; // Import the ProjectHeadListCombobox component
import ProjectManagerListbox from "/src/components/workspaces/ProjectManagerListbox"; // Import the ProjectManagerListbox component

import { useDispatch, useSelector } from 'react-redux';
import { fetchClients } from '/src/redux/clientSlice';
import { fetchUsers} from '/src/redux/usersSlice';
import { addWorkspace, updateWorkspace } from '/src/redux/workspacesSlice';
import { fetchWorkspaces } from "../../redux/workspacesSlice";


const WorkspaceModal = ({ isOpen, onClose, workspace, onOpenClientModal }) => {
  const dispatch = useDispatch();
  const { users, loading} = useSelector((state) => state.users); // Get the users from the state
  const currentUser = useSelector((state) => state.auth.user);

  const projectData = useSelector((state) =>
    state.workspaces.workspaces.find((proj) => proj.id === workspace)
  ); // Get the project data if in edit mode
  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectHead, setProjectHead] = useState(null);
  const [selectedProjectHead, setselectedProjectHead] = useState(null);
  const [projectManagers, setprojectManagers] = useState([]);
  const [selectedManagers, setSelectedManagers] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); // Search term for filtering users

  const [client, setClient] = useState('');
  const [selectedClient, setselectedClient] = useState(null);

  // Initialize the form with the current user as the project head
  useEffect(() => {
    if (workspace) {
        // When editing, initialize with the existing project data
        setProjectId(workspace.id);
        setProjectName(workspace.name);
        setClient(workspace.customer);
        setProjectHead(workspace.project_head);
        setprojectManagers(workspace.project_managers);
        
        setselectedClient(workspace.customer);
        setselectedProjectHead(workspace.project_head);
        setSelectedManagers(workspace.project_managers);
    } else {
        setProjectId(null);
        setProjectName(null);
        setClient(null);
        setProjectHead(null);
        setprojectManagers(null);
        
        setselectedClient(null);
        setselectedProjectHead(null);
        setSelectedManagers([]);
    }
  }, [workspace]);

  // console.log('Project Data:', projectData);
  // console.log('Workspace', workspace);
  // console.log('Client:', client);
  // console.log('Project Head:', projectHead);
  // console.log('Selected Client:', selectedClient);
  // console.log('Selected Project Head (Modal):', selectedProjectHead);


  //** Clients*/
  useEffect(() => {
    // Fetch clients if not already loaded
    dispatch(fetchClients());
  }, [dispatch]); // Load clients when the component mounts
const handleChangeSelectedClient = (client) => {
  setselectedClient(client); // Update parent state
};
useEffect(() => {
  // if (selectedClient) {
  //   console.log('Selected Clinet:', selectedClient);
  // }
}, [selectedClient]); // Update when selectedClient changes


//** Project Head*/
const handleChangeProjectHead = (head) => {
  setselectedProjectHead(head); // Update parent state
};
useEffect(() => {
  // if (selectedProjectHead) {
  //   console.log('Updated manager:', selectedProjectHead);
  // }
}, [selectedProjectHead]); // Update when selectedProjectHead changes

//** Project manager*/
useEffect(() => {
  if (!workspace) {
    dispatch(fetchUsers());
  } else if (workspace) {
    setSelectedManagers(workspace.project_managers || []);
  }
}, [dispatch, workspace]);
const toggleDropdown = () => {
  setDropdownOpen(!dropdownOpen);
};
// Handle checkbox selection
const handleToggle = (userId) => {
  setSelectedManagers((prevSelected) =>
    prevSelected.includes(userId)
      ? prevSelected.filter((id) => id !== userId)
      : [...prevSelected, userId]
  );
};
// Filter users based on search term
const filteredUsers = users.filter((user) => {
  const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
  return fullName.includes(searchTerm.toLowerCase());
});
// Sort selected users to the top
const sortedUsers = [
  ...filteredUsers.filter((user) => selectedManagers.includes(user.id)),
  ...filteredUsers.filter((user) => !selectedManagers.includes(user.id)),
];

const removeProjectHeadFromProjectManagers = (userId) => {
  setSelectedManagers((prevManagers) =>
    prevManagers.filter((id) => id !== userId)
  );
};

//********** Save Projects */
const handleSaveWorkspace = (e) => {
  e.preventDefault();
  removeProjectHeadFromProjectManagers(selectedProjectHead.id);

  const projectData = {
    name: projectName,  
    // company: currentUser.company,
    customer_id:selectedClient.id,
    project_head_id: selectedProjectHead.id,
    project_managers: selectedManagers,
  };

  // console.log(projectData);

  if (workspace?.id) {
    const projectId = workspace.id;
    // console.log('Updating Workspace:', projectId, projectData);
    dispatch(updateWorkspace({ id:projectId, workspaceData:projectData }));
  } else {
    // console.log('Adding Workspace:', projectData);
    dispatch(addWorkspace(projectData)); // Wait for Project to be added;
    // dispatch(fetchWorkspaces()); // Refresh Workspace list after saving
  }
  onClose();
};

//Close the Workspcae modal
const handleClose = () => {
  onClose(); // Close the modal
};

  


  return (
    isOpen && (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <form onSubmit={handleSaveWorkspace} className="p-4 space-y-4 bg-white rounded-lg">
        <div className="absolute inset-0 w-[calc(100%-4)] h-[calc(100%-4)] m-2 p-6 bg-gray-800 overflow-hidden rounded-lg shadow-lg ">
          {/* <h2 className="text-xl text-white mb-4">Add/Edit Workspace</h2> */}
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold text-white">{workspace ? "Edit Workspace" : "Add Workspace"}</h2>
            <button onClick={handleClose}>
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4 p-4 overflow-y-auto flex-grow">
            {/* Project Name */}
            <div className="flex items-center mb-4">
              <div className="label-column">
                <label
                    className="text-left pr-2 font-medium text-white"
                  >
                    Project Name:
                </label>
              </div>
              <div className="center-column">
                <input
                  type="text"
                  name="name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded-md "
                />
              </div>
              <div className="quick-action-column">
                
              </div>
            </div>
            {/* Client Name */}
            <div className="flex items-center mb-4">
              <div className="label-column">
                <label
                    className="text-left pr-2 font-medium text-white"
                  >
                    Client Name:
                </label>
              </div>
              <div className="center-column">
                <ClientListCombobox 
                onSelectClient={handleChangeSelectedClient}
                currentClient={selectedClient}
                className="w-full mr-10 p-2 bg-gray-700 text-white border border-gray-600 rounded-md"
                on
                />
              </div>
              <div className="quick-action-column">
                <button
                  className="w-50 h-50 text-white rounded-md"
                  onClick={onOpenClientModal}
                  
                >
                <PlusSquare size={36} />
                </button>
              </div>
            </div>
            {/* Project Head */}
            <div className="flex items-center mb-4">
              <div className="label-column">
                <label
                    className="text-left pr-2 font-medium text-white"
                  >
                    Project Head: 
                </label> 
              </div>
              <div className="center-column">
                <ProjectHeadListCombobox 
                  selProjectHead={selectedProjectHead}
                  onSelectProjectHead={handleChangeProjectHead}
                  className="w-full mr-10 p-2 bg-gray-700 text-white border border-gray-600 rounded-md"
                  
                  // onChange={(e, newValue) => setProject((prev) => ({ ...prev, project_head: newValue }))}
                />
              </div>
              <div className="quick-action-column">
              </div>
            </div>

            {/* Project Manager Dropdown */}
            <div className="flex items-center mb-4">
              <div className="label-column">
                <label
                    className="text-left pr-2 font-medium text-white"
                  >
                    Project Manager: 
                </label> 
              </div>
              <div className="center-column p-2 bg-gray-700 text-white border border-gray-600 rounded-md">
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{
                    "& .MuiInputBase-root": {
                      backgroundColor: "#334155", // Tailwind bg-gray-700
                      color: "white",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#475569", // Tailwind border-gray-600
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#cbd5e1", // Tailwind border-gray-300
                    },
                    // marginBottom: 2
                  }}
                />

                <List>
                  {sortedUsers.map((user) => (
                    <ListItem key={user.id} button onClick={() => handleToggle(user.id)}>
                      <Checkbox
                        checked={selectedManagers.includes(user.id)}
                        tabIndex={-1}
                        disableRipple
                      />
                      {user.first_name} {user.last_name}
                    </ListItem>
                  ))}
                </List>

              </div>
              <div className="quick-action-column">
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex justify-end items-center p-4 gap-4 mt-4 border-t">
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-md"
            >
              Cancel
            </button>

            <button
              onClick={handleSaveWorkspace}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md"
            >
              Save Changes
            </button>
          </div>
        </div>
        </form>
      </div>
    )
  );
};

export default WorkspaceModal;
