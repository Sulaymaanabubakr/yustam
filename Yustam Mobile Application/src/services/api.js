import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    // Token will be added by AuthContext when needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.message || error.response.data?.error || 'An error occurred';
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // Request made but no response
      return Promise.reject(new Error('Network error. Please check your connection.'));
    } else {
      // Something else happened
      return Promise.reject(new Error(error.message || 'An unexpected error occurred'));
    }
  }
);

// Auth endpoints
export const authAPI = {
  // Vendor endpoints
  vendorRegister: (data) => api.post('/signup.php', { ...data, role: 'vendor' }),
  vendorLogin: (email, password) => api.post('/vendor-login.html', { email, password }),
  
  // Buyer endpoints
  buyerRegister: (data) => api.post('/buyer-register.php', data),
  buyerLogin: (email, password) => api.post('/buyer-login.php', { email, password }),
  
  // Google login
  googleLogin: (idToken, role) => api.post('/google-login.php', { idToken, role }),
  
  // Password reset
  forgotPassword: (email) => api.post('/forgot-password.php', { email }),
  resetPassword: (token, password) => api.post('/reset-password.php', { token, password }),
};

// Listings endpoints
export const listingsAPI = {
  getAll: (params) => api.get('/api/listings.php', { params }),
  getById: (id) => api.get(`/product.php?id=${id}`),
  search: (query, filters) => api.get('/api/search.php', { params: { q: query, ...filters } }),
  getFeatured: () => api.get('/api/listings.php?featured=true'),
  getByCategory: (category) => api.get('/api/listings.php', { params: { category } }),
  
  // Vendor endpoints
  create: (data) => api.post('/post.html', data),
  update: (id, data) => api.post('/vendor-listing-update.php', { id, ...data }),
  delete: (id) => api.post('/vendor-listing-delete.php', { id }),
  getVendorListings: () => api.get('/vendor-listings-data.php'),
};

// Chat endpoints
export const chatAPI = {
  listChats: () => api.get('/api/chat/list-chats.php'),
  listMessages: (chatId) => api.get('/api/chat/list-messages.php', { params: { chatId } }),
  sendMessage: (chatId, message) => api.post('/api/chat/send-message.php', { chatId, message }),
  markAsRead: (chatId) => api.post('/api/chat/mark-read.php', { chatId }),
  openChat: (vendorId, listingId) => api.post('/api/chat/chat-open.php', { vendorId, listingId }),
};

// Profile endpoints
export const profileAPI = {
  get: () => api.get('/vendor-profile.php'),
  update: (data) => api.post('/update-vendor-profile.php', data),
  getSettings: () => api.get('/vendor-settings.php', { params: { format: 'json' } }),
  updateSettings: (data) => api.post('/update-vendor-settings.php', data),
  deleteAccount: () => api.post('/vendor-delete-account.php'),
};

// Vendor-specific endpoints
export const vendorAPI = {
  getPlans: () => api.get('/vendor-plans.php'),
  subscribeToPlan: (planId) => api.post('/vendor-subscription-action.php', { planId, action: 'subscribe' }),
  getBillingHistory: () => api.get('/vendor-billing-history.php'),
  getVerificationStatus: () => api.get('/vendor-verification-status.php'),
  submitVerification: (data) => api.post('/vendor-verification.php', data),
};

// Notifications endpoints
export const notificationsAPI = {
  getAll: () => api.get('/vendor-notifications-data.php'),
  markAsRead: (id) => api.post('/notifications-storage.php', { id, action: 'read' }),
};

// Saved items (buyer)
export const savedAPI = {
  getAll: () => api.get('/buyer-saved.php'),
  add: (listingId) => api.post('/buyer-storage.php', { listingId, action: 'save' }),
  remove: (listingId) => api.post('/buyer-storage.php', { listingId, action: 'unsave' }),
};

export default api;
