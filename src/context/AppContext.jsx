// src/context/AppContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, tokenStore, extractErrorMessage } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentPage, setCurrentPage]         = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder]     = useState(null);
  const [searchQuery, setSearchQuery]         = useState('');
  const [profileTab, setProfileTab]           = useState('orders');
  const [checkoutStep, setCheckoutStep]       = useState('cart');

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(tokenStore.get()));
  const [user, setUser]             = useState(() => {
    try { return JSON.parse(localStorage.getItem('lyra_user') || 'null'); }
    catch { return null; }
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState(null);

  // Persist user info (không sensitive)
  useEffect(() => {
    if (user) localStorage.setItem('lyra_user', JSON.stringify(user));
    else localStorage.removeItem('lyra_user');
  }, [user]);

  /* ── Navigation ──────────────────────────── */
  const navigate = useCallback((page, extra = {}) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentPage(page);
    if (extra.product)    setSelectedProduct(extra.product);
    if (extra.order)      setSelectedOrder(extra.order);
    if (extra.query !== undefined) setSearchQuery(extra.query);
    if (extra.profileTab) setProfileTab(extra.profileTab);
    if (page === 'cart')  setCheckoutStep('cart');
  }, []);

  /* ── Auth ────────────────────────────────── */
  /**
   * Đăng nhập.
   * Backend trả về { accessToken, tokenType, expiresIn } — không có user info.
   * Sau khi lấy token, ta lưu trữ thông tin user cơ bản từ response đăng ký
   * hoặc từ payload JWT (decode thủ công).
   */
  const login = useCallback(async (email, password) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data } = await authApi.login({ email, password });
      tokenStore.set(data.accessToken);

      // Decode payload JWT để lấy thông tin cơ bản (sub = userId)
      // Backend dùng sub = UUID của user
      const payload = parseJwtPayload(data.accessToken);
      const userInfo = {
        id:     payload?.sub || null,
        email,
        name:   payload?.name || email.split('@')[0],
        avatar: (payload?.name || email)[0].toUpperCase(),
      };
      setUser(userInfo);
      setIsLoggedIn(true);
      return userInfo;
    } catch (err) {
      const msg = extractErrorMessage(err, 'Email hoặc mật khẩu không đúng');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /**
   * Đăng ký.
   * Backend trả về { id, email, fullName, phone, createdAt }.
   * Sau đăng ký thành công, tự động đăng nhập.
   */
  const register = useCallback(async (fullName, email, password) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await authApi.register({ fullName, email, password });
      // Tự động login sau khi đăng ký
      return await login(email, password);
    } catch (err) {
      const msg = extractErrorMessage(err, 'Đăng ký thất bại, vui lòng thử lại');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  }, [login]);

  /**
   * Đăng xuất — gọi API để revoke refresh token cookie.
   */
  const logout = useCallback(async () => {
    try {
      if (tokenStore.get()) await authApi.logout();
    } catch {
      // Bỏ qua lỗi logout (token đã hết hạn v.v.)
    } finally {
      tokenStore.clear();
      setIsLoggedIn(false);
      setUser(null);
    }
  }, []);

  return (
    <AppContext.Provider value={{
      currentPage, navigate,
      selectedProduct, setSelectedProduct,
      selectedOrder, setSelectedOrder,
      searchQuery, setSearchQuery,
      isLoggedIn, user, authLoading, authError,
      login, register, logout,
      profileTab, setProfileTab,
      checkoutStep, setCheckoutStep,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

/* ── JWT decode helper ───────────────────────── */
function parseJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}