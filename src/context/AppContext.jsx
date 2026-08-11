import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, tokenStore } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentPage, setCurrentPage]       = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder]   = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [isLoggedIn, setIsLoggedIn]         = useState(() => Boolean(localStorage.getItem('maison_demo_user')));
  const [user, setUser]                     = useState(() => {
    try { return JSON.parse(localStorage.getItem('maison_demo_user') || 'null'); } catch { return null; }
  });
  const [adminTab, setAdminTab]             = useState('dashboard');
  const [profileTab, setProfileTab]         = useState('orders');
  const [checkoutStep, setCheckoutStep]     = useState('cart');

  const [authLoading, setAuthLoading]       = useState(true);
  const navigate = (page, extra = {}) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentPage(page);
    if (extra.product)    setSelectedProduct(extra.product);
    if (extra.order)      setSelectedOrder(extra.order);
    if (extra.query !== undefined) setSearchQuery(extra.query);
    if (extra.adminTab)   setAdminTab(extra.adminTab);
    if (extra.profileTab) setProfileTab(extra.profileTab);
    if (page === 'cart')  setCheckoutStep('cart');
  };
  /* Legacy demo authentication kept temporarily for reference.

  const login = (email, password) => {
  useEffect(() => {
    if (user) localStorage.setItem('maison_demo_user', JSON.stringify(user));
    else localStorage.removeItem('maison_demo_user');
  }, [user]);

    setIsLoggedIn(true);
    setUser({ name: 'Nguyễn Văn A', email, avatar: 'N' });
    return true;
  };
  */

  const login = async (email, password) => { const { data } = await authApi.login({ email, password }); tokenStore.set(data.accessToken); setUser(data.user); setIsLoggedIn(true); return data.user; };
  const register = async (fullName, email, password) => { const { data } = await authApi.register({ fullName, email, password }); tokenStore.set(data.accessToken); setUser(data.user); setIsLoggedIn(true); return data.user; };
  const logout = () => { tokenStore.clear(); setIsLoggedIn(false); setUser(null); };

  return (
    <AppContext.Provider value={{
      currentPage, navigate,
      selectedProduct, setSelectedProduct,
      selectedOrder, setSelectedOrder,
      searchQuery, setSearchQuery,
      isLoggedIn, login, logout, user,
      adminTab, setAdminTab,
      profileTab, setProfileTab,
      checkoutStep, setCheckoutStep,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);