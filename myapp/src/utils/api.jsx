// src/utils/api.js
import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:8000', // Change this when backend is ready
  timeout: 10000,
});

export default instance;
