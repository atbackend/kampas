// src/utils/axiosInstance.js
import axios from 'axios';
import { logout, refreshTokenSuccess } from '../redux/authSlice';
import { getStore } from "../redux/storeInjector";
import { isTokenExpired } from '../utils/tokenUtils';

const API_URL = 'http://ec2-65-0-97-169.ap-south-1.compute.amazonaws.com';

const axiosInstance = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach token and validate expiry
axiosInstance.interceptors.request.use(
  (config) => {
    const store = getStore();
    const accessToken = store.getState().auth.accessToken;
    
    console.log("🔍 Making API request to:", config.url);
    
    if (accessToken) {
      // Check if token is expired before making request
      if (isTokenExpired(accessToken)) {
        console.log("🔴 Access token expired before request - logging out");
        store.dispatch(logout());
        if (typeof window !== "undefined") {
          window.location.href = "/sign-in";
        }
        return Promise.reject(new Error('Token expired'));
      }
      
      config.headers.Authorization = `Bearer ${accessToken}`;
      console.log("✅ Token attached to request");
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to refresh token on 401 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const store = getStore();
    
    console.log("🔍 API response error:", error.response?.status);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = store.getState().auth.refreshToken;
      
      if (refreshToken && !isTokenExpired(refreshToken)) {
        console.log("🔄 Attempting token refresh");
        try {
          const { data } = await axios.post(`${API_URL}api/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          
          console.log("✅ Token refreshed successfully");
          store.dispatch(refreshTokenSuccess(data.access));
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          console.error("🔴 Token refresh failed:", refreshError);
          store.dispatch(logout());
          if (typeof window !== "undefined") {
            window.location.href = "/sign-in";
          }
          return Promise.reject(refreshError);
        }
      } else {
        console.log("🔴 No valid refresh token - logging out");
        store.dispatch(logout());
        if (typeof window !== "undefined") {
          window.location.href = "/sign-in";
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
