// src/utils/api.js
import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://ec2-65-0-97-169.ap-south-1.compute.amazonaws.com', // Change this when backend is ready
  timeout: 10000,
});

export default instance;
