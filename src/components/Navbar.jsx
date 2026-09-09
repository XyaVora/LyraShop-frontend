// src/components/Navbar.jsx — thanh điều hướng chính (cố định trên đầu trang).
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { buildUrl } from '../router.js';
import { useScrollDirection } from '../hooks/useScrollDirection';
import { useBodyScrollLock, useDialogA11y, isModifiedClick } from './index.jsx';
import SearchModal from './SearchModal';
import '../styles/components.css';

const NAV_LINKS = [
  { label: 'Trang chủ', page: 'home' },
  { label: 'Shop', page: 'shop' },
  { label: 'Sale', page: 'sale' },
  { label: 'Mới về', page: 'new' },
  { label: 'Thương hiệu', page: 'brands' },
];

export default function Navbar() {
  const { currentPage, navigate, isLoggedIn, user } = useApp();
  const { cartCount = 0, wishlist = [], openCart } = useCart();
  const { compact, hidden } = useScrollDirection();

  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [badgeBounce, setBadgeBounce] = useState(false);

  const prevCount = useRef(cartCount);   // seed = số hiện tại → không nhảy khi tải lại trang
  const searchBtnRef = useRef(null);
  const drawerRef = useRef(null);

  const links = NAV_LINKS;

  /* Đổ bóng khi cuộn */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Hiệu ứng nảy của badge giỏ — chỉ khi số lượng THỰC SỰ tăng, có dọn timer */
  useEffect(() => {
    if (cartCount > prevCount.current) {
      setBadgeBounce(true);
      prevCount.current = cartCount;
      const t = setTimeout(() => setBadgeBounce(false), 500);
      return () => clearTimeout(t);
    }
    prevCount.current = cartCount;
    return undefined;
  }, [cartCount]);

  /* Ctrl/Cmd + K mở tìm kiếm (không phụ thuộc Caps Lock) */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && typeof e.key === 'string' && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* Điều hướng → luôn đóng drawer mobile */
  const go = useCallback(
    (e, page, params) => {
      if (e && isModifiedClick(e)) return;
      e?.preventDefault();
      setDrawerOpen(false);
      navigate(page, params || {});
    },
    [navigate]
  );

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    // Trả focus về nút đã mở hộp tìm kiếm.
    requestAnimationFrame(() => searchBtnRef.current?.focus());
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  /* Back/Forward của trình duyệt phải đóng menu mobile và hộp tìm kiếm.
     AppContext phát sự kiện 'lyra:navigated' khi popstate xảy ra; nếu không
     nghe, lớp phủ sẽ nằm lại trên trang mới và cuộn trang bị khoá. */
  useEffect(() => {
    const onNavigated = () => { setDrawerOpen(false); setSearchOpen(false); };
    window.addEventListener('lyra:navigated', onNavigated);
    return () => window.removeEventListener('lyra:navigated', onNavigated);
  }, []);

  useBodyScrollLock(drawerOpen);
  useDialogA11y(drawerOpen, drawerRef, closeDrawer);

  return (
    <>
      <nav className={`lyra-navbar${scrolled || compact ? ' scrolled' : ''}${compact ? ' compact' : ''}${hidden && !drawerOpen ? ' nav-hidden' : ''}`} aria-label="Điều hướng chính">
        <a
          className="navbar-logo"
          href={buildUrl('home')}
          onClick={(e) => go(e, 'home')}
          aria-label="LYRA — về trang chủ"
        >
          LYRA
        </a>

        <ul className="navbar-nav-links">
          {links.map(({ label, page }) => (
            <li key={page}>
              <a
                href={buildUrl(page)}
                className={currentPage === page ? 'active' : ''}
                aria-current={currentPage === page ? 'page' : undefined}
                onClick={(e) => go(e, page)}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="navbar-actions">
          <button
            ref={searchBtnRef}
            type="button"
            className="nav-action-btn"
            onClick={() => setSearchOpen(true)}
            aria-label="Tìm kiếm sản phẩm (Ctrl + K)"
          >
            <i className="bi bi-search" aria-hidden="true" />
          </button>

          <a
            className="nav-action-btn"
            href={buildUrl('wishlist')}
            onClick={(e) => go(e, 'wishlist')}
            aria-label={`Sản phẩm yêu thích, ${wishlist.length} sản phẩm`}
          >
            <i className="bi bi-heart" aria-hidden="true" />
            {wishlist.length > 0 && (
              <span className="cart-badge-dot wish-dot" aria-hidden="true">
                {wishlist.length}
              </span>
            )}
          </a>

          {/* Nút giỏ hàng MỞ DRAWER, không điều hướng */}
          <button
            type="button"
            className="nav-action-btn"
            onClick={() => { setDrawerOpen(false); openCart?.(); }}
            aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}
          >
            <i className="bi bi-bag" aria-hidden="true" />
            {cartCount > 0 && (
              <span className={`cart-badge-dot${badgeBounce ? ' bounce' : ''}`} aria-hidden="true">
                {cartCount}
              </span>
            )}
          </button>

          <a
            className="nav-action-btn"
            href={buildUrl(isLoggedIn ? 'profile' : 'auth')}
            onClick={(e) => go(e, isLoggedIn ? 'profile' : 'auth')}
            aria-label={isLoggedIn ? `Tài khoản của ${user?.name || 'bạn'}` : 'Đăng nhập'}
          >
            <i className={`bi ${isLoggedIn ? 'bi-person-check' : 'bi-person'}`} aria-hidden="true" />
          </a>
        </div>

        <button
          type="button"
          className={`hamburger${drawerOpen ? ' open' : ''}`}
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label={drawerOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={drawerOpen}
          /* Chỉ khai báo aria-controls khi phần tử đích thực sự tồn tại. */
          aria-controls={drawerOpen ? 'mobile-drawer' : undefined}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* ── Drawer mobile: chỉ render khi mở → không còn nút "ma" trong tab order ── */}
      {drawerOpen && (
        <>
          <div className="mobile-drawer-scrim" onClick={closeDrawer} aria-hidden="true" />
          <div
            id="mobile-drawer"
            ref={drawerRef}
            className="mobile-drawer open"
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
            tabIndex={-1}
          >
            <button
              type="button"
              className="mobile-search-btn"
              onClick={() => { setDrawerOpen(false); setSearchOpen(true); }}
            >
              <i className="bi bi-search" aria-hidden="true" /> Tìm kiếm sản phẩm...
            </button>

            {links.map(({ label, page }) => (
              <a
                key={page}
                className={`mobile-nav-link${currentPage === page ? ' active' : ''}`}
                href={buildUrl(page)}
                aria-current={currentPage === page ? 'page' : undefined}
                onClick={(e) => go(e, page)}
              >
                {label}
              </a>
            ))}

            <a
              className="mobile-nav-link mobile-nav-link--sub"
              href={buildUrl(isLoggedIn ? 'profile' : 'auth')}
              onClick={(e) => go(e, isLoggedIn ? 'profile' : 'auth')}
            >
              {isLoggedIn ? 'Tài khoản của tôi' : 'Đăng nhập / Đăng ký'}
            </a>
            <a
              className="mobile-nav-link mobile-nav-link--sub"
              href={buildUrl('wishlist')}
              onClick={(e) => go(e, 'wishlist')}
            >
              Yêu thích ({wishlist.length})
            </a>
          </div>
        </>
      )}

      <SearchModal open={searchOpen} onClose={closeSearch} />
    </>
  );
}
