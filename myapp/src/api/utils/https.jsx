import axios from 'axios';

const axioshttp = axios.create({
  baseURL: 'http://192.168.29.247:8000', 
  // baseURL: 'http://ec2-3-108-54-217.ap-south-1.compute.amazonaws.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axioshttp;
