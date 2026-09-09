// src/App.jsx — vỏ ứng dụng: bảng định tuyến + các phần mount một lần.
import { useEffect, useRef } from 'react';
import { useApp } from './context/AppContext';
import { useCart } from './context/CartContext';
import useReveal from './hooks/useReveal';

import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import BackToTop from './components/BackToTop';
import { ToastContainer } from './components/index.jsx';

import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import SalePage from './pages/SalePage';
import NewArrivalsPage from './pages/NewArrivalsPage';
import BrandsPage from './pages/BrandsPage';
import SearchPage from './pages/SearchPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import AuthPage from './pages/AuthPage';
import WishlistPage from './pages/WishlistPage';
import ProfilePage from './pages/ProfilePage';
import OrderDetailPage from './pages/OrderDetailPage';
import NotFoundPage from './pages/NotFoundPage';

const NO_NAVBAR = [];

export default function App() {
  const { currentPage, pathname, params, selectedProduct, selectedOrder, isLoggedIn, authLoading, navigate } = useApp();
  const { showToast } = useCart();

  // Một IntersectionObserver duy nhất cho toàn bộ [data-reveal].
  useReveal([pathname, currentPage]);

  /* Toast chào mừng: chỉ một lần mỗi phiên, có dọn timer */
  useEffect(() => {
    // Không dùng cờ useRef ở đây: trong StrictMode (dev) effect chạy hai lần,
    // lần đầu bị cleanup nên cờ sẽ chặn luôn lần thứ hai và toast không bao giờ
    // hiện. sessionStorage đã là chốt chặn "một lần mỗi phiên" rồi.
    let already = false;
    try {
      already = sessionStorage.getItem('lyra_welcomed') === '1';
    } catch { /* sessionStorage bị chặn → coi như chưa chào */ }
    if (already) return undefined;
    const t = setTimeout(() => {
      showToast?.('Chào mừng bạn đến với LYRA.', 'bi-bag-heart');
      try {
        sessionStorage.setItem('lyra_welcomed', '1');
      } catch { /* bỏ qua */ }
    }, 600);
    return () => clearTimeout(t);
  }, [showToast]);

  /* Trang cá nhân yêu cầu đăng nhập → chuyển sang trang đăng nhập kèm ?next= */
  useEffect(() => {
    if (currentPage === 'profile' && !authLoading && !isLoggedIn) {
      navigate('auth', { next: '/profile', replace: true });
    }
  }, [currentPage, isLoggedIn, authLoading, navigate]);

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage />;
      case 'shop': return <ShopPage />;
      case 'sale': return <SalePage />;
      case 'new': return <NewArrivalsPage />;
      case 'brands': return <BrandsPage />;
      case 'search': return <SearchPage />;
      // key theo slug: đổi sang sản phẩm khác thì trang được mount lại (không giữ size/qty cũ)
      case 'detail': return <ProductDetailPage key={selectedProduct?.slug ?? params?.product ?? 'none'} />;
      case 'cart': return <CartPage />;
      case 'checkout': return <CartPage />;
      case 'auth': return <AuthPage />;
      case 'wishlist': return <WishlistPage />;
      case 'order-detail': return <OrderDetailPage key={selectedOrder ?? 'none'} />;
      // Hiệu ứng chuyển hướng ở trên sẽ đưa khách sang trang đăng nhập.
      case 'profile': return isLoggedIn ? <ProfilePage /> : null;
      default: return <NotFoundPage />;
    }
  };

  const showNav = !NO_NAVBAR.includes(currentPage);
  const routeKey = pathname || currentPage;

  /* Điều hướng SPA không tự dời focus: người dùng bàn phím / trình đọc màn hình
     vẫn đứng ở link vừa bấm của trang cũ. Sau mỗi lần đổi trang, đưa focus về
     vùng nội dung chính (bỏ qua lần tải đầu để không cướp focus khỏi trang). */
  const mainRef = useRef(null);
  const firstRoute = useRef(true);
  useEffect(() => {
    if (firstRoute.current) { firstRoute.current = false; return; }
    mainRef.current?.focus?.();
  }, [routeKey]);

  return (
    <>
      <a className="skip-link" href="#main">Bỏ qua điều hướng</a>

      {showNav && <Navbar />}

      {/* page-wrapper luôn bù chiều cao navbar cho MỌI trang có navbar (kể cả auth) */}
      <main id="main" ref={mainRef} tabIndex={-1} className={showNav ? 'page-wrapper' : 'page-wrapper no-nav'}>
        <div className="page-enter" key={routeKey}>
          {renderPage()}
        </div>
      </main>

      {/* Mount một lần cho toàn app */}
      <CartDrawer />
      <BackToTop />
      <ToastContainer />
    </>
  );
}
