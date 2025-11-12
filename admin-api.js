const PROD_BASE = 'https://yustam-backend.vercel.app/api';
const LOCAL_BASE = 'http://localhost:4000/api';

const DEFAULT_BASE =
  typeof window !== 'undefined' && window.location
    ? window.location.hostname === 'localhost'
      ? LOCAL_BASE
      : PROD_BASE
    : PROD_BASE;
const TOKEN_KEY = 'yustam_admin_token';
const USER_KEY = 'yustam_admin_user';

const resolveBaseUrl = () => {
  if (typeof window !== 'undefined' && window.__YUSTAM_API_BASE_URL__) {
    return window.__YUSTAM_API_BASE_URL__;
  }
  return DEFAULT_BASE;
};

export const ADMIN_API_BASE_URL = resolveBaseUrl();

export const getAdminToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getAdminProfile = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const storeAdminSession = ({ token, user }) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch (error) {
    console.error('Failed to persist admin session', error);
  }
};

export const clearAdminSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Failed to clear admin session', error);
  }
};

const extractMessage = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => ({}));
    return payload?.message || payload?.error || JSON.stringify(payload);
  }
  return response.text();
};

export const adminRequest = async (path, options = {}) => {
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.method && options.method !== 'GET') {
    headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: isFormData || !options.body || typeof options.body === 'string'
      ? options.body
      : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const message = await extractMessage(response);
    throw new Error(message || `Request failed: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

export const adminAPI = {
  me: () => adminRequest('/auth/me'),
  dashboard: () => adminRequest('/admin/dashboard'),
  vendors: () => adminRequest('/admin/vendors'),
  products: () => adminRequest('/admin/products'),
  plans: () => adminRequest('/admin/plans'),
  verifications: () => adminRequest('/admin/verifications'),
  updateProductStatus: (productId, payload) =>
    adminRequest(`/products/${productId}`, { method: 'PATCH', body: payload }),
  notifications: () => adminRequest('/notifications'),
  markNotifications: (ids = []) =>
    adminRequest('/notifications/read', { method: 'POST', body: { ids } }),
};
