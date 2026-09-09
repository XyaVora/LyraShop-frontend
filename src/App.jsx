// src/App.jsx
import { useEffect, useRef, useState } from 'react';
import { useApp } from './context/AppContext';
import { useCart } from './context/CartContext';
import { useReveal } from './hooks/useReveal';

import Navbar from './components/Navbar';
import { ToastContainer } from './components/index.jsx';
import { LoadingScreen } from './pages/NotFoundPage.jsx';

import HomePage           from './pages/HomePage';
import ShopPage           from './pages/ShopPage';
import SalePage           from './pages/SalePage';
import NewArrivalsPage    from './pages/NewArrivalsPage';
import BrandsPage         from './pages/BrandsPage';
import ProductDetailPage  from './pages/ProductDetailPage';
import CartPage           from './pages/CartPage';
import AuthPage           from './pages/AuthPage';
import ProfilePage        from './pages/ProfilePage';
import NotFoundPage       from './pages/NotFoundPage';
import SearchPage         from './pages/SearchPage';
import WishlistPage       from './pages/WishlistPage';
import OrderDetailPage    from './pages/OrderDetailPage';

export default function App() {
  const { currentPage, isLoggedIn } = useApp();
  const { showToast } = useCart();
  const [loading, setLoading] = useState(true);
  const [progressOn, setProgressOn] = useState(false);
  const firstNav = useRef(true);

  useReveal([currentPage]);

  // Simulate initial load
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Welcome toast on first load
    if (!loading) {
      setTimeout(() => showToast('Chào mừng đến với LYRA! 👋', 'bi-bag-heart'), 400);
    }
  }, [loading]);

  useEffect(() => {
    if (loading) return undefined;
    if (firstNav.current) {
      firstNav.current = false;
      return undefined;
    }
    setProgressOn(true);
    const t = setTimeout(() => setProgressOn(false), 720);
    return () => clearTimeout(t);
  }, [currentPage, loading]);

  if (loading) return <LoadingScreen />;

  const noPageWrapper = ['auth'];

  const renderPage = () => {
    switch (currentPage) {
      case 'home':         return <HomePage />;
      case 'shop':         return <ShopPage />;
      case 'sale':         return <SalePage />;
      case 'new':          return <NewArrivalsPage />;
      case 'brands':       return <BrandsPage />;
      case 'search':       return <SearchPage />;
      case 'detail':       return <ProductDetailPage />;
      case 'cart':         return <CartPage />;
      case 'auth':         return <AuthPage />;
      case 'wishlist':     return <WishlistPage />;
      case 'order-detail': return <OrderDetailPage />;
      case 'profile':      return isLoggedIn ? <ProfilePage /> : <AuthPage />;
      default:             return <NotFoundPage />;
    }
  };

  const showWrapper = !noPageWrapper.includes(currentPage);

  return (
    <>
      <div className={`page-progress${progressOn ? ' on' : ''}`} aria-hidden="true" />
      <Navbar />
      {showWrapper
        ? (
          <div className="page-wrapper">
            <div className="page-enter" key={currentPage}>
              {renderPage()}
            </div>
          </div>
        )
        : (
          <div className="page-enter" key={currentPage}>
            {renderPage()}
          </div>
        )
      }
      <ToastContainer />
    </>
  );
}