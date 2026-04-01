import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentPage, setCurrentPage]       = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder]   = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [isLoggedIn, setIsLoggedIn]         = useState(false);
  const [user, setUser]                     = useState(null);
  const [adminTab, setAdminTab]             = useState('dashboard');
  const [profileTab, setProfileTab]         = useState('orders');
  const [checkoutStep, setCheckoutStep]     = useState('cart');

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

  const login = (email, password) => {
    setIsLoggedIn(true);
    setUser({ name: 'Nguyễn Văn A', email, avatar: 'N' });
    return true;
  };

  const logout = () => { setIsLoggedIn(false); setUser(null); };

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