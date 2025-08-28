import axios from 'axios';

const axioshttp = axios.create({
  // baseURL: 'http://192.168.29.247:8000', 
  baseURL: 'http://ec2-65-0-97-169.ap-south-1.compute.amazonaws.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axioshttp;
