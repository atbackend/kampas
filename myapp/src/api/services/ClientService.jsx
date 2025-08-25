// src/api/clientService.js
import axiosInstance from '../axiosInstance';
import { 
  CREATE_CLIENT, 
  VIEW_CLIENT, 
  UPDATE_CLIENT, 
  DETAILSVIEW_CLIENT 
} from '../constants/endpoints';

export const createClient = async (clientData) => {
  const response = await axiosInstance.post(CREATE_CLIENT, clientData);
  return response.data;
};

export const fetchClient = async () => {
  const response = await axiosInstance.get(VIEW_CLIENT);
  return response.data;
};

export const updateClient = async (id, clientData) => {
  // FIX: The endpoint should use client_id, not user_id
  const url = UPDATE_CLIENT.replace('<client_id>', id); // Changed from <user_id>
  const response = await axiosInstance.patch(url, clientData);
  return response.data;
};


export const fetchClientDetails = async (clientId) => {
  const url = DETAILSVIEW_CLIENT.replace('<client_id>', clientId);
  const response = await axiosInstance.get(url);
  return response.data;
};

export const deleteClient = async (clientId) => {
  const url = DELETE_CLIENT.replace('<client_id>', clientId);
  const response = await axiosInstance.delete(url);
  return response.data;
};