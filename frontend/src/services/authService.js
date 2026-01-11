import api from './api';

const authService = {
  // Login
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // Register
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Update profile
  updateProfile: async (userData) => {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  },

  // Change password
  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    return response.data;
  },

  // Forgot password - request reset email
  forgotPassword: async (email) => {
    const response = await api.post(`/auth/forgot-password?email=${encodeURIComponent(email)}`);
    return response.data;
  },

  // Reset password with token
  resetPassword: async (token, password, confirmPassword) => {
    const response = await api.post('/auth/reset-password', {
      token,
      password,
      confirm_password: confirmPassword,
    });
    return response.data;
  },

  // Verify email with token
  verifyEmail: async (token) => {
    const response = await api.post(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    return response.data;
  },

  // Resend verification email
  resendVerification: async () => {
    const response = await api.post('/auth/resend-verification');
    return response.data;
  },

  // Upload profile picture
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/auth/profile/picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete profile picture
  deleteProfilePicture: async () => {
    const response = await api.delete('/auth/profile/picture');
    return response.data;
  },

  // Admin login
  adminLogin: async (email, password) => {
    const response = await api.post('/admin/login', { email, password });
    return response.data;
  },

  // Admin logout
  adminLogout: async () => {
    const response = await api.post('/admin/logout');
    return response.data;
  },
};

export default authService;
