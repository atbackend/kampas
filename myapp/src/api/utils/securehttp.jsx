import axios from 'axios';

const https = axios.create({
  // baseURL: 'http://192.168.29.247:8000', 
  baseURL: 'http://ec2-65-0-97-169.ap-south-1.compute.amazonaws.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

https.interceptors.response.use(
  res => res,
  err => {
    const { config, response } = err;
    if (
      config.url.includes('/auth_app/verify-email') &&
      response?.status === 401
    ) {
      return Promise.reject(err); // skip login redirect
    }
    if (response?.status === 401) {
      navigate('/login');
    }
    return Promise.reject(err);
  }
);
