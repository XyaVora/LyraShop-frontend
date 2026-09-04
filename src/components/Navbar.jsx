// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import SearchModal from './SearchModal';

export default function Navbar() {
  const { currentPage, navigate, isLoggedIn, user } = useApp();
  const { cartCount, wishlist } = useCart();
  const [scrolled, setScrolled]       = useState(false);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [prevCount, setPrevCount]     = useState(0);
  const [badgeBounce, setBadgeBounce] = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (cartCount > prevCount) {
      setBadgeBounce(true);
      setTimeout(() => setBadgeBounce(false), 500);
    }
    setPrevCount(cartCount);
  }, [cartCount]);

  // Ctrl+K / Cmd+K mở search
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

  const navLinks = [
    { label: 'Trang chủ',    page: 'home'   },
    { label: 'Shop',         page: 'shop'   },
    { label: 'Sale',         page: 'sale'   },
    { label: 'Mới về',      page: 'new'    },
    { label: 'Thương hiệu', page: 'brands' },
  ];

  const go = (page) => { navigate(page); setDrawerOpen(false); };

  return (
    <>
      <nav className={`lyra-navbar${scrolled ? ' scrolled' : ''}`}>
        <span className="navbar-logo" onClick={() => go('home')}>LYRA</span>

        <ul className="navbar-nav-links">
          {navLinks.map(({ label, page }) => (
            <li key={label}>
              <a
                className={currentPage === page ? 'active' : ''}
                onClick={() => go(page)}
                style={{ cursor: 'pointer' }}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="navbar-actions">
          <button className="nav-action-btn" onClick={() => setSearchOpen(true)} title="Tìm kiếm (Ctrl+K)">
            <i className="bi bi-search" />
          </button>
          <button className="nav-action-btn" onClick={() => go('wishlist')} title="Yêu thích" style={{ position: 'relative' }}>
            <i className="bi bi-heart" />
            {wishlist.length > 0 && (
              <span className="cart-badge-dot" style={{ background: 'var(--danger)' }}>{wishlist.length}</span>
            )}
          </button>
          <button className="nav-action-btn" onClick={() => go('cart')} title="Giỏ hàng">
            <i className="bi bi-bag" />
            {cartCount > 0 && (
              <span className={`cart-badge-dot${badgeBounce ? ' bounce' : ''}`}>{cartCount}</span>
            )}
          </button>
          {isLoggedIn ? (
            <button className="nav-action-btn" onClick={() => go('profile')} title={user?.name}>
              <i className="bi bi-person-check" />
            </button>
          ) : (
            <button className="nav-action-btn" onClick={() => go('auth')} title="Đăng nhập">
              <i className="bi bi-person" />
            </button>
          )}
        </div>

        <button className="hamburger" onClick={() => setDrawerOpen(v => !v)} aria-label="Menu">
          <span style={drawerOpen ? { transform: 'rotate(45deg) translate(4px, 4px)' } : {}} />
          <span style={drawerOpen ? { opacity: 0 } : {}} />
          <span style={drawerOpen ? { transform: 'rotate(-45deg) translate(4px, -4px)' } : {}} />
        </button>
      </nav>

      {/* Mobile Drawer */}
      <div className={`mobile-drawer${drawerOpen ? ' open' : ''}`}>
        <button
          onClick={() => { setSearchOpen(true); setDrawerOpen(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 24, cursor: 'pointer', width: '100%', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--muted)' }}
        >
          <i className="bi bi-search" /> Tìm kiếm sản phẩm...
        </button>
        {navLinks.map(({ label, page }) => (
          <a key={label} className="mobile-nav-link" onClick={() => go(page)}>{label}</a>
        ))}
        <a className="mobile-nav-link" onClick={() => go(isLoggedIn ? 'profile' : 'auth')} style={{ marginTop: 16, fontSize: 20, color: 'var(--muted)' }}>
          {isLoggedIn ? 'Tài khoản của tôi' : 'Đăng nhập / Đăng ký'}
        </a>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}