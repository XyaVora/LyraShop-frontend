// src/components/index.jsx  — shared UI components

import { useState, useEffect, useRef } from 'react';
import { brandApi, newsletterApi, extractErrorMessage } from '../services/api';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt } from '../data/products';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;
    if (lockCount === 0) {
      const sbw = window.innerWidth - document.documentElement.clientWidth;
      savedOverflow = document.body.style.overflow;
      savedPaddingRight = document.body.style.paddingRight;
      document.body.style.overflow = 'hidden';
      if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;
    }
    lockCount += 1;
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow;
        document.body.style.paddingRight = savedPaddingRight;
      }
    };
  }, [active]);
}

export function useDialogA11y(open, panelRef, onClose, opts = {}) {
  const { initialFocus } = opts;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const previouslyFocused = document.activeElement;

    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const target =
        (initialFocus && initialFocus.current) ||
        (panel && panel.querySelector(FOCUSABLE)) ||
        panel;
      if (target && typeof target.focus === 'function') target.focus();
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!panelRef.current.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [open, panelRef, initialFocus]);
}

/* ─── Stars ─────────────────────────────────── */
export function Stars({ rating, size = 12, showScore = false }) {
  const num = typeof rating === 'number' && !isNaN(rating) ? rating : 0;
  return (
    <div className="product-stars" title={`${num.toFixed(1)} / 5`}>
      <span className="stars-icons">
        {[1, 2, 3, 4, 5].map(i => {
          const diff = num - (i - 1);
          let starClass = 'bi-star';
          if (diff >= 0.75) {
            starClass = 'bi-star-fill';
          } else if (diff >= 0.25) {
            starClass = 'bi-star-half';
          }
          return (
            <i
              key={i}
              className={`bi ${starClass} star-icon${diff < 0.25 ? ' empty' : ''}`}
              style={{ fontSize: size }}
            />
          );
        })}
      </span>
      {showScore && num > 0 && (
        <span className="stars-score-val" style={{ fontSize: size }}>
          {num.toFixed(1)}
        </span>
      )}
    </div>
  );
}

/* ─── ProductCard ────────────────────────────── */
export function ProductCard({ product, delay = 0, onQuickView }) {
  const { navigate } = useApp();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const wished = isWishlisted(product.id);

  return (
    <div
      className={`product-card fade-up fade-up-${(delay % 4) + 1}`}
      onClick={() => navigate('detail', { product })}
    >
      <div className="product-card-img">
        <ProductVisual product={product} />
        {product.badge && (
          <div className={`product-badge ${product.badge.toLowerCase()}`}>{product.badge}</div>
        )}
        <div className="product-card-actions">
          {onQuickView && (
            <button
              className="product-action-btn quick-view-btn"
              onClick={e => { e.stopPropagation(); onQuickView(product); }}
              title="Xem nhanh"
            >
              <i className="bi bi-eye" />
            </button>
          )}
          <button
            className="product-action-btn"
            onClick={e => { e.stopPropagation(); addToCart(product); }}
          >
            + Giỏ
          </button>
          <button
            className="product-action-btn wish-btn"
            onClick={e => { e.stopPropagation(); toggleWishlist(product); }}
            title={wished ? 'Bỏ yêu thích' : 'Yêu thích'}
          >
            <i className={`bi bi-heart${wished ? '-fill' : ''}`} style={{ color: wished ? '#C8A97E' : 'inherit' }} />
          </button>
        </div>
      </div>
      <Stars rating={product.rating} />
      <div className="product-name">{product.name}</div>
      <div className="product-brand">{product.brand}{product.cat ? ` · ${product.cat}` : ''}</div>
      <div className="product-price-row">
        <span className="product-price">{fmt(product.price)}</span>
        {product.oldPrice && <span className="product-price-old">{fmt(product.oldPrice)}</span>}
      </div>
    </div>
  );
}

