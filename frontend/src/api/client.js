import axios from 'axios';

// Base URL - uses proxy in dev, full URL in production
// const API_URL = import.meta.env.VITE_API_URL || '/api';
const API_URL = import.meta.env.VITE_API_URL || '/api';


// Create axios instance with defaults
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Return formatted error
    const message = error.response?.data?.error || 'An error occurred';
    return Promise.reject({ message, status: error.response?.status });
  }
);

export default apiClient;

export const submitOvertimeRequest = async (data) => {
  const response = await apiClient.post('/overtime/submit', data);
  return response.data.data;
};

/**
 * Get my overtime requests
 */
export const getMyOvertimeRequests = async (params = {}) => {
  const response = await apiClient.get('/overtime/my-requests', { params });
  return response.data.data;
};

/**
 * Get my overtime balance
 */
export const getMyOvertimeBalance = async () => {
  const response = await apiClient.get('/overtime/my-balance');
  return response.data.data;
};

/**
 * Get single overtime request by ID
 */
export const getOvertimeRequestById = async (requestId) => {
  const response = await apiClient.get(`/overtime/${requestId}`);
  return response.data.data;
};

/**
 * Edit overtime request
 */
export const editOvertimeRequest = async (requestId, data) => {
  const response = await apiClient.put(`/overtime/${requestId}`, data);
  return response.data.data;
};

/**
 * Delete overtime request
 */
export const deleteOvertimeRequest = async (requestId) => {
  const response = await apiClient.delete(`/overtime/${requestId}`);
  return response.data;
};

/**
 * Get pending approvals (for approvers)
 */
export const getPendingOvertimeApprovals = async () => {
  const response = await apiClient.get('/overtime/pending-approval/list');
  return response.data.data;
};

/**
 * Approve overtime request
 */
export const approveOvertimeRequest = async (requestId, comment) => {
  const response = await apiClient.post(`/overtime/${requestId}/approve`, { comment });
  return response.data.data;
};

/**
 * Reject overtime request
 */
export const rejectOvertimeRequest = async (requestId, comment) => {
  const response = await apiClient.post(`/overtime/${requestId}/reject`, { comment });
  return response.data.data;
};

/**
 * Request revision
 */
export const requestOvertimeRevision = async (requestId, comment) => {
  const response = await apiClient.post(`/overtime/${requestId}/request-revision`, { comment });
  return response.data.data;
};

// ============================================
// ADMIN OVERTIME FUNCTIONS
// ============================================

/**
 * Get all overtime requests (Admin)
 */
export const getAllOvertimeRequests = async (params = {}) => {
  const response = await apiClient.get('/overtime/admin/all-requests', { params });
  return response.data.data;
};

/**
 * Process monthly balance (Admin)
 */
export const processMonthlyOvertimeBalance = async (data) => {
  const response = await apiClient.post('/overtime/admin/process-balance', data);
  return response.data;
};

/**
 * Reset employee overtime balance (Admin)
 */
export const resetOvertimeBalance = async (userId) => {
  const response = await apiClient.post(`/overtime/admin/reset-balance/${userId}`);
  return response.data;
};

/**
 * Get overtime statistics (Admin)
 */
export const getOvertimeStatistics = async (params = {}) => {
  const response = await apiClient.get('/overtime/admin/statistics', { params });
  return response.data.data;
};