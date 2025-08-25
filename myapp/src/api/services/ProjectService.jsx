import axiosInstance from '../axiosInstance.jsx'; // Update import path as needed
import { CREATE_PROJECT, DETAILSVIEW_PROJECT, FETCH_PROJECT, UPDATE_PROJECT } from '../constants/endpoints.jsx';


// Create a new project
export const createProjectService = async (projectData) => {
  const response = await axiosInstance.post(CREATE_PROJECT, projectData);
  return response.data;
};

// Fetch all projects
export const fetchProject = async () => {
  const response = await axiosInstance.get(FETCH_PROJECT);
  return response.data;
};

// Update a project
// export const updateProjectService = async (id, projectData) => {
//   const url = UPDATE_PROJECT.replace('<project_id>', id);
//   const response = await axiosInstance.patch(url, projectData);
//   console.log("response for printing", response)
//   return response.data;
// };


export const updateProjectService = async (id, projectData) => {
  console.log('Updating project service called with:', {
    id,
    projectData,
    url: UPDATE_PROJECT.replace('<project_id>', id)
  });
  
  try {
    const url = UPDATE_PROJECT.replace('<project_id>', id);
    
    // Log the exact request being made
    console.log('Making PATCH request to:', url);
    console.log('Request payload:', JSON.stringify(projectData, null, 2));
    console.log('Request headers:', axiosInstance.defaults.headers);
    
    const response = await axiosInstance.patch(url, projectData);
    
    console.log('Update project response status:', response.status);
    console.log('Update project response data:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Update project service error details:');
    console.error('Error message:', error.message);
    console.error('Error response status:', error.response?.status);
    console.error('Error response data:', error.response?.data);
    console.error('Error response headers:', error.response?.headers);
    console.error('Request config:', error.config);
    
    // Log the exact URL and payload that failed
    if (error.config) {
      console.error('Failed request URL:', error.config.url);
      console.error('Failed request method:', error.config.method);
      console.error('Failed request data:', error.config.data);
    }
    
    throw error;
  }
};
// Fetch project details
export const fetchProjectDetailsService  = async (projectId) => {
  const url = DETAILSVIEW_PROJECT.replace('<project_id>', projectId);
  const response = await axiosInstance.get(url);
  return response.data;
};

// Delete a project
export const deleteProject = async (projectId) => {
  const url = DELETE_PROJECT.replace('<project_id>', projectId);
  const response = await axiosInstance.delete(url);
  return response.data;
};

