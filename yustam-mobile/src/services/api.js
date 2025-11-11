import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const setApiAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message = error.response.data?.message || error.response.data?.error || 'An error occurred';
      return Promise.reject(new Error(message));
    }
    if (error.request) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    return Promise.reject(new Error(error.message || 'An unexpected error occurred'));
  }
);

const normaliseList = (payload) => payload?.items || payload?.products || payload?.listings || payload || [];
const normaliseProduct = (payload) => payload?.product || payload;

const buildFormData = (payload = {}) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
};

export const authAPI = {
  createSession: (idToken) => api.post('/auth/session', { idToken }),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (payload) => api.patch('/auth/me', payload),
};

export const listingsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/products', { params });
    return {
      items: normaliseList(response.data),
      pagination: response.data?.pagination,
    };
  },
  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return normaliseProduct(response.data);
  },
  create: async (payload = {}) => {
    const formData = payload instanceof FormData ? payload : buildFormData(payload);
    const response = await api.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normaliseProduct(response.data);
  },
  update: async (id, payload = {}) => {
    const formData = payload instanceof FormData ? payload : buildFormData(payload);
    const response = await api.patch(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normaliseProduct(response.data);
  },
  delete: (id) => api.delete(`/products/${id}`),
};

export const vendorAPI = {
  activate: (payload = {}) => api.post('/vendor/activate', payload),
  getDashboard: async () => {
    const response = await api.get('/vendor/me/dashboard');
    return response.data;
  },
  getAnalytics: async () => {
    const response = await api.get('/vendor/me/analytics');
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/vendor/me');
    return response.data?.profile ?? response.data;
  },
  updateProfile: async (payload = {}) => {
    const response = await api.patch('/vendor/me', payload);
    return response.data?.profile ?? response.data;
  },
  getStorefront: (slug) => api.get(`/vendor/storefront/${slug}`),
  getListingsForOwner: (ownerId, params = {}) =>
    listingsAPI.getAll({ ownerId, includeDrafts: true, ...params }),
};

export const planAPI = {
  listPlans: async () => {
    const response = await api.get('/plans');
    return response.data?.plans ?? [];
  },
  getSubscriptions: async () => {
    const response = await api.get('/plans/subscriptions/me');
    return response.data?.subscriptions ?? [];
  },
  subscribe: (planId) => api.post(`/plans/${planId}/subscribe`),
};

export const chatAPI = {
  listThreads: async () => {
    const response = await api.get('/chats');
    return response.data?.threads ?? response.data ?? [];
  },
  createThread: (payload = {}) => api.post('/chats', payload),
  assignThread: (threadId) => api.post(`/chats/${threadId}/assign`),
  recordMessage: (threadId, payload = {}) => api.post(`/chats/${threadId}/messages`, payload),
};

export const notificationsAPI = {
  list: async (filters = {}) => {
    const response = await api.get('/notifications', { params: filters });
    return response.data?.notifications ?? [];
  },
  markMany: (ids = []) => api.post('/notifications/read', { ids }),
  markAll: () => api.post('/notifications/read-all'),
  create: (payload) => api.post('/notifications', payload),
  getAll: function getAll(filters) {
    return this.list(filters);
  },
  markAllRead: function markAllRead() {
    return this.markAll();
  },
  clearAll: function clearAll() {
    return api.post('/notifications/read', { ids: [] });
  },
};

export const favoritesAPI = {
  list: async () => {
    const response = await api.get('/favorites');
    return response.data?.items ?? response.data ?? [];
  },
  add: (productId) => api.post('/favorites', { productId }),
  remove: (productId) => api.delete(`/favorites/${productId}`),
};

export const savedAPI = {
  getAll: () => favoritesAPI.list(),
  add: (productId) => favoritesAPI.add(productId),
  remove: (productId) => favoritesAPI.remove(productId),
};

export const homeAPI = {
  getFeed: async () => {
    const response = await api.get('/home');
    return response.data;
  },
  listCategories: async () => {
    const response = await api.get('/categories');
    return response.data?.categories ?? [];
  },
};

export const supportAPI = {
  listTickets: (query = {}) => api.get('/support', { params: query }),
  createTicket: (payload) => api.post('/support', payload),
  addMessage: (ticketId, payload) => api.post(`/support/${ticketId}/messages`, payload),
};

export default api;
