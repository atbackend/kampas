// src/api/userService.js
import axiosInstance from '../axiosInstance';
import { CREATE_USER, FETCH_USER, UPDATE_USER } from '../constants/endpoints';


export const createUser = async (userData) => {
  const response = await axiosInstance.post(CREATE_USER, userData);
  return response.data;
};

export const fetchUser = async (userData) => {
  const response = await axiosInstance.get(FETCH_USER, userData);
  return response.data;
};

export const updateUser = async (id, userData) => {
    const url = UPDATE_USER.replace('<user_id>', id);
    const response = await axiosInstance.patch(url, userData);
    return response.data;
};