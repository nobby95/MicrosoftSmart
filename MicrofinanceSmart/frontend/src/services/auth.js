import api from './api';

// Register a new user
export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Registration failed');
  }
};

// Login user
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    
    if (response && response.user) {
      return response.user;
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Login failed');
  }
};

// Logout user
export const logout = async () => {
  try {
    await api.post('/auth/logout');
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Logout failed');
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/user');
    
    if (response && response.user) {
      return response.user;
    }
    
    return null;
  } catch (error) {
    // If 401, user is not logged in
    if (error.response && error.response.status === 401) {
      return null;
    }
    throw new Error(error.response?.data?.error || 'Failed to get user information');
  }
};

// Update user profile
export const updateUserProfile = async (userData) => {
  try {
    const response = await api.put('/auth/user', userData);
    
    if (response && response.user) {
      return response.user;
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to update profile');
  }
};
