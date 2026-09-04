// src/components/CartDrawer.jsx — giỏ hàng trượt từ mép phải.
// Mount MỘT LẦN ở App; mở/đóng qua CartContext (cartOpen / openCart / closeCart).
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS, fmt, FREE_SHIPPING_THRESHOLD } from '../data/products';
import { buildUrl } from '../router.js';
import { Pic, useBodyScrollLock, useDialogA11y, isModifiedClick } from './index.jsx';
import '../styles/components.css';

// Gợi ý cố định cho giỏ rỗng — tính một lần ở module scope, KHÔNG mutate PRODUCTS.
const SUGGESTED = [...PRODUCTS].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 3);

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

  useBodyScrollLock(cartOpen);
  useDialogA11y(cartOpen, panelRef, closeCart, { initialFocus: closeBtnRef });

  if (!cartOpen || typeof document === 'undefined') return null;

  const threshold = FREE_SHIPPING_THRESHOLD || 500000;
  // `freeShipRemaining` đã tính cả trường hợp miễn phí nhờ mã FREESHIP, nên khi
  // đã miễn phí thì thanh phải đầy 100% — nếu vẫn vẽ theo tạm tính, khách sẽ
  // thấy thanh mới hơn nửa trong khi dòng chữ báo đã được miễn phí.
  const freeShipDone = freeShipRemaining <= 0;
  const progress = freeShipDone
    ? 100
    : Math.max(0, Math.min(100, Math.round((subtotal / threshold) * 100)));

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
            Giỏ hàng <span className="cart-drawer-count">({cartCount})</span>
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="modal-close"
            onClick={closeCart}
            aria-label="Đóng giỏ hàng"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        {/* Thanh tiến trình miễn phí vận chuyển */}
        {cart.length > 0 && (
          <div className={`freeship${freeShipDone ? ' done' : ''}`}>
            <p className="freeship-text">
              {freeShipDone ? (
                <>
                  <i className="bi bi-truck" aria-hidden="true" /> Đơn hàng của bạn được{' '}
                  <strong>miễn phí giao hàng</strong>
                </>
              ) : (
                <>
                  Mua thêm <strong>{fmt(freeShipRemaining)}</strong> để được{' '}
                  <strong>miễn phí giao hàng</strong>
                </>
              )}
            </p>
            <div
              className="freeship-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Tiến trình miễn phí giao hàng"
            >
              <span className="freeship-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="cart-drawer-body">
          {cart.length === 0 ? (
            /* ── Giỏ rỗng: gợi ý sản phẩm bán chạy ── */
            <div className="drawer-empty">
              <i className="bi bi-bag" aria-hidden="true" />
              <h3>Giỏ hàng đang trống</h3>
              <p>Hãy chọn cho mình một thiết kế yêu thích của mùa Thu – Đông 2026.</p>
              <button
                type="button"
                className="btn-lyra"
                onClick={() => {
                  closeCart();
                  navigate('shop');
                }}
              >
                Khám phá sản phẩm
              </button>

              <div className="cart-suggest">
                <div className="eyebrow">Gợi ý cho bạn</div>
                {SUGGESTED.map((p) => (
                  <a
                    key={p.id}
                    className="cart-suggest-row"
                    href={buildUrl('detail', { product: p.slug || p.id })}
                    onClick={openProduct(p.slug || p.id)}
                  >
                    <Pic
                      src={p.images?.[0]}
                      alt={p.name}
                      tint={p.color}
                      icon={p.icon}
                      ratio="3/4"
                      as="span"
                      className="cart-suggest-pic"
                    />
                    <span className="cart-suggest-info">
                      <span className="cart-suggest-name">{p.name}</span>
                      <span className="cart-suggest-price">{fmt(p.price)}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <ul className="drawer-list">
              {cart.map((item) => (
                <li key={item.key} className="drawer-item">
                  <a
                    className="drawer-item-img"
                    href={buildUrl('detail', { product: item.slug || item.productId })}
                    onClick={openProduct(item.slug || item.productId)}
                    aria-label={item.name}
                    tabIndex={-1}
                  >
                    <Pic src={item.image} alt={item.name} tint={item.tint} icon={item.icon} ratio="3/4" />
                  </a>

                  <div className="drawer-item-main">
                    <a
                      className="drawer-item-name"
                      href={buildUrl('detail', { product: item.slug || item.productId })}
                      onClick={openProduct(item.slug || item.productId)}
                    >
                      {item.name}
                    </a>
                    <div className="drawer-item-meta">
                      Size {item.size} · {item.variantColor}
                    </div>

                    <div className="drawer-item-row">
                      <div className="qty-ctrl">
                        <button
                          type="button"
                          onClick={() => updateQty(item.key, -1)}
                          /* Ở số lượng 1, updateQty không giảm được nữa nên nút
                             sẽ là nút chết. Vô hiệu hoá cho giống trang Giỏ hàng
                             (muốn bỏ hẳn thì dùng nút xoá bên cạnh). */
                          disabled={item.qty <= 1}
                          aria-label={`Giảm số lượng ${item.name}`}
                        >
                          <i className="bi bi-dash" aria-hidden="true" />
                        </button>
                        <span aria-label={`Số lượng: ${item.qty}`}>{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.key, 1)}
                          disabled={item.stock ? item.qty >= item.stock : false}
                          aria-label={`Tăng số lượng ${item.name}`}
                        >
                          <i className="bi bi-plus" aria-hidden="true" />
                        </button>
                      </div>
                      <span className="drawer-item-price">{fmt(item.price * item.qty)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="drawer-item-remove"
                    onClick={() => removeFromCart(item.key)}
                    aria-label={`Xoá ${item.name} khỏi giỏ hàng`}
                  >
                    <i className="bi bi-trash3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <footer className="cart-drawer-foot">
            <div className="drawer-subtotal">
              <span>Tạm tính</span>
              <strong>{fmt(subtotal)}</strong>
            </div>
            <p className="drawer-note">Phí vận chuyển và mã giảm giá được tính ở bước thanh toán.</p>
            <a className="btn-lyra" href={buildUrl('checkout')} onClick={goTo('checkout')}>
              Thanh toán
            </a>
            <a className="btn-outline-lyra" href={buildUrl('cart')} onClick={goTo('cart')}>
              Xem giỏ hàng
            </a>
          </footer>
        )}
      </aside>
    </>,
    document.body
  );
}
