import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

const buildFormData = (payload = {}) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
};

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const nextConfig = { ...config };
    nextConfig.withCredentials = true;
    return nextConfig;
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
  vendorRegister: (data = {}) => {
    const formData = buildFormData({
      name: data.name || data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      confirm: data.confirm ?? data.password,
      business_name: data.business_name || data.businessName,
      category: data.category,
      role: 'vendor',
      source: data.source || 'mobile-app',
    });
    return api.post('/signup.php', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  vendorLogin: (email, password) => {
    const formData = buildFormData({ email, password });
    return api.post('/login.php', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
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
  openChat: (payload = {}) => api.post('/api/chat/chat-open.php', payload),
};

// Profile endpoints
export const profileAPI = {
  get: () => api.get('/vendor-profile.php', { params: { format: 'json' } }),
  update: (data) =>
    api.post('/update-vendor-profile.php', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getSettings: () => api.get('/vendor-settings.php', { params: { format: 'json' } }),
  updateSettings: (data) => api.post('/update-vendor-settings.php', data),
  deleteAccount: () => api.post('/vendor-delete-account.php'),
};

// Vendor-specific endpoints
export const vendorAPI = {
  getDashboard: () => api.get('/vendor-dashboard.php', { params: { format: 'json' } }),
  getListings: (params = {}) =>
    api.get('/vendor-listings-data.php', { params: { format: 'json', ...params } }),
  deleteListing: (listingId) => api.post('/vendor-listing-delete.php', { listingId }),
  getPlans: () => api.get('/vendor-plans.php', { params: { format: 'json' } }),
  manageSubscription: (payload) => api.post('/vendor-subscription-action.php', payload),
  getBillingHistory: () => api.get('/vendor-billing-history.php', { params: { format: 'json' } }),
  getVerificationStatus: () => api.get('/vendor-verification-status.php'),
  submitVerification: (payload) => {
    const formData = buildFormData(payload);
    return api.post('/vendor-verification-status.php', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getStorefront: (identifier) => api.get('/vendor-storefront-data.php', { params: { id: identifier } }),
  getProfile: () => api.get('/vendor-profile.php', { params: { format: 'json' } }),
  updateProfile: (payload) =>
    api.post('/update-vendor-profile.php', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getNotifications: () => api.get('/vendor-notifications-data.php'),
  updateNotifications: (action) => {
    const formData = buildFormData({ action });
    return api.post('/vendor-notifications-data.php', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getChats: (uid) =>
    api.get('/api/chat/list-chats.php', {
      params: { role: 'vendor', uid },
    }),
};

// Notifications endpoints
export const notificationsAPI = {
  getAll: () => vendorAPI.getNotifications(),
  markAllRead: () => vendorAPI.updateNotifications('markAllRead'),
  clearAll: () => vendorAPI.updateNotifications('clearAll'),
};

// Saved items (buyer)
export const savedAPI = {
  getAll: () => api.get('/buyer-saved.php'),
  add: (listingId) => api.post('/buyer-storage.php', { listingId, action: 'save' }),
  remove: (listingId) => api.post('/buyer-storage.php', { listingId, action: 'unsave' }),
};

export default api;
