import React, { act, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
// import { TextField, Button, Box, Typography, Avatar, Divider, Chip } from '@mui/material';

import { useDispatch, useSelector } from 'react-redux';
import { fetchWorkspaceById, updateUserRole} from '/src/redux/workspacesSlice';
import { fetchUsers} from '/src/redux/usersSlice';

const WorkspaceDetails = () => {
  const {id} = useParams();
  const dispatch = useDispatch();

  const { workspace, loading: projectLoading, error: projectError  } = useSelector((state) => state.workspaces);
  const { users, loading: usersLoading, error: usersError  } = useSelector((state) => state.users);

  const [projectStatus, setProjectStatus] = useState('in-progress');
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [userRoles, setUserRoles] = useState({}); // State for storing selected roles

  const roles = ["Project Head", "Project Manager", "Reviewer", "Editor", "Viewer"];


  //Left Column
  const statusColors = {
    'in-progress': 'primary',
    'completed': 'success',
    'hold': 'warning',
  };

  // Handle Tab Click
  const [activeTab, setActiveTab] = useState("users"); // Default tab
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const handleTabClick = async (tab) => {
    setActiveTab(tab);
    setLoading(true);
    let fetchedData = [];
    if (tab === "users") {
      // fetchedData = await fetchUsers();
    } else if (tab === "assets") {
      // fetchedData = await fetchAssets();
    } else if (tab === "missions") {
      // fetchedData = await fetchMissions();
    } else if (tab === "labels") {
      // fetchedData = await fetchLabels();
    }
    setData(fetchedData);
    setLoading(false);
  };



  useEffect(() => {
    if (id) {
      dispatch(fetchWorkspaceById(id));
      dispatch(fetchUsers()); // Fetch all users
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (workspace) {
      setProjectStatus(workspace[0].status);
    }
  }, [workspace]);

  if (!workspace) {
    return <p>Loading project details...</p>;
  }
  // console.log(workspace);

  // Helper function to find a user by ID
  const getUserById = (userId) => users.find((user) => user.id === userId) || { name: "Loading...", email: "" };

  const allProjectUsers = [
    workspace[0].project_head,
    ...workspace[0].project_managers.map((id) => ({ ...getUserById(id), role: "Project Manager" })),
    ...workspace[0].reviewers.map((id) => ({ ...getUserById(id), role: "Reviewer" })),
    ...workspace[0].editors.map((id) => ({ ...getUserById(id), role: "Editor" })),
    ...workspace[0].viewers.map((id) => ({ ...getUserById(id), role: "Viewer" })),
  ].filter(Boolean); // Remove undefined/null users

  

  // Update role when dropdown changes
  const handleRoleChange = (userId, newRole) => {
    setUserRoles((prev) => ({ ...prev, [userId]: newRole }));
    // Dispatch Redux action to update the role
    dispatch(updateUserRole({ id: workspace[0].id, userId, role: newRole }));
  };
  // Remove user from project
  const handleDeleteUser = (userId) => {
    if (window.confirm("Are you sure you want to remove this user?")) {
      dispatch(removeUserFromProject({ projectId, userId }));
    }
  };
  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) =>
      user.first_name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  
  if (projectLoading || usersLoading) return <p>Loading...</p>;
  if (projectError) return <p>Error loading project: {projectError}</p>;
  if (usersError) return <p>Error loading users: {usersError}</p>;
  

  return (
    <div className="flex mx-3 h-screen grid grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="col-span-3 bg-white shadow p-6 rounded-lg text-center">
          <Typography variant='h6' fontWeight='bold'>
            {workspace[0].name}
          </Typography>
          <Chip label={workspace[0].status} color={statusColors[projectStatus] || 'default'} size='small' />
          <Divider sx={{ my: 2 }} />

          <Box display='flex' alignItems='center' gap={2}>
            <Avatar alt={workspace[0].project_head?.first_name} src={workspace[0].project_head?.avatar} />
            <Box>
              <Typography variant='subtitle1' fontWeight='medium'>
                {workspace[0].project_head?.first_name} {workspace[0].project_head?.last_name}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Project Head
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />

        </div>

        

        {/* Right Column */}
        <div className="col-span-9 bg-white shadow p-6 rounded-lg">
          
          <div className="border-b">
            <nav className="flex space-x-4">
              <button
                onClick={() => handleTabClick("users")}
                className={`pb-2 ${activeTab === "users" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-600"}`}
              >
                Users
              </button>
              <button
                onClick={() => handleTabClick("assets")}
                className={`pb-2 ${activeTab === "assets" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-600"}`}
              >
                Assets
              </button>
              <button
                onClick={() => handleTabClick("missions")}
                className={`pb-2 ${activeTab === "missions" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-600"}`}
              >
                Missions
              </button>
              <button
                onClick={() => handleTabClick("labels")}
                className={`pb-2 ${activeTab === "labels" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-600"}`}
              >
                Labels
              </button>
            </nav>
          </div>
          <div className="mt-6">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div>
                {activeTab === "users" && (
                  <>
                    {/* Search Bar and Add User Button */}
                    <div className="flex justify-between items-center mb-4">
                      <TextField
                        type="text"
                        placeholder="Search users..."
                        value={searchUserQuery}
                        onChange={(e) => setSearchUserQuery(e.target.value)}
                        size="small"
                        className="w-1/3 border rounded p-2"
                      />
                      <Button 
                        onClick={handleDeleteUser} 
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                        variant="contained"
                        color="primary"
                      >
                        Add User
                      </Button>   
                    </div>
                    <table className="table-auto w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border border-gray-300 px-4 py-2">Name</th>
                          <th className="border border-gray-300 px-4 py-2">Email</th>
                          <th className="border border-gray-300 px-4 py-2">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allProjectUsers.map((user) => (
                          <tr key={user.id} className="text-center">
                            <td className="border border-gray-300 px-4 py-2">{user.first_name} {user.last_name}</td>
                            <td className="border border-gray-300 px-4 py-2">{user.email}</td>
                            <td className="border border-gray-300 px-4 py-2">
                            <select
                              className={`border px-2 py-1 rounded ${
                                user.role === "Project Head" ? "bg-gray-200 cursor-not-allowed" : "bg-white"
                              }`}
                              value={userRoles[user.id] || user.role}
                              onChange={(e) => {
                                const newRole = e.target.value;
                                if (newRole === "Project Head" && user.role !== "Project Head") {
                                  alert("You cannot assign Project Head role.");
                                  return;
                                }
                                handleRoleChange(user.id, newRole);
                              }}
                              disabled={user.role === "Project Head"}
                            >
                              <option value="Project Head" disabled={user.role !== "Project Head"}>Project Head</option>
                              <option value="Project Manager">Project Manager</option>
                              <option value="Reviewer">Reviewer</option>
                              <option value="Editor">Editor</option>
                              <option value="Viewer">Viewer</option>
                            </select>

                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {activeTab === "assets" && (
                  <table className="table-auto w-full border-collapse border border-gray-300">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 p-2">ID</th>
                        <th className="border border-gray-300 p-2">Name</th>
                        <th className="border border-gray-300 p-2">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((asset) => (
                        <tr key={asset.id}>
                          <td className="border border-gray-300 p-2">{asset.id}</td>
                          <td className="border border-gray-300 p-2">{asset.name}</td>
                          <td className="border border-gray-300 p-2">{asset.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === "missions" && (
                  <table className="table-auto w-full border-collapse border border-gray-300">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 p-2">ID</th>
                        <th className="border border-gray-300 p-2">Name</th>
                        <th className="border border-gray-300 p-2">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((asset) => (
                        <tr key={asset.id}>
                          <td className="border border-gray-300 p-2">{asset.id}</td>
                          <td className="border border-gray-300 p-2">{asset.name}</td>
                          <td className="border border-gray-300 p-2">{asset.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === "labels" && (
                  <table className="table-auto w-full border-collapse border border-gray-300">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 p-2">ID</th>
                        <th className="border border-gray-300 p-2">Name</th>
                        <th className="border border-gray-300 p-2">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((asset) => (
                        <tr key={asset.id}>
                          <td className="border border-gray-300 p-2">{asset.id}</td>
                          <td className="border border-gray-300 p-2">{asset.name}</td>
                          <td className="border border-gray-300 p-2">{asset.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
  );


};

export default WorkspaceDetails;


