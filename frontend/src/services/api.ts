import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 5000,
});

api.interceptors.request.use(
  (config) => {
    console.log('Making request to:', config.url);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      console.error('Cannot connect to backend server. Please ensure:');
      console.error('1. Backend server is running (npm run dev in backend folder)');
      console.error('2. Backend is running on port 3000');
      console.error('3. No firewall is blocking the connection');
      
      error.response = {
        data: {
          message: 'Cannot connect to server. Please ensure the backend server is running.'
        }
      };
    }
    return Promise.reject(error);
  }
);

export { api };