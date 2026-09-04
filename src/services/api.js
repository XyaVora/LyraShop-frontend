// src/services/api.js — lớp gọi HTTP cho LYRA.
// Backend chưa chạy thật (localhost:8080) nên mọi lỗi mạng sẽ được AppContext
// bắt lại và chuyển sang CHẾ ĐỘ DEMO offline. Xem `isOffline` ở cuối file.
import axios from 'axios';

const TOKEN_KEY = 'lyra_access_token';

/* ── localStorage an toàn ───────────────────────────────────────────────
   Một số trình duyệt (chặn cookie/private mode/webview nhúng) ném
   SecurityError ngay khi chạm vào localStorage → phải bọc try/catch,
   nếu không toàn bộ app trắng màn hình. */
const safeGet = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const safeSet = (key, value) => {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
};
const safeRemove = (key) => {
  try { localStorage.removeItem(key); } catch { /* bỏ qua */ }
};

/* URL gốc: ưu tiên biến môi trường; khi build production mà không khai báo
   thì dùng '/api' cùng origin thay vì nhúng localhost vào bundle. */
const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api');

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // 4000ms: không có backend thì phải rơi về chế độ demo thật nhanh.
  timeout: 4000,
});

// Gắn access token vào mọi request nếu có.
api.interceptors.request.use((config) => {
  const token = safeGet(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Hết phiên: xoá token và báo cho AppContext để đồng bộ state đăng nhập.
    if (error?.response?.status === 401) {
      safeRemove(TOKEN_KEY);
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try { window.dispatchEvent(new CustomEvent('lyra:auth-expired')); } catch { /* bỏ qua */ }
      }
    }
    return Promise.reject(error);
  },
);

export const tokenStore = {
  get: () => safeGet(TOKEN_KEY),
  set: (token) => safeSet(TOKEN_KEY, token),
  clear: () => safeRemove(TOKEN_KEY),
};

/** Status coi như "chưa có backend" chứ không phải lỗi nghiệp vụ. */
const NO_BACKEND_STATUS = new Set([404, 405, 501, 502, 503, 504]);

/**
 * Lỗi "offline": coi như KHÔNG có backend, UI rơi về dữ liệu demo.
 *
 * Gồm ba trường hợp:
 *  1. Không nhận được response nào (backend không chạy, timeout, DNS, CORS
 *     chặn ở tầng mạng) — đây là tình huống khi chạy `npm run dev`.
 *  2. Response có status thuộc nhóm "endpoint không tồn tại / dịch vụ chưa
 *     sẵn sàng". Khi build tĩnh đem deploy mà chưa gắn backend, `/api/...`
 *     sẽ trả 404 — nếu không xử lý thì đăng nhập demo sẽ hỏng trên bản
 *     production dù vẫn chạy tốt ở dev.
 *  3. Response trả về HTML (máy chủ tĩnh fallback index.html cho mọi đường
 *     dẫn không khớp). Đó không phải câu trả lời của một API thật.
 *
 * Lỗi nghiệp vụ thật (400/401/409/422…) KHÔNG thuộc nhóm này và sẽ được ném
 * lên cho giao diện hiển thị thông báo.
 *
 * @param {any} error
 * @returns {boolean}
 */
export const isOffline = (error) => {
  const res = error?.response;
  if (!res) return true;
  if (NO_BACKEND_STATUS.has(res.status)) return true;
  const type = String(res.headers?.['content-type'] || '');
  if (type.includes('text/html')) return true;
  return false;
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
