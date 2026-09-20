// src/components/CartDrawer.jsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt, FREE_SHIPPING_THRESHOLD, normalizeProduct } from '../data/products';
import { productApi } from '../services/api';
import { buildUrl } from '../router.js';
import { useBodyScrollLock, useDialogA11y, isModifiedClick } from './index.jsx';
import '../styles/cart.css';

export default function CartDrawer() {
  const { navigate } = useApp();
  const {
    cart = [],
    cartCount = 0,
    subtotal = 0,
    freeShipRemaining = 0,
    cartOpen,
    closeCart,
    updateQty,
    removeFromCart,
  } = useCart();

  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);
  const [suggested, setSuggested] = useState([]);

  useBodyScrollLock(cartOpen);
  useDialogA11y(cartOpen, panelRef, closeCart, { initialFocus: closeBtnRef });

  useEffect(() => {
    if (!cartOpen || cart.length > 0) return;
    let cancelled = false;
    productApi.featured(3)
      .then(({ data }) => {
        if (!cancelled) setSuggested((data || []).map((product, index) => normalizeProduct(product, index)));
      })
      .catch(() => { if (!cancelled) setSuggested([]); });
    return () => { cancelled = true; };
  }, [cartOpen, cart.length]);

  if (!cartOpen || typeof document === 'undefined') return null;

  const threshold = FREE_SHIPPING_THRESHOLD || 500000;
  const freeShipDone = subtotal >= threshold;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = freeShipDone ? 100 : Math.min(100, Math.round((subtotal / threshold) * 100));

  const goTo = (page) => (e) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    closeCart();
    navigate(page);
  };

  const openProduct = (slugOrId) => (e) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    closeCart();
    navigate('detail', { product: slugOrId });
  };

  return createPortal(
    <>
      <div className="cart-drawer-scrim open" onClick={closeCart} aria-hidden="true" />

      <aside
        ref={panelRef}
        className="cart-drawer open"
        role="dialog"
        aria-modal="true"
        aria-label="Giỏ hàng"
        tabIndex={-1}
      >
        <header className="cart-drawer-head">
          <h2 className="cart-drawer-title">
            Giỏ Hàng <span className="cart-drawer-count">({cartCount})</span>
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="cart-drawer-close-btn"
            onClick={closeCart}
            aria-label="Đóng giỏ hàng"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        {/* Freeship Progress Bar */}
        <div className="drawer-freeship-bar">
          <div className="drawer-freeship-text">
            <i className="bi bi-truck" />
            {freeShipDone ? (
              <span>Đơn hàng của bạn đã đạt điều kiện <strong>Miễn Phí Giao Hàng</strong>!</span>
            ) : (
              <span>
                Mua thêm <strong>{fmt(remaining)}</strong> để được <strong>Miễn Phí Giao Hàng</strong>
              </span>
            )}
          </div>
          <div className="drawer-freeship-track">
            <div className="drawer-freeship-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Drawer Body */}
        <div className="cart-drawer-body">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <i className="bi bi-bag" style={{ fontSize: 44, color: 'var(--muted)', marginBottom: 16, display: 'block' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, marginBottom: 8 }}>Giỏ hàng đang trống</h3>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
                Khám phá ngay các thiết kế may đo mới nhất trong BST Xuân Hè 2026.
              </p>
              <button
                type="button"
                className="btn-hero-primary"
                onClick={() => {
                  closeCart();
                  navigate('shop');
                }}
              >
                Khám phá Cửa Hàng
              </button>
              {suggested.length > 0 && (
                <div style={{ marginTop: 32, textAlign: 'left' }}>
                  <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                    Gợi ý dành cho bạn
                  </div>
                  {suggested.map(product => (
                    <button key={product.id} type="button" onClick={openProduct(product.slug || product.id)}
                      style={{ width: '100%', display: 'flex', gap: 10, alignItems: 'center', border: 0,
                        borderTop: '1px solid var(--border)', background: 'transparent', padding: '10px 0', textAlign: 'left' }}>
                      {product.image ? <img src={product.image} alt="" style={{ width: 48, height: 56, objectFit: 'cover' }} /> : (
                        <span style={{ width: 48, height: 56, display: 'grid', placeItems: 'center', background: '#f2eee8' }}>
                          <i className={`bi ${product.icon}`} />
                        </span>
                      )}
                      <span style={{ flex: 1, fontSize: 12 }}>{product.name}</span>
                      <strong style={{ fontSize: 12 }}>{fmt(product.price)}</strong>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <ul className="drawer-items-list">
              {cart.map((item) => (
                <li key={item.key} className="drawer-item-card">
                  <div
                    className="drawer-item-thumb-box"
                    onClick={openProduct(item.slug || item.productId)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=200&auto=format&fit=crop'}
                      alt={item.name}
                      className="drawer-item-thumb"
                    />
                  </div>

                  <div className="drawer-item-info">
                    <a
                      className="drawer-item-title"
                      href={buildUrl('detail', { product: item.slug || item.productId })}
                      onClick={openProduct(item.slug || item.productId)}
                    >
                      {item.name}
                    </a>
                    <div className="drawer-item-meta">
                      Size: {item.size || 'F'} {item.colorName || item.variantColor ? `· Màu: ${item.colorName || item.variantColor}` : ''}
                    </div>

                    <div className="drawer-item-bottom">
                      <div className="pdp-qty-stepper" style={{ height: 32 }}>
                        <button
                          type="button"
                          className="pdp-qty-btn"
                          style={{ width: 28, fontSize: 13 }}
                          onClick={() => updateQty(item.key, -1)}
                          disabled={item.qty <= 1}
                        >
                          −
                        </button>
                        <span className="pdp-qty-val" style={{ width: 28, fontSize: 12 }}>{item.qty}</span>
                        <button
                          type="button"
                          className="pdp-qty-btn"
                          style={{ width: 28, fontSize: 13 }}
                          onClick={() => updateQty(item.key, 1)}
                        >
                          +
                        </button>
                      </div>

                      <span className="drawer-item-price">{fmt(item.price * item.qty)}</span>

                      <button
                        type="button"
                        className="drawer-item-del-btn"
                        onClick={() => removeFromCart(item.key)}
                        title="Xóa sản phẩm"
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Drawer Footer */}
        {cart.length > 0 && (
          <footer className="cart-drawer-foot">
            <div className="drawer-subtotal-row">
              <span style={{ fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Tạm tính:
              </span>
              <span className="drawer-subtotal-val">{fmt(subtotal)}</span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: 0 }}>
              Thuế và phí vận chuyển sẽ được tính tại bước hoàn tất đơn.
            </p>
            <button
              className="btn-hero-primary w-100 justify-content-center"
              style={{ height: 46 }}
              onClick={goTo('checkout')}
            >
              Tiến hành thanh toán <i className="bi bi-arrow-right" />
            </button>
            <button
              className="btn-hero-secondary w-100 justify-content-center"
              style={{ height: 40, fontSize: 11.5 }}
              onClick={goTo('cart')}
            >
              Xem chi tiết giỏ hàng
            </button>
          </footer>
        )}
      </aside>
    </>,
    document.body
  );
}
