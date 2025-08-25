// layerServices.js
import { GET_RASTER_IMAGES, GET_STREET_IMAGE, GET_STREET_IMAGE_BY_ID, GET_VECTOR_IMAGES } from "../constants/endpoints";
import axiosInstance from "../axiosInstance";

export const fetchVectorLayers = async (projectId) => {
  try {
    const url = GET_VECTOR_IMAGES.replace('<project_id>', projectId);
    const response = await axiosInstance.get(url);
    console.log('vector',response)
    return {
      success: true,
      data: response.data,
      count: response.data?.length || 0
    };
  } catch (error) {
    console.error('Error fetching vector layers:', error);
    
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'Failed to fetch vector layers';
    
    return {
      success: false,
      error: errorMessage, 
    };
  }
};


export const fetchStreetImages = async (projectId, params = {}) => {
  try {
    const url = GET_STREET_IMAGE.replace('<project_id>', projectId);
    const response = await axiosInstance.get(url, { params });
    console.log("streetf",response)
    return {
      success: true,
      data: response.data,
      count: response.data?.length || 0
    };
  } catch (error) {
    console.error('Error fetching street images:', error);
    
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'Failed to fetch street images';
    
    return {
      success: false,
      error: errorMessage,
      data: []
    };
  }
};

// Fetch a specific street image by ID
export const fetchStreetImageById = async (projectId, imageId) => {
  console.log("👉 fetchStreetImageById CALLED with:", { projectId, imageId });

  try {
    const url = GET_STREET_IMAGE_BY_ID
      .replace('<project_id>', projectId)
      .replace('<image_id>', imageId);

    console.log("👉 Final URL:", url);

    const response = await axiosInstance.get(url);

    console.log("✅ streetimagebyid FULL response:", response);
    console.log("✅ streetimagebyid DATA only:", response.data);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('❌ Error fetching street image by ID:', error);

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Failed to fetch street image';

    return {
      success: false,
      error: errorMessage,
    };
  }
};



export const fetchRasterImages = async (projectId, params = {}) => {
  try {
    const url = GET_RASTER_IMAGES.replace('<project_id>', projectId);
    const response = await axiosInstance.get(url, { params });
     console.log("raster",response)
    return {
      success: true,
      data: response.data,
      count: response.data?.length || 0
    };
  } catch (error) {
    console.error('Error fetching street images:', error);
    
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'Failed to fetch street images';
    
    return {
      success: false,
      error: errorMessage,
      data: []
    };
  }
};

