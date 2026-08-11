import axios from 'axios';

const TOKEN_KEY = 'maison_access_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) localStorage.removeItem(TOKEN_KEY);
    return Promise.reject(error);
  },
);

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
};

export const productApi = {
  list: (params = {}) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  categories: () => api.get('/categories'),
};

export const cartApi = {
  get: () => api.get('/cart'),
  add: (payload) => api.post('/cart/items', payload),
  update: (id, quantity) => api.patch(`/cart/items/${id}`, { quantity }),
  remove: (id) => api.delete(`/cart/items/${id}`),
};

export const wishlistApi = {
  get: () => api.get('/wishlist'),
  toggle: (productId) => api.put(`/wishlist/${productId}`),
};

export const couponApi = {
  validate: (code, subtotal) => api.post('/coupons/validate', { code, subtotal }),
};

export const orderApi = {
  create: (payload) => api.post('/orders', payload),
  mine: () => api.get('/orders/me'),
  get: (id) => api.get(`/orders/${id}`),
};

export default api;
