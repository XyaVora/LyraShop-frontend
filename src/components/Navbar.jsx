// src/components/Navbar.jsx
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import SearchModal from './SearchModal';
import { brandApi, loyaltyApi } from '../services/api';
import '../styles/navigation.css';

export default function Navbar() {
  const { currentPage, navigate, isLoggedIn, user, logout } = useApp();
  const { cartCount, wishlist } = useCart();
  const [scrolled, setScrolled]               = useState(false);
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [prevCount, setPrevCount]             = useState(0);
  const [badgeBounce, setBadgeBounce]         = useState(false);
  const [searchOpen, setSearchOpen]           = useState(false);
  const [megaMenuOpen, setMegaMenuOpen]       = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showTopBar, setShowTopBar]           = useState(true);
  const [memberTier, setMemberTier]           = useState('MEMBER');
  const [brand, setBrand]                     = useState(null);

  const userDropdownRef = useRef(null);
  const megaMenuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    brandApi.get().then(({ data }) => setBrand(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setMemberTier('MEMBER');
      return;
    }
    loyaltyApi.get().then(({ data }) => setMemberTier(data?.tier || 'MEMBER')).catch(() => {});
  }, [isLoggedIn]);

  useEffect(() => {
    if (cartCount > prevCount) {
      setBadgeBounce(true);
      setTimeout(() => setBadgeBounce(false), 500);
    }
    setPrevCount(cartCount);
  }, [cartCount, prevCount]);

  // Ctrl+K / Cmd+K open search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Click outside to close user dropdown & mega menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target)) {
        setMegaMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const go = (page, extra = {}) => {
    navigate(page, extra);
    setDrawerOpen(false);
    setMegaMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logout();
  };

  return (
    <>
      <div className="lyra-navbar-wrapper">
        {/* Top Announcement Bar */}
        {showTopBar && (
          <div className="top-announcement-bar">
            <div className="top-announcement-text">
              <span>Miễn phí giao hàng cho đơn từ 500.000₫</span>
              <span className="top-announcement-bullet">●</span>
              <span>Hỗ trợ đổi trả trong 30 ngày</span>
              <span className="top-announcement-bullet">●</span>
              <span>Hotline CSKH: {brand?.hotline || 'Đang cập nhật'}</span>
            </div>
            <button
              className="top-announcement-close"
              onClick={() => setShowTopBar(false)}
              aria-label="Đóng thông báo"
              title="Đóng"
            >
              <i className="bi bi-x" />
            </button>
          </div>
        )}

        {/* Main Navigation Bar */}
        <nav className={`lyra-navbar${scrolled ? ' scrolled' : ''}`}>
          {/* Brand Logo */}
          <div className="navbar-brand-group" onClick={() => go('home')}>
            <span className="navbar-brand-logo">LYRA</span>
            <span className="navbar-brand-sub">ATELIER</span>
          </div>

          {/* Desktop Nav Links */}
          <ul className="navbar-nav-links">
            <li className="navbar-nav-item">
              <a
                className={currentPage === 'home' ? 'active' : ''}
                onClick={() => go('home')}
              >
                Trang Chủ
              </a>
            </li>

            {/* Shop with Lookbook Mega Menu */}
            <li
              className="navbar-nav-item"
              ref={megaMenuRef}
              onMouseEnter={() => setMegaMenuOpen(true)}
              onMouseLeave={() => setMegaMenuOpen(false)}
            >
              <a
                className={currentPage === 'shop' ? 'active' : ''}
                onClick={() => go('shop')}
              >
                Cửa Hàng <i className="bi bi-chevron-down navbar-caret-icon" />
              </a>

              {/* Elegant Dropdown Menu */}
              <div className={`nav-shop-dropdown ${megaMenuOpen ? 'open' : ''}`}>
                <div className="nav-shop-dropdown-inner">
                  <div className="nav-shop-title">Tuyển Tập Thiết Kế</div>
                  <ul className="nav-shop-list">
                    <li className="nav-shop-item">
                      <a onClick={() => go('shop')}>
                        <span>Tất Cả Thiết Kế</span>
                        <i className="bi bi-arrow-right nav-shop-arrow" />
                      </a>
                    </li>
                    <li className="nav-shop-item">
                      <a onClick={() => go('shop', { query: 'đầm' })}>
                        <span>Đầm & Váy Dạ Hội</span>
                        <span className="nav-shop-tag">Hot</span>
                      </a>
                    </li>
                    <li className="nav-shop-item">
                      <a onClick={() => go('shop', { query: 'sơ mi' })}>
                        <span>Áo Sơ Mi & Lụa Tơ Tằm</span>
                      </a>
                    </li>
                    <li className="nav-shop-item">
                      <a onClick={() => go('shop', { query: 'blazer' })}>
                        <span>Áo Khoác Blazer May Đo</span>
                      </a>
                    </li>
                    <li className="nav-shop-item">
                      <a onClick={() => go('shop', { query: 'quần' })}>
                        <span>Quần Âu & Chân Váy</span>
                      </a>
                    </li>
                    <li className="nav-shop-item">
                      <a onClick={() => go('shop', { query: 'phụ kiện' })}>
                        <span>Túi Xách & Phụ Kiện</span>
                      </a>
                    </li>
                  </ul>

                  <div className="nav-shop-divider" />

                  <a className="nav-shop-footer-link" onClick={() => go('shop', { query: 'autumn' })}>
                    <i className="bi bi-stars" />
                    <span>Bộ Sưu Tập Mùa Thu '26</span>
                    <i className="bi bi-chevron-right" style={{ fontSize: 10, marginLeft: 'auto' }} />
                  </a>
                </div>
              </div>
            </li>

            <li className="navbar-nav-item">
              <a
                className={currentPage === 'sale' ? 'active' : ''}
                onClick={() => go('sale')}
              >
                Ưu Đãi
              </a>
            </li>

            <li className="navbar-nav-item">
              <a
                className={currentPage === 'new' ? 'active' : ''}
                onClick={() => go('new')}
              >
                Mới Về
              </a>
            </li>

            <li className="navbar-nav-item">
              <a
                className={currentPage === 'brands' ? 'active' : ''}
                onClick={() => go('brands')}
              >
                Thương Hiệu
              </a>
            </li>
          </ul>

          {/* Action Icons */}
          <div className="navbar-actions">
            {/* Search Trigger */}
            <button
              className="nav-action-btn"
              onClick={() => setSearchOpen(true)}
              title="Tìm kiếm sản phẩm (Ctrl+K)"
            >
              <i className="bi bi-search" />
            </button>

            {/* Wishlist */}
            <button
              className="nav-action-btn"
              onClick={() => go('wishlist')}
              title="Danh sách yêu thích"
              style={{ position: 'relative' }}
            >
              <i className="bi bi-heart" />
              {wishlist.length > 0 && (
                <span className="cart-badge-dot" style={{ background: 'var(--danger)' }}>
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart */}
            <button
              className="nav-action-btn"
              onClick={() => go('cart')}
              title="Giỏ hàng"
              style={{ position: 'relative' }}
            >
              <i className="bi bi-bag" />
              {cartCount > 0 && (
                <span className={`cart-badge-dot${badgeBounce ? ' bounce' : ''}`}>
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Account / Dropdown */}
            {isLoggedIn ? (
              <div className="user-dropdown-wrapper" ref={userDropdownRef}>
                <button
                  className="nav-action-btn"
                  onClick={() => setUserDropdownOpen(v => !v)}
                  title={user?.name || 'Tài khoản'}
                >
                  <i className="bi bi-person-check" />
                </button>

                {userDropdownOpen && (
                  <div className="user-dropdown-menu">
                    <div className="user-dropdown-header">
                      <div className="user-dropdown-name">{user?.name || 'Quý khách'}</div>
                      <div className="user-dropdown-email">{user?.email || 'Thành viên Lyra Club'}</div>
                      <div className="user-dropdown-tier-badge">
                        <i className="bi bi-gem" /> Hạng {memberTier}
                      </div>
                    </div>

                    <ul className="user-dropdown-links">
                      <li
                        className="user-dropdown-link-item"
                        onClick={() => go('profile', { profileTab: 'orders' })}
                      >
                        <i className="bi bi-box-seam" /> Đơn hàng của tôi
                      </li>
                      <li
                        className="user-dropdown-link-item"
                        onClick={() => go('profile', { profileTab: 'vouchers' })}
                      >
                        <i className="bi bi-ticket-perforated" /> Ví voucher ưu đãi
                      </li>
                      <li
                        className="user-dropdown-link-item"
                        onClick={() => go('wishlist')}
                      >
                        <i className="bi bi-heart" /> Danh sách yêu thích
                      </li>
                      <li
                        className="user-dropdown-link-item"
                        onClick={() => go('profile', { profileTab: 'account' })}
                      >
                        <i className="bi bi-person-gear" /> Thông tin tài khoản
                      </li>
                      <div className="user-dropdown-divider" />
                      <li
                        className="user-dropdown-link-item user-dropdown-logout"
                        onClick={handleLogout}
                      >
                        <i className="bi bi-box-arrow-right" /> Đăng xuất
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="nav-action-btn"
                onClick={() => go('auth')}
                title="Đăng nhập / Đăng ký"
              >
                <i className="bi bi-person" />
              </button>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            className="hamburger"
            onClick={() => setDrawerOpen(v => !v)}
            aria-label="Menu"
          >
            <span style={drawerOpen ? { transform: 'rotate(45deg) translate(4px, 4px)' } : {}} />
            <span style={drawerOpen ? { opacity: 0 } : {}} />
            <span style={drawerOpen ? { transform: 'rotate(-45deg) translate(4px, -4px)' } : {}} />
          </button>
        </nav>
      </div>

      {/* Mobile Navigation Drawer */}
      <div className={`mobile-drawer${drawerOpen ? ' open' : ''}`}>
        <button
          onClick={() => { setSearchOpen(true); setDrawerOpen(false); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            padding: '12px 16px',
            marginBottom: 24,
            cursor: 'pointer',
            width: '100%',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            color: 'var(--muted)',
          }}
        >
          <i className="bi bi-search text-secondary" /> Tìm kiếm sản phẩm... (Ctrl+K)
        </button>

        <a className="mobile-nav-link" onClick={() => go('home')}>Trang Chủ</a>
        <a className="mobile-nav-link" onClick={() => go('shop')}>Cửa Hàng (Tất Cả Sản Phẩm)</a>
        <a className="mobile-nav-link" onClick={() => go('sale')}>Ưu Đãi Đặc Biệt</a>
        <a className="mobile-nav-link" onClick={() => go('new')}>Sản Phẩm Mới Về</a>
        <a className="mobile-nav-link" onClick={() => go('brands')}>Thương Hiệu & Xưởng May</a>
        
        <div style={{ margin: '20px 0', borderTop: '1px solid var(--border)' }} />

        <a className="mobile-nav-link" onClick={() => go('wishlist')} style={{ fontSize: 16 }}>
          <i className="bi bi-heart me-2 text-danger" /> Danh Sách Yêu Thích ({wishlist.length})
        </a>
        <a
          className="mobile-nav-link"
          onClick={() => go(isLoggedIn ? 'profile' : 'auth')}
          style={{ fontSize: 16, color: 'var(--warm)', fontWeight: 500 }}
        >
          <i className="bi bi-person me-2" />
          {isLoggedIn ? `Tài khoản: ${user?.name}` : 'Đăng nhập / Đăng ký'}
        </a>
      </div>

      {/* Spotlight Search Modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
