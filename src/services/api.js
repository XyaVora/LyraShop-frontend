// src/services/api.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const TOKEN_KEY = 'lyra_access_token';
const CSRF_KEY = 'lyra_xsrf_token';

/* ── Axios instance ──────────────────────────── */
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // cần cho refresh-token cookie & CSRF cookie
  timeout: 15000,
});

/* ── Token helpers ───────────────────────────── */
export const tokenStore = {
  get: ()        => localStorage.getItem(TOKEN_KEY),
  set: (token)   => localStorage.setItem(TOKEN_KEY, token),
  clear: ()      => localStorage.removeItem(TOKEN_KEY),
};

/** Lỗi mạng / timeout — không có HTTP status từ backend. */
export const isOffline = (error) =>
  !error?.response && (
    error?.code === 'ERR_NETWORK'
    || error?.code === 'ECONNABORTED'
    || error?.message === 'Network Error'
  );

export const csrfStore = {
  get: ()        => sessionStorage.getItem(CSRF_KEY),
  set: (token)   => {
    if (token) sessionStorage.setItem(CSRF_KEY, token);
  },
  clear: ()      => sessionStorage.removeItem(CSRF_KEY),
};

/* ── Request interceptor: đính kèm Bearer token & CSRF header ─ */
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Đính kèm header X-XSRF-TOKEN cho refresh/logout khi cần
  const xsrf = csrfStore.get();
  if (xsrf) {
    config.headers['X-XSRF-TOKEN'] = xsrf;
  }

  return config;
});

/* ── Response interceptor: lưu XSRF-TOKEN và auto-refresh khi 401 ─ */
let isRefreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  (response) => {
    // Lưu header X-XSRF-TOKEN nếu backend trả về (từ login, refresh, csrf)
    const xsrf = response.headers?.['x-xsrf-token'] || response.headers?.['X-XSRF-TOKEN'];
    if (xsrf) {
      csrfStore.set(xsrf);
    }
    return response;
  },
  async (error) => {
    const original = error.config;

    // Nếu 401 và chưa retry và không phải endpoint auth
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/')
    ) {
      original._retry = true;

      if (isRefreshing) {
        // Đợi refresh xong rồi thử lại
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      isRefreshing = true;
      try {
        const { data, headers } = await authApi.refresh();
        tokenStore.set(data.accessToken);

        const newXsrf = headers?.['x-xsrf-token'] || headers?.['X-XSRF-TOKEN'];
        if (newXsrf) csrfStore.set(newXsrf);

        refreshQueue.forEach(({ resolve }) => resolve(data.accessToken));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        tokenStore.clear();
        csrfStore.clear();
        refreshQueue.forEach(({ reject }) => reject(refreshError));
        refreshQueue = [];
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/* ── Auth API ────────────────────────────────── */
export const authApi = {
  /**
   * Đăng ký — POST /auth/register
   * Body: { email, password, fullName, phone? }
   * Response: { id, email, fullName, phone, createdAt }
   */
  register: (payload) => api.post('/auth/register', payload),

  /**
   * Đăng nhập — POST /auth/login
   * Body: { email, password }
   * Response: { accessToken, tokenType, expiresIn }
   * Header: X-XSRF-TOKEN
   * Cookie: __Secure-LyraShopRefresh (HttpOnly)
   */
  login: async (payload) => {
    const res = await api.post('/auth/login', payload);
    const xsrf = res.headers?.['x-xsrf-token'] || res.headers?.['X-XSRF-TOKEN'];
    if (xsrf) csrfStore.set(xsrf);
    return res;
  },

  /**
   * Lấy CSRF token sau khi reload trang — GET /auth/csrf
   * Header X-XSRF-TOKEN được trả về
   */
  csrf: async () => {
    const res = await api.get('/auth/csrf');
    const xsrf = res.headers?.['x-xsrf-token'] || res.headers?.['X-XSRF-TOKEN'];
    if (xsrf) csrfStore.set(xsrf);
    return res;
  },

  /**
   * Refresh access token — POST /auth/refresh
   * Dùng cookie refresh token + X-XSRF-TOKEN header
   */
  refresh: async () => {
    // Nếu chưa có CSRF token trong session, lấy trước
    if (!csrfStore.get()) {
      try { await authApi.csrf(); } catch {}
    }
    const res = await api.post('/auth/refresh');
    const xsrf = res.headers?.['x-xsrf-token'] || res.headers?.['X-XSRF-TOKEN'];
    if (xsrf) csrfStore.set(xsrf);
    return res;
  },

  /**
   * Đăng xuất — POST /auth/logout
   * Cần Bearer token + X-XSRF-TOKEN header
   */
  logout: async () => {
    if (!csrfStore.get()) {
      try { await authApi.csrf(); } catch {}
    }
    const res = await api.post('/auth/logout');
    csrfStore.clear();
    return res;
  },
};

/* ── Products API ────────────────────────────── */
export const productApi = {
  /**
   * Danh sách sản phẩm — GET /products
   * Params: keyword, category (slug), minPrice, maxPrice,
   *         sort (name|price|createdAt,asc|desc), page, size
   * Response: { content: ProductResponse[], page, size, totalElements, totalPages }
   */
  list: (params = {}) => api.get('/products', { params }),

  /**
   * Chi tiết sản phẩm — GET /products/:uuid
   * Response: { id, name, slug, description, basePrice, categoryId, createdAt, updatedAt,
   *             variants: [{ id, sku, size, color, price, stock }] }
   */
  get: (id) => api.get(`/products/${id}`),
};

/* ── Categories API ──────────────────────────── */
export const categoryApi = {
  /**
   * Danh sách danh mục — GET /categories
   * Response: [{ id, name, slug, description, parentId, createdAt, updatedAt }]
   */
  list: () => api.get('/categories'),

  /**
   * Chi tiết danh mục — GET /categories/:id
   */
  get: (id) => api.get(`/categories/${id}`),
};

/* ── Utility ─────────────────────────────────── */
/**
 * Trích xuất message lỗi từ ApiErrorResponse của backend
 * Backend: { timestamp, status, code, message, path, fieldErrors }
 */
export function extractErrorMessage(error, fallback = 'Đã có lỗi xảy ra') {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
    return Object.values(data.fieldErrors).join(', ');
  }
  return data.message || fallback;
}

export default api;
