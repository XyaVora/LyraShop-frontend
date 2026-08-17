// src/components/index.jsx  — shared UI components

import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt } from '../data/products';

/* ─── Stars ─────────────────────────────────── */
export function Stars({ rating, size = 10 }) {
  return (
    <div className="product-stars">
      {[1,2,3,4,5].map(i => (
        <i key={i} className={`bi bi-star${i <= Math.round(rating) ? '-fill' : ''} star-icon${i > Math.round(rating) ? ' empty' : ''}`} style={{ fontSize: size }} />
      ))}
    </div>
  );
}

/* ─── ProductCard ────────────────────────────── */
export function ProductCard({ product, delay = 0 }) {
  const { navigate } = useApp();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const wished = isWishlisted(product.id);

  return (
    <div
      className={`product-card fade-up fade-up-${(delay % 4) + 1}`}
      onClick={() => navigate('detail', { product })}
    >
      <div className="product-card-img">
        <div className="product-img-inner" style={{ background: product.color }}>
          <i className={`bi ${product.icon}`} />
          <span>Lyra</span>
        </div>
        {product.badge && (
          <div className={`product-badge ${product.badge.toLowerCase()}`}>{product.badge}</div>
        )}
        <div className="product-card-actions">
          <button
            className="product-action-btn"
            onClick={e => { e.stopPropagation(); addToCart(product); }}
          >
            + Giỏ hàng
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
      <div className="product-brand">{product.brand} · {product.cat}</div>
      <div className="product-price-row">
        <span className="product-price">{fmt(product.price)}</span>
        {product.oldPrice && <span className="product-price-old">{fmt(product.oldPrice)}</span>}
      </div>
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
              <input className="newsletter-input" type="email" placeholder="Nhập địa chỉ email của bạn..." />
              <button className="newsletter-btn" onClick={() => showToast('Đăng ký thành công! Cảm ơn bạn 🎉', 'bi-envelope-check')}>
                Đăng ký
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: 'rgba(247,244,239,.3)', marginTop: 10 }}>
              Không spam. Hủy đăng ký bất kỳ lúc nào.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────── */
export function Footer({ navigate }) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="row">
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="footer-logo">LYRA</div>
            <p className="footer-desc">Thương hiệu thời trang cao cấp Việt Nam. Nơi phong cách gặp gỡ chất lượng thủ công tuyệt vời.</p>
          </div>
          {[
            { heading: 'Sản phẩm', links: ['Thời trang nữ','Thời trang nam','Giày dép','Phụ kiện','Sale'] },
            { heading: 'Hỗ trợ',   links: ['Chính sách đổi trả','Hướng dẫn size','Theo dõi đơn hàng','Liên hệ','FAQ'] },
            { heading: 'Về chúng tôi', links: ['Câu chuyện thương hiệu','Tuyển dụng','Blog thời trang','Cửa hàng','Press'] },
          ].map(({ heading, links }) => (
            <div key={heading} className="col-lg-2 col-md-4 col-6 mb-4 offset-lg-1">
              <div className="footer-heading">{heading}</div>
              <ul className="footer-list">
                {links.map(l => (
                  <li key={l}><a onClick={() => navigate('shop')}>{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <hr className="footer-divider" />
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="footer-copy">© 2025 MAISON. All rights reserved.</div>
          <div className="social-row">
            {['instagram','facebook','tiktok','pinterest'].map(s => (
              <div key={s} className="social-btn"><i className={`bi bi-${s}`} /></div>
            ))}
          </div>
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
