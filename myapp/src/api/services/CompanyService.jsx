import axiosInstance from "../axiosInstance";
import { UPDATE_COMPANY, VIEW_COMPANY } from "../constants/endpoints";

// Fetch company profile using PATCH method
export const fetchCompany = async (companyData = {}) => {
  try {
    console.log('🔄 FetchCompany: Making API call...');
    const response = await axiosInstance.patch(VIEW_COMPANY, companyData);
    console.log('✅ FetchCompany: API response:', response);
    return response.data;
  } catch (error) {
    console.error('❌ FetchCompany API Error:', error);
    throw error;
  }
};

// Update company profile using PATCH method  
export const updateCompany = async (companyData) => {
  try {
    console.log('🔄 UpdateCompany: Making API call with data:', companyData);
    const response = await axiosInstance.patch(UPDATE_COMPANY, companyData);
    console.log('✅ UpdateCompany: API response:', response);
    return response.data;
  } catch (error) {
    console.error('❌ UpdateCompany API Error:', error);
    throw error;
  }
};