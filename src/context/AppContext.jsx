// src/context/AppContext.jsx — định tuyến (URL thật) + phiên đăng nhập.
// Không dùng thư viện router: mọi ánh xạ URL <-> trang nằm ở src/router.js.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { buildUrl, pageTitle, parseLocation } from '../router.js';
import { CATEGORIES, findProduct } from '../data/products';
import { authApi, isOffline, profileApi, tokenStore } from '../services/api';
import { findCachedProduct } from '../services/catalog';

const AppContext = createContext(null);

const USER_KEY = 'lyra_user';
const LEGACY_USER_KEY = 'maison_demo_user'; // khoá cũ — chỉ để dọn dẹp

/* ── localStorage an toàn (có thể bị chặn → ném SecurityError) ───────── */
const safeGet = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const safeSet = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* bỏ qua */ }
};
const safeRemove = (key) => {
  try { localStorage.removeItem(key); } catch { /* bỏ qua */ }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mã người dùng ổn định suy ra từ email (không dùng Math.random). */
function hashId(seed) {
  const s = String(seed || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `u${(h >>> 0).toString(36)}`;
}

/** Tên hiển thị suy ra từ phần trước @ của email. */
function nameFromEmail(email) {
  const local = String(email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!local) return 'Khách hàng LYRA';
  return local
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Chuẩn hoá user về đúng shape hợp đồng §2. */
function normalizeUser(raw, fallbackEmail = '') {
  const email = String(raw?.email || fallbackEmail || '').trim();
  const name = String(raw?.name || raw?.fullName || nameFromEmail(email)).trim();
  return {
    id: raw?.id || hashId(email),
    name,
    email,
    phone: raw?.phone || '',
    avatar: (name.charAt(0) || email.charAt(0) || 'L').toUpperCase(),
    role: raw?.role || 'customer',
    joined: raw?.joined || raw?.createdAt || new Date().toISOString(),
  };
}

/** Đọc route hiện tại từ thanh địa chỉ. */
function readRoute() {
  if (typeof window === 'undefined') return { page: 'home', params: {}, pathname: '/' };
  const { page, params } = parseLocation(window.location);
  return { page, params, pathname: window.location.pathname || '/' };
}

/** Tách URL do buildUrl sinh ra thành { pathname, search }. */
function splitUrl(url) {
  const i = url.indexOf('?');
  return i === -1 ? { pathname: url, search: '' } : { pathname: url.slice(0, i), search: url.slice(i) };
}

export function AppProvider({ children }) {
  // ── ROUTE ────────────────────────────────────────────────────────────
  const [route, setRoute] = useState(readRoute);
  const { page: currentPage, params, pathname } = route;

  /**
   * Điều hướng nội bộ.
   * @param {string} page - một trong PAGES
   * @param {object} extra - params URL + cờ điều khiển { replace, keepScroll }
   *   `product` nhận object sản phẩm / id / slug; `order` nhận id có hoặc không '#'.
   */
  const navigate = useCallback((page, extra = {}) => {
    const { replace = false, keepScroll = false, ...rest } = extra || {};
    const next = { ...rest };

    // product có thể là object sản phẩm → lấy slug.
    if (next.product && typeof next.product === 'object') {
      next.product = next.product.slug || next.product.id;
    }
    // order luôn lưu trong URL ở dạng không có '#'.
    if (next.order !== undefined && next.order !== null && next.order !== '') {
      next.order = String(next.order).replace(/^#/, '');
    }

    const url = buildUrl(page, next);
    const { pathname: nextPath, search } = splitUrl(url);
    // Parse lại chính URL vừa dựng để state luôn khớp thanh địa chỉ.
    const parsed = parseLocation({ pathname: nextPath, search });

    try {
      // Đi tới đúng URL đang mở thì thay thế, không đẩy thêm entry — nếu không
      // lịch sử sẽ đầy các entry trùng nhau và người dùng phải bấm Back nhiều
      // lần mới rời được trang hiện tại.
      const sameUrl = typeof window !== 'undefined'
        && url === `${window.location.pathname}${window.location.search}`;
      if (replace || sameUrl) window.history.replaceState({ page: parsed.page }, '', url);
      else window.history.pushState({ page: parsed.page }, '', url);
    } catch { /* môi trường không có history: bỏ qua, state vẫn đổi */ }

    setRoute({ page: parsed.page, params: parsed.params, pathname: nextPath });

    // Cuộn tức thì (không smooth) trừ khi trang chỉ đổi query của chính nó.
    if (!keepScroll && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  // Back/Forward của trình duyệt → đọc lại URL.
  // Đồng thời phát tín hiệu để các lớp phủ (giỏ hàng, menu mobile, hộp tìm kiếm)
  // tự đóng: nếu không, bấm Back khi đang mở drawer sẽ để lại lớp phủ che trang
  // và khoá cuộn body vĩnh viễn.
  useEffect(() => {
    const onPop = () => {
      setRoute(readRoute());
      try { window.dispatchEvent(new CustomEvent('lyra:navigated')); } catch { /* bỏ qua */ }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── DẪN XUẤT TỪ PARAMS (không lưu trùng state) ───────────────────────
  const selectedProduct = useMemo(
    () => findProduct(params.product) || findCachedProduct(params.product),
    [params.product],
  );
  const selectedOrder = useMemo(
    () => (params.order ? `#${String(params.order).replace(/^#/, '')}` : null),
    [params.order],
  );
  const searchQuery = params.q || '';
  const profileTab = params.tab || 'orders';

  // Tiêu đề tài liệu theo trang (kèm tên sản phẩm / danh mục / từ khoá).
  useEffect(() => {
    let extra;
    if (currentPage === 'detail' && selectedProduct) extra = selectedProduct.name;
    else if (currentPage === 'search' && searchQuery) extra = `Tìm kiếm: ${searchQuery}`;
    else if (currentPage === 'shop' && params.cat) {
      const cat = (CATEGORIES || []).find((c) => c.slug === params.cat || c.name === params.cat);
      if (cat) extra = cat.name;
    } else if (currentPage === 'order-detail' && selectedOrder) extra = `Đơn hàng ${selectedOrder}`;
    document.title = pageTitle(currentPage, extra);
  }, [currentPage, selectedProduct, searchQuery, selectedOrder, params.cat]);

  // ── PHIÊN ĐĂNG NHẬP ──────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Khôi phục phiên từ localStorage khi tải trang.
  useEffect(() => {
    safeRemove(LEGACY_USER_KEY); // dọn khoá maison_* cũ
    try {
      const raw = safeGet(USER_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object' && parsed.email) setUser(normalizeUser(parsed));
    } catch { /* dữ liệu hỏng → coi như chưa đăng nhập */ }
    setAuthLoading(false);
  }, []);

  const persistUser = useCallback((u) => {
    setUser(u);
    if (u) safeSet(USER_KEY, JSON.stringify(u));
    else safeRemove(USER_KEY);
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return undefined;
    let cancelled = false;
    profileApi.get()
      .then(({ data }) => {
        if (!cancelled) persistUser(normalizeUser(data, data?.email));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [persistUser]);

  const logout = useCallback(() => {
    tokenStore.clear();
    safeRemove(LEGACY_USER_KEY);
    persistUser(null);
  }, [persistUser]);

  // Token hết hạn (401 từ interceptor) → đồng bộ state đăng nhập.
  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener('lyra:auth-expired', onExpired);
    return () => window.removeEventListener('lyra:auth-expired', onExpired);
  }, [logout]);

  /** Lấy thông điệp lỗi từ response của backend. */
  const apiMessage = (error, fallback) =>
    error?.response?.data?.message || error?.response?.data?.error || fallback;

  /**
   * Đăng nhập. Thử API thật trước; nếu không có backend (network error/timeout)
   * thì rơi về CHẾ ĐỘ DEMO offline. Lỗi có status → throw để trang hiện inline.
   */
  const applyProfile = useCallback(async (fallbackEmail) => {
    try {
      const { data } = await profileApi.get();
      const u = normalizeUser(data, fallbackEmail || data?.email);
      persistUser(u);
      return u;
    } catch {
      const u = normalizeUser({ email: fallbackEmail });
      persistUser(u);
      return u;
    }
  }, [persistUser]);

  const login = useCallback(async (email, password) => {
    const mail = String(email || '').trim();
    const pass = String(password || '');
    try {
      const { data } = await authApi.login({ email: mail, password: pass });
      if (data?.accessToken) tokenStore.set(data.accessToken);
      return await applyProfile(mail);
    } catch (error) {
      // Backend trả lỗi có status → báo cho người dùng, không vào demo.
      if (!isOffline(error)) throw new Error(apiMessage(error, 'Email hoặc mật khẩu không đúng.'));

      // ── CHẾ ĐỘ DEMO ─────────────────────────────────────────────
      if (!EMAIL_RE.test(mail)) throw new Error('Email không hợp lệ.');
      if (pass.length < 6) throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
      const u = normalizeUser({ email: mail });
      persistUser(u);
      return u;
    }
  }, [applyProfile, persistUser]);

  /** Đăng ký — backend không trả token nên login ngay sau khi tạo tài khoản. */
  const register = useCallback(async (fullName, email, password) => {
    const name = String(fullName || '').trim();
    const mail = String(email || '').trim();
    const pass = String(password || '');
    try {
      await authApi.register({ fullName: name, email: mail, password: pass });
      return await login(mail, pass);
    } catch (error) {
      if (!isOffline(error)) throw new Error(apiMessage(error, 'Không thể tạo tài khoản.'));

      // ── CHẾ ĐỘ DEMO ─────────────────────────────────────────────
      if (!name) throw new Error('Vui lòng nhập họ và tên.');
      if (!EMAIL_RE.test(mail)) throw new Error('Email không hợp lệ.');
      if (pass.length < 6) throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
      const u = normalizeUser({ name, email: mail });
      persistUser(u);
      return u;
    }
  }, [login, persistUser]);

  /** Cập nhật hồ sơ (trang Tài khoản). Email không đổi trên API. */
  const updateUser = useCallback(async (patch) => {
    const fullName = String(patch?.name || patch?.fullName || '').trim();
    const phone = patch?.phone;
    if (tokenStore.get() && fullName) {
      try {
        const { data } = await profileApi.update({
          fullName,
          phone: phone == null || String(phone).trim() === '' ? null : String(phone).trim(),
        });
        persistUser(normalizeUser({ ...data, name: data.fullName }, data.email));
        return;
      } catch {
        /* giữ bản local nếu PUT /me thất bại */
      }
    }
    setUser((prev) => {
      if (!prev) return prev;
      const merged = normalizeUser({ ...prev, ...(patch || {}) });
      safeSet(USER_KEY, JSON.stringify(merged));
      return merged;
    });
  }, [persistUser]);

  const value = useMemo(() => ({
    // định tuyến
    currentPage, params, pathname, navigate,
    selectedProduct, selectedOrder, searchQuery, profileTab,
    // phiên đăng nhập
    user,
    isLoggedIn: Boolean(user),
    authLoading,
    login, register, logout, updateUser,
  }), [
    currentPage, params, pathname, navigate,
    selectedProduct, selectedOrder, searchQuery, profileTab,
    user, authLoading, login, register, logout, updateUser,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
export default AppContext;
