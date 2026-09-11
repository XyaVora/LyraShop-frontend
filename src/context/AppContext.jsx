// src/context/AppContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, profileApi, tokenStore, extractErrorMessage } from '../services/api';
import { buildUrl, pageTitle, parseLocation } from '../router';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [initialRoute] = useState(() => parseLocation(window.location));
  const [currentPage, setCurrentPage]         = useState(initialRoute.page);
  const [selectedProduct, setSelectedProduct] = useState(() =>
    initialRoute.params.product ? { slug: initialRoute.params.product } : null
  );
  const [selectedOrder, setSelectedOrder]     = useState(() =>
    initialRoute.params.order ? { id: initialRoute.params.order } : null
  );
  const [searchQuery, setSearchQuery]         = useState(initialRoute.params.q || '');
  const [profileTab, setProfileTab]           = useState(initialRoute.params.tab || 'orders');
  const [checkoutStep, setCheckoutStep]       = useState('cart');

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser]             = useState(null);
  const [authReady, setAuthReady]     = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState(null);

  // Khôi phục phiên bằng token rồi lấy danh tính thật từ backend. Không dùng
  // email/name trong localStorage làm bằng chứng đăng nhập.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token || token === 'undefined' || token === 'null') {
      tokenStore.clear();
      localStorage.removeItem('lyra_user');
      setAuthReady(true);
      return;
    }

    let cancelled = false;
    profileApi.get()
      .then(({ data }) => {
        if (cancelled) return;
        setUser(normalizeProfile(data));
        setIsLoggedIn(true);
        localStorage.removeItem('lyra_user');
      })
      .catch(() => {
        if (cancelled) return;
        tokenStore.clear();
        localStorage.removeItem('lyra_user');
        setUser(null);
        setIsLoggedIn(false);
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const route = parseLocation(window.location);
      setCurrentPage(route.page);
      setSelectedProduct(route.params.product ? { slug: route.params.product } : null);
      setSelectedOrder(route.params.order ? { id: route.params.order } : null);
      setSearchQuery(route.params.q || '');
      setProfileTab(route.params.tab || 'orders');
      document.title = pageTitle(route.page);
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', handlePopState);
    document.title = pageTitle(initialRoute.page);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialRoute.page]);

  useEffect(() => {
    const handleExpiredSession = () => {
      localStorage.removeItem('lyra_user');
      setUser(null);
      setIsLoggedIn(false);
      setAuthReady(true);
    };
    window.addEventListener('lyra:auth-expired', handleExpiredSession);
    return () => window.removeEventListener('lyra:auth-expired', handleExpiredSession);
  }, []);

  /* ── Navigation ──────────────────────────── */
  const navigate = useCallback((page, extra = {}) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentPage(page);
    if (extra.product)    setSelectedProduct(extra.product);
    if (extra.order)      setSelectedOrder(extra.order);
    if (extra.query !== undefined) setSearchQuery(extra.query);
    if (extra.profileTab) setProfileTab(extra.profileTab);
    if (page === 'cart')  setCheckoutStep('cart');

    const params = { ...extra };
    if (extra.product) params.product = extra.product.slug || extra.product.id;
    if (extra.order) params.order = extra.order.id;
    if (extra.query !== undefined) params.q = extra.query;
    if (extra.profileTab) params.tab = extra.profileTab;
    delete params.query;
    delete params.profileTab;
    const url = buildUrl(page, params);
    window.history[extra.replace ? 'replaceState' : 'pushState']({}, '', url);
    document.title = pageTitle(page, extra.product?.name);
  }, []);

  /* ── Auth ────────────────────────────────── */
  /**
   * Đăng nhập.
   * Backend trả về { accessToken, tokenType, expiresIn } — không có user info.
   * Sau khi lấy token, frontend gọi GET /me để lấy danh tính từ backend.
   */
  const login = useCallback(async (email, password) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data } = await authApi.login({ email, password });
      if (!data?.accessToken || typeof data.accessToken !== 'string') {
        throw new Error('Phản hồi đăng nhập không chứa access token hợp lệ');
      }
      tokenStore.set(data.accessToken);

      // Danh tính phải đến từ backend, không lấy từ email vừa nhập.
      const profile = await profileApi.get();
      const userInfo = normalizeProfile(profile.data);
      setUser(userInfo);
      setIsLoggedIn(true);
      setAuthReady(true);
      return userInfo;
    } catch (err) {
      tokenStore.clear();
      setUser(null);
      setIsLoggedIn(false);
      const msg = extractErrorMessage(err, err.message || 'Email hoặc mật khẩu không đúng');
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

  const updateProfile = useCallback(async (fullName, phone = null) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data } = await profileApi.update({ fullName, phone: phone || null });
      const nextUser = normalizeProfile(data);
      setUser(nextUser);
      return nextUser;
    } catch (err) {
      const msg = extractErrorMessage(err, 'Không thể cập nhật thông tin tài khoản');
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  }, []);

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
      localStorage.removeItem('lyra_user');
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
      authReady,
      login, register, logout, updateProfile,
      profileTab, setProfileTab,
      checkoutStep, setCheckoutStep,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

/* ── Profile mapping ─────────────────────────── */
function normalizeProfile(profile) {
  const name = profile?.fullName?.trim() || profile?.email || 'Thành viên';
  return {
    id: profile?.id || null,
    email: profile?.email || '',
    name,
    fullName: name,
    phone: profile?.phone || '',
    role: profile?.role || 'CUSTOMER',
    roles: profile?.role ? [profile.role] : [],
    createdAt: profile?.createdAt || null,
    avatar: name[0]?.toUpperCase() || 'U',
  };
}
