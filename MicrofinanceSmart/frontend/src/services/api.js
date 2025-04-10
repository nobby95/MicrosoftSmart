import axios from 'axios';
import { toast } from 'react-toastify';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies
  timeout: 10000 // Add timeout
});

// Add a request interceptor to include authentication
api.interceptors.request.use(
  (config) => {
    // We're using cookies for authentication (handled by Flask)
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      
      if (status === 403) {
        // Forbidden
        toast.error('You do not have permission to perform this action');
      } else if (status === 404) {
        // Not found
        toast.error('The requested resource was not found');
      } else {
        // Other server errors
        toast.error(data.error || 'An error occurred');
      }
    } else if (error.request) {
      // The request was made but no response was received
      toast.error('No response from server. Please check your internet connection');
    } else {
      // Something happened in setting up the request that triggered an Error
      toast.error('Error: ' + error.message);
    }
    
    return Promise.reject(error);
  }
);

// Admin API endpoints
export const getUsers = () => api.get('/admin/users');
export const getUserById = (userId) => api.get(`/admin/users/${userId}`);
export const createUser = (userData) => api.post('/admin/users', userData);
export const updateUser = (userId, userData) => api.put(`/admin/users/${userId}`, userData);

export const getAllLoans = () => api.get('/admin/loans');
export const updateLoan = (loanId, loanData) => api.put(`/admin/loans/${loanId}`, loanData);

export const uploadExcelFile = (formData) => {
  return api.post('/admin/excel-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const getExcelFiles = () => api.get('/admin/excel-files');
export const getAnalysisResults = (fileId) => api.get(`/admin/excel-files/${fileId}/results`);
export const createFinancialMetric = (metricData) => api.post('/admin/metrics', metricData);
export const sendMessage = (messageData) => api.post('/admin/messages', messageData);

// Client API endpoints
export const getClientLoans = () => api.get('/client/loans');
export const getLoanById = (loanId) => api.get(`/client/loans/${loanId}`);
export const createLoanApplication = (loanData) => api.post('/client/loans', loanData);
export const makePayment = (paymentData) => api.post('/client/payments', paymentData);
export const getMessages = () => api.get('/client/messages');
export const getClientProfile = () => api.get('/client/profile');

// Dashboard API endpoints (used by both admin and client)
export const getDashboardMetrics = () => api.get('/dashboard/metrics');
export const getLoanStatistics = () => api.get('/dashboard/loan-stats');
export const getRecentActivity = () => api.get('/dashboard/recent-activity');
export const recordActivity = (activityData) => api.post('/dashboard/record-activity', activityData);

export default api;
