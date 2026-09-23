// src/App.jsx
import { lazy, Suspense, useEffect, useState } from 'react';
import { useApp } from './context/AppContext';
import { useCart } from './context/CartContext';

import Navbar from './components/Navbar';
import { ToastContainer } from './components/index.jsx';
import { LoadingScreen } from './components/LoadingScreen.jsx';

const HomePage           = lazy(() => import('./pages/HomePage'));
const ShopPage           = lazy(() => import('./pages/ShopPage'));
const SalePage           = lazy(() => import('./pages/SalePage'));
const NewArrivalsPage    = lazy(() => import('./pages/NewArrivalsPage'));
const BrandsPage         = lazy(() => import('./pages/BrandsPage'));
const ProductDetailPage  = lazy(() => import('./pages/ProductDetailPage'));
const CartPage           = lazy(() => import('./pages/CartPage'));
const AuthPage           = lazy(() => import('./pages/AuthPage'));
const ProfilePage        = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage'));
const SearchPage         = lazy(() => import('./pages/SearchPage'));
const WishlistPage       = lazy(() => import('./pages/WishlistPage'));
const OrderDetailPage    = lazy(() => import('./pages/OrderDetailPage'));
const SharedWishlistPage = lazy(() => import('./pages/SharedWishlistPage'));
const PaymentResultPage  = lazy(() => import('./pages/PaymentResultPage'));

export default function App() {
  const { currentPage, isLoggedIn, authReady, selectedProduct } = useApp();
  const { showToast } = useCart();
  const [loading, setLoading] = useState(true);

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

  /* Cập nhật tiêu đề trang động cho SEO và a11y */
  useEffect(() => {
    const titles = {
      home: 'LYRA — Thời trang & Giày dép thủ công',
      shop: 'Cửa hàng — LYRA',
      sale: 'Ưu đãi đặc quyền — LYRA',
      new: 'Bộ sưu tập mới về — LYRA',
      brands: 'Thương hiệu đối tác — LYRA',
      search: 'Tìm kiếm sản phẩm — LYRA',
      cart: 'Giỏ hàng của bạn — LYRA',
      checkout: 'Thanh toán đơn hàng — LYRA',
      'payment-result': 'Kết quả thanh toán — LYRA',
      auth: 'Đăng nhập & Đăng ký — LYRA',
      wishlist: 'Danh sách yêu thích — LYRA',
      'shared-wishlist': 'Danh sách yêu thích chia sẻ — LYRA',
      profile: 'Tài khoản của tôi — LYRA',
      'order-detail': 'Chi tiết đơn hàng — LYRA',
    };
    if (currentPage === 'detail' && selectedProduct?.name) {
      document.title = `${selectedProduct.name} — LYRA`;
    } else {
      document.title = titles[currentPage] || 'LYRA — Thời trang & Giày dép';
    }
  }, [currentPage, selectedProduct]);

  if (loading || !authReady) return <LoadingScreen />;

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
      case 'checkout':     return <CartPage initialView="checkout" />;
      case 'payment-result': return <PaymentResultPage />;
      case 'auth':         return <AuthPage />;
      case 'wishlist':     return <WishlistPage />;
      case 'shared-wishlist': return <SharedWishlistPage />;
      case 'order-detail': return <OrderDetailPage />;
      case 'profile':      return isLoggedIn ? <ProfilePage /> : <AuthPage />;
      default:             return <NotFoundPage />;
    }
  };

  const showWrapper = !noPageWrapper.includes(currentPage);

  return (
    <>
      <a className="skip-link" href="#main">Bỏ qua điều hướng</a>
      <Navbar />
      <main id="main" tabIndex={-1} className={showWrapper ? 'page-wrapper' : 'page-wrapper no-wrapper'}>
        <Suspense fallback={<div className="page-skeleton-loader" aria-hidden="true" style={{ minHeight: '60vh' }} />}>
          {renderPage()}
        </Suspense>
      </main>
      <ToastContainer />
    </>
  );
}
