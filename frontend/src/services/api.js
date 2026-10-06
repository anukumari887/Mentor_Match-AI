import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for consistent error extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standardized error object format matching backend { error: { code, message, details } }
    if (error.response && error.response.data && error.response.data.error) {
      return Promise.reject(error.response.data.error);
    }
    const networkUnavailable = !error.response;
    return Promise.reject({
      code: networkUnavailable ? 'NETWORK_ERROR' : error.code || 'API_ERROR',
      message: networkUnavailable
        ? 'Cannot reach the Mentor-Match server. Start the backend at localhost:5000, then try again.'
        : error.message || 'Unable to complete the request.',
      details: []
    });
  }
);

export default api;