function ProductVisual({ product }) {
  const [failed, setFailed] = useState(false);
  if (product.image && !failed) {
    return (
      <img
        className="product-card-photo"
        src={product.image}
        alt={product.name}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="product-img-inner" style={{ background: product.color }}>
      <i className={`bi ${product.icon}`} />
      <span>Lyra</span>
    </div>
  );
}

/* ─── Marquee ────────────────────────────────── */
export function Marquee() {
  const items = [
    'Miễn phí giao hàng trên 500K',
    'Hàng chính hãng 100%',
    'Đổi trả 30 ngày',
    'Thanh toán an toàn',
    'Giao hàng toàn quốc',
    'Chăm sóc khách hàng 24/7',
  ];
  const doubled = [...items, ...items];
  return (
    <div className="marquee-bar">
      <div className="marquee-track">
        {[0,1].map(rep => (
          <div key={rep} className="marquee-content">
            {doubled.map((item, i) => (
              <span key={i} className="marquee-item">
                {item} <span className="marquee-dot">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Newsletter ─────────────────────────────── */
export function Newsletter({ showToast }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const subscribe = async () => { if (!email.includes('@')) return showToast('Vui lòng nhập email hợp lệ', 'bi-exclamation-circle'); setSubmitting(true); try { await newsletterApi.subscribe(email.trim()); setEmail(''); showToast('Đăng ký nhận bản tin thành công!', 'bi-envelope-check'); } catch(e){showToast(extractErrorMessage(e,'Không thể đăng ký nhận bản tin'),'bi-x-circle');} finally{setSubmitting(false);} };
  const unsubscribe = async () => { if (!email.includes('@')) return showToast('Vui lòng nhập email hợp lệ', 'bi-exclamation-circle'); setSubmitting(true); try { await newsletterApi.unsubscribe(email.trim()); setEmail(''); showToast('Đã hủy đăng ký nhận bản tin.', 'bi-envelope-x'); } catch(e){showToast(extractErrorMessage(e,'Không thể hủy đăng ký'),'bi-x-circle');} finally{setSubmitting(false);} };
  return (
    <section className="newsletter-section">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-lg-5 mb-4 mb-lg-0">
            <h2 className="newsletter-title">Nhận ưu đãi<br /><em>độc quyền</em></h2>
            <p className="newsletter-sub">Đăng ký nhận thông tin về bộ sưu tập mới, khuyến mãi và xu hướng thời trang hàng tuần từ LYRA.</p>
          </div>
          <div className="col-lg-6 offset-lg-1">
            <div className="newsletter-form">
              <input className="newsletter-input" type="email" placeholder="Nhập địa chỉ email của bạn..." value={email} onChange={e=>setEmail(e.target.value)} />
              <button className="newsletter-btn" onClick={subscribe} disabled={submitting}>
                Đăng ký
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: 'rgba(247,244,239,.3)', marginTop: 10 }}>
              Không spam. <button type="button" onClick={unsubscribe} disabled={submitting} style={{ border: 0, padding: 0, background: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>Hủy đăng ký</button> bằng email đã nhập.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────── */
export function Footer({ navigate }) {
  const [brand, setBrand] = useState(null);
  useEffect(() => {
    brandApi.get().then(({ data }) => setBrand(data)).catch(() => {});
  }, []);
  const groups = [
    { heading: 'Sản phẩm', links: [
      { label: 'Tất cả sản phẩm', page: 'shop' },
      { label: 'Sản phẩm mới', page: 'new' },
      { label: 'Ưu đãi', page: 'sale' },
      { label: 'Yêu thích', page: 'wishlist' },
    ] },
    { heading: 'Tài khoản', links: [
      { label: 'Đơn hàng của tôi', page: 'profile', params: { profileTab: 'orders' } },
      { label: 'Sổ địa chỉ', page: 'profile', params: { profileTab: 'address' } },
      { label: 'Hạng hội viên', page: 'profile', params: { profileTab: 'membership' } },
    ] },
    { heading: 'Về LYRA', links: [
      { label: 'Câu chuyện thương hiệu', page: 'brands' },
      { label: 'Bộ sưu tập mới', page: 'new' },
    ] },
  ];
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="row">
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="footer-logo">{brand?.name || 'LYRA'}</div>
            <p className="footer-desc">{brand?.story || 'Thương hiệu thời trang cao cấp Việt Nam.'}</p>
            {brand?.hotline && <p className="footer-desc">Hotline: {brand.hotline}<br />Email: {brand.email}</p>}
          </div>
          {groups.map(({ heading, links }) => (
            <div key={heading} className="col-lg-2 col-md-4 col-6 mb-4 offset-lg-1">
              <div className="footer-heading">{heading}</div>
              <ul className="footer-list">
                {links.map(link => (
                  <li key={link.label}><a onClick={() => navigate(link.page, link.params)}>{link.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <hr className="footer-divider" />
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="footer-copy">© {new Date().getFullYear()} {brand?.name || 'LYRA'}. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Toast Container ────────────────────────── */
export function ToastContainer() {
  const { toasts } = useCart();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <ToastItem key={t.id} msg={t.msg} icon={t.icon} />
      ))}
    </div>
  );
}

function ToastItem({ msg, icon }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setTimeout(() => setVisible(true), 10);
  }, []);
  return (
    <div className={`toast-notify${visible ? ' visible' : ''}`}>
      <i className={`bi ${icon}`} />
      <span>{msg}</span>
    </div>
  );
}
