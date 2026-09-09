// src/components/index.jsx — component dùng chung của LYRA
// Hợp đồng API: xem spec.md §4. Các trang khác import từ đây, KHÔNG đổi tên export.

import { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt } from '../data/products';
import { buildUrl, slugify } from '../router.js';
import '../styles/components.css';

/* ══════════════════════════════════════════════
   TIỆN ÍCH DÙNG CHUNG (khoá cuộn body, dialog a11y)
   ══════════════════════════════════════════════ */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Đếm số overlay đang mở để không mở khoá cuộn quá sớm khi có 2 lớp chồng nhau.
let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

/** Khoá cuộn body khi `active` = true (bù chiều rộng thanh cuộn để trang không giật). */
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

/**
 * ESC để đóng + bẫy Tab trong panel + đưa focus vào panel khi mở và trả focus khi đóng.
 * @param {boolean} open
 * @param {{current: HTMLElement|null}} panelRef
 * @param {Function} onClose
 * @param {{initialFocus?: {current: HTMLElement|null}}} opts
 */
export function useDialogA11y(open, panelRef, onClose, opts = {}) {
  const { initialFocus } = opts;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const previouslyFocused = document.activeElement;

    // Đưa focus vào phần tử được chỉ định, hoặc phần tử focus được đầu tiên trong panel.
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
      // Focus đang nằm NGOÀI panel (thường là <body> sau khi một nút bị gỡ khỏi
      // DOM) → chỉ chặn ở hai đầu là không đủ, Tab sẽ thoát ra trang phía sau.
      // Kéo focus trở lại trong panel.
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
      // Trả focus cho phần tử đã mở dialog.
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [open, panelRef, initialFocus]);
}

/** Bấm vào <a> nội bộ: cho phép ctrl/cmd/giữa chuột mở tab mới, còn lại điều hướng SPA. */
export function isModifiedClick(e) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1;
}

/* ══════════════════════════════════════════════
   Pic — ảnh có tỉ lệ cố định, không gây layout shift
   ══════════════════════════════════════════════ */
export function Pic({
  src,
  alt = '',
  ratio = '3/4',
  tint,
  className = '',
  sizes,
  eager = false,
  icon,
  as: Tag = 'div',
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Đổi ảnh → reset trạng thái để fade-in lại và bỏ cờ lỗi cũ.
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  /* Ảnh Unsplash nhận tham số ?w= nên có thể dựng srcSet thật.
     Không có srcSet thì thuộc tính `sizes` hoàn toàn vô tác dụng và điện thoại
     vẫn tải đúng tấm ảnh khổ lớn như máy tính. */
  const srcSet = useMemo(() => {
    if (!src || !/images\.unsplash\.com/.test(src) || !/[?&]w=\d+/.test(src)) return undefined;
    return [480, 800, 1200, 1600]
      .map((w) => `${src.replace(/([?&]w=)\d+/, `$1${w}`)} ${w}w`)
      .join(', ');
  }, [src]);

  return (
    <Tag
      className={`pic${loaded ? ' is-loaded' : ''}${failed ? ' is-error' : ''}${className ? ` ${className}` : ''}`}
      style={{ aspectRatio: ratio, background: tint || 'var(--sand, #E9E2D6)' }}
      {...rest}
    >
      {src && !failed && (
        <img
          className={loaded ? 'loaded' : ''}
          src={src}
          srcSet={srcSet}
          alt={alt}
          sizes={srcSet ? (sizes || '(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 400px') : undefined}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      {/* Ảnh hỏng / chưa có ảnh → giữ nguyên ô màu tint + icon (không làm nhảy layout). */}
      {(!src || failed) && (
        <span className="pic-fallback" aria-hidden="true">
          <i className={`bi ${icon || 'bi-image'}`} />
        </span>
      )}
    </Tag>
  );
}

/* ══════════════════════════════════════════════
   Stars — hỗ trợ nửa sao + nhãn cho trình đọc màn hình
   ══════════════════════════════════════════════ */
export function Stars({ rating = 0, size = 11, className = '' }) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  const icons = [1, 2, 3, 4, 5].map((i) => {
    if (value >= i - 0.25) return 'bi-star-fill';
    if (value >= i - 0.75) return 'bi-star-half';
    return 'bi-star';
  });
  const label = `${value.toFixed(1).replace('.', ',')} trên 5 sao`;
  return (
    <div
      className={`product-stars${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={label}
    >
      {icons.map((ic, i) => (
        <i
          key={i}
          className={`bi ${ic} star-icon${ic === 'bi-star' ? ' empty' : ''}`}
          style={{ fontSize: size }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   ProductCard
   ══════════════════════════════════════════════ */
export function ProductCard({ product, index = 0, delay = 0 }) {
  const { navigate } = useApp();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  if (!product) return null;

  const wished = isWishlisted(product.id);
  const href = buildUrl('detail', { product: product.slug || product.id });
  const images = Array.isArray(product.images) ? product.images : [];
  const i = index || delay || 0;

  // Ctrl/Cmd-click vẫn mở tab mới; click thường điều hướng trong SPA.
  const open = (e) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    navigate('detail', { product });
  };

  return (
    <article className="product-card" data-reveal style={{ '--i': i % 8 }}>
      <div className="product-card-img">
        {/* Ảnh là liên kết thật (ctrl-click mở tab mới) nhưng không tạo thêm điểm dừng Tab
            — tên sản phẩm bên dưới đã là liên kết có tên rõ ràng. */}
        <a className="product-card-link" href={href} onClick={open} tabIndex={-1} aria-hidden="true">
          <Pic
            src={images[0]}
            alt={product.name}
            tint={product.color}
            icon={product.icon}
            ratio="3/4"
            sizes="(max-width: 900px) 50vw, 25vw"
          />
          {images[1] && (
            <Pic src={images[1]} alt="" tint={product.color} ratio="3/4" className="pic--hover" />
          )}
        </a>

        {product.badge && (
          <span className={`product-badge ${String(product.badge).toLowerCase()}`}>{product.badge}</span>
        )}

        <button
          type="button"
          className={`product-wish-corner${wished ? ' active' : ''}`}
          aria-label={wished ? `Bỏ yêu thích ${product.name}` : `Thêm ${product.name} vào yêu thích`}
          aria-pressed={wished}
          onClick={() => toggleWishlist(product)}
        >
          <i className={`bi bi-heart${wished ? '-fill' : ''}`} aria-hidden="true" />
        </button>

        {/* MỘT nút duy nhất: hiện khi hover/focus, luôn hiện trên thiết bị cảm ứng (CSS) */}
        <div className="product-card-actions">
          <button
            type="button"
            className="product-action-btn"
            onClick={() => addToCart(product, 1)}
            aria-label={`Thêm nhanh ${product.name} vào giỏ hàng`}
          >
            <i className="bi bi-bag-plus" aria-hidden="true" /> Thêm nhanh
          </button>
        </div>
      </div>

      <Stars rating={product.rating} />
      <a className="product-name" href={href} onClick={open}>
        {product.name}
      </a>
      <div className="product-brand">
        {product.brand} · {product.cat}
      </div>
      {(product.colors || []).length > 0 && (
        <div className="card-swatches" aria-label="Màu sắc">
          {product.colors.slice(0, 4).map((c) => (
            <span
              key={c.name}
              className="card-swatch"
              style={{ background: c.hex || product.color }}
              title={c.name}
            />
          ))}
        </div>
      )}
      <div className="product-price-row">
        <span className="product-price">{fmt(product.price)}</span>
        {product.oldPrice > product.price && (
          <span className="product-price-old">{fmt(product.oldPrice)}</span>
        )}
      </div>
      {product.stock > 0 && product.stock <= 12 && (
        <p className="card-stock">Còn {product.stock} cái</p>
      )}
      {/* Chỉ hiển thị ở chế độ danh sách (.products-grid.list-view) */}
      {product.desc && <p className="product-card-desc">{product.desc}</p>}
    </article>
  );
}

/* ══════════════════════════════════════════════
   SectionHeader
   ══════════════════════════════════════════════ */
export function SectionHeader({ eyebrow, title, sub, link, align = 'left', className = '' }) {
  const { navigate } = useApp();
  // link: { label, page, params, onClick } — page/params là cách chuẩn để dựng href thật.
  const href = link && link.page ? buildUrl(link.page, link.params || {}) : link?.href;

  const onLinkClick = (e) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    if (link.onClick) link.onClick(e);
    else if (link.page) navigate(link.page, link.params || {});
  };

  return (
    <div className={`section-header${align === 'center' ? ' is-center' : ''}${className ? ` ${className}` : ''}`}>
      <div className="section-header-text">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        {title && <h2 className="section-title">{title}</h2>}
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      {link && (
        <a className="section-link" href={href || '#'} onClick={onLinkClick}>
          {link.label}
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   EmptyState
   ══════════════════════════════════════════════ */
export function EmptyState({ icon = 'bi-inbox', title, sub, action, children }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon}`} aria-hidden="true" />
      {title && <h3 className="empty-state-title">{title}</h3>}
      {sub && <p className="empty-state-sub">{sub}</p>}
      {/* action: { label, onClick } hoặc một node tuỳ ý */}
      {(action || children) && (
        <div className="empty-state-actions">
          {action && typeof action === 'object' && action.label ? (
            <button type="button" className="btn-lyra" onClick={action.onClick}>
              {action.label}
            </button>
          ) : (
            action || null
          )}
          {children}
        </div>
      )}
    </div>
  );
}

/** API trả catalog rỗng — không thế bằng lookbook mock. */
export function CatalogEmpty() {
  return (
    <EmptyState
      icon="bi-bag"
      title="Bộ sưu tập đang được cập nhật"
      sub="Hiện chưa có thiết kế nào trên kệ. Tải lại trang sau ít phút, hoặc đọc câu chuyện LYRA."
      action={{
        label: 'Tải lại',
        onClick: () => { if (typeof window !== 'undefined') window.location.reload(); },
      }}
    />
  );
}

/* ══════════════════════════════════════════════
   Marquee — chỉ đọc một lượt cho screen reader
   ══════════════════════════════════════════════ */
const MARQUEE_ITEMS = [
  'Miễn phí giao hàng cho đơn trên 500K',
  'Hàng chính hãng 100%',
  'Đổi trả trong 30 ngày',
  'Thanh toán an toàn',
  'Giao hàng toàn quốc',
  'Chăm sóc khách hàng 24/7',
];

export function Marquee() {
  const [paused, setPaused] = useState(false);
  return (
    <div className={`marquee-bar${paused ? ' paused' : ''}`}>
      {/* Nội dung thật cho trình đọc màn hình, chỉ đọc một lượt */}
      <ul className="sr-only">
        {MARQUEE_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="marquee-track" aria-hidden="true">
        {[0, 1].map((rep) => (
          <div key={rep} className="marquee-content">
            {MARQUEE_ITEMS.map((item, i) => (
              <span key={i} className="marquee-item">
                {item} <span className="marquee-dot">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
      {/* WCAG 2.2.2 — cho phép dừng chuyển động lặp */}
      <button
        type="button"
        className="marquee-pause"
        onClick={() => setPaused((v) => !v)}
        aria-label={paused ? 'Tiếp tục dải chữ chạy' : 'Tạm dừng dải chữ chạy'}
      >
        <i className={`bi ${paused ? 'bi-play-fill' : 'bi-pause-fill'}`} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   RecentMarquee — đã xem gần đây: chạy chậm phải → trái, dừng khi hover
   ══════════════════════════════════════════════════════════════ */
export function RecentMarquee({ products, label = 'Sản phẩm bạn đã xem gần đây' }) {
  const list = Array.isArray(products) ? products.filter(Boolean) : [];
  const copies = list.length >= 5 ? 2 : 4;
  if (!list.length) return null;

  return (
    <div
      className="recent-marquee"
      role="region"
      aria-label={label}
      style={{ '--recent-n': list.length, '--recent-copies': copies }}
    >
      <div className="recent-marquee-track">
        {Array.from({ length: copies }, (_, copy) => (
          <div
            key={copy}
            className="recent-marquee-set"
            role={copy === 0 ? 'list' : undefined}
            aria-hidden={copy === 0 ? undefined : true}
          >
            {list.map((p, i) => (
              <div key={`${copy}-${p.id || p.slug || i}`} role={copy === 0 ? 'listitem' : undefined}>
                <ProductCard product={p} index={i} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Newsletter — controlled + validate + toast
   ══════════════════════════════════════════════ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function Newsletter({ showToast: showToastProp }) {
  const { showToast: showToastCtx } = useCart();
  const showToast = showToastProp || showToastCtx;
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setError('Vui lòng nhập địa chỉ email.');
      showToast?.('Vui lòng nhập địa chỉ email.', 'bi-exclamation-circle');
      return;
    }
    if (!EMAIL_RE.test(value)) {
      setError('Địa chỉ email chưa hợp lệ.');
      showToast?.('Địa chỉ email chưa hợp lệ.', 'bi-exclamation-circle');
      return;
    }
    setError('');
    setEmail('');
    showToast?.('Đăng ký nhận tin thành công. Cảm ơn bạn!', 'bi-envelope-check');
  };

  return (
    <section className="newsletter-section">
      <div className="wrap">
        <div className="newsletter-inner">
          <div className="newsletter-copy">
            <h2 className="newsletter-title">
              Nhận ưu đãi
              <br />
              <em>độc quyền</em>
            </h2>
            <p className="newsletter-sub">
              Đăng ký để nhận thông tin bộ sưu tập mới, khuyến mãi và xu hướng thời trang hằng tuần từ LYRA.
            </p>
          </div>
          <div className="newsletter-action">
            <form className="newsletter-form" onSubmit={submit} noValidate>
              <label className="sr-only" htmlFor="newsletter-email">
                Địa chỉ email
              </label>
              <input
                id="newsletter-email"
                className="newsletter-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Nhập địa chỉ email của bạn..."
                aria-label="Địa chỉ email"
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'newsletter-error' : undefined}
              />
              <button className="newsletter-btn" type="submit">
                Đăng ký
              </button>
            </form>
            {error && (
              <p className="newsletter-error" id="newsletter-error" role="alert">
                {error}
              </p>
            )}
            <p className="newsletter-note">Không spam. Có thể huỷ đăng ký bất kỳ lúc nào.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   Footer — mọi liên kết đi đúng trang
   ══════════════════════════════════════════════ */
const FOOTER_COLUMNS = [
  {
    heading: 'Sản phẩm',
    links: [
      { label: 'Thời trang nữ', page: 'shop', params: { cat: slugify('Thời trang nữ') } },
      { label: 'Thời trang nam', page: 'shop', params: { cat: slugify('Thời trang nam') } },
      { label: 'Giày dép', page: 'shop', params: { cat: slugify('Giày dép') } },
      { label: 'Phụ kiện', page: 'shop', params: { cat: slugify('Phụ kiện') } },
      { label: 'Khuyến mãi', page: 'sale' },
    ],
  },
  {
    heading: 'Hỗ trợ',
    links: [
      { label: 'Hàng mới về', page: 'new' },
      { label: 'Theo dõi đơn hàng', page: 'profile', params: { tab: 'orders' } },
      { label: 'Sản phẩm yêu thích', page: 'wishlist' },
      { label: 'Chính sách đổi trả', soon: true },
      { label: 'Hướng dẫn chọn size', soon: true },
    ],
  },
  {
    heading: 'Về LYRA',
    links: [
      { label: 'Câu chuyện thương hiệu', page: 'brands' },
      { label: 'Tất cả sản phẩm', page: 'shop' },
      { label: 'Liên hệ', soon: true },
      { label: 'Tuyển dụng', soon: true },
      { label: 'Hệ thống cửa hàng', soon: true },
    ],
  },
];

const SOCIALS = [
  { name: 'Instagram', icon: 'bi-instagram' },
  { name: 'Facebook', icon: 'bi-facebook' },
  { name: 'TikTok', icon: 'bi-tiktok' },
  { name: 'Pinterest', icon: 'bi-pinterest' },
];

export function Footer({ navigate: navigateProp }) {
  const { navigate: navigateCtx } = useApp();
  const { showToast } = useCart();
  const navigate = navigateProp || navigateCtx;

  const go = (e, link) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    if (link.soon) {
      showToast?.(`Trang "${link.label}" đang được phát triển.`, 'bi-tools');
      return;
    }
    navigate(link.page, link.params || {});
  };

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-intro">
            <div className="footer-logo">LYRA</div>
            <p className="footer-desc">
              Thương hiệu thời trang Việt Nam. Nơi phong cách gặp gỡ chất lượng thủ công — từ Hà Nội, từ năm 2018.
            </p>
            <div className="social-row">
              {SOCIALS.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className="social-btn"
                  aria-label={`LYRA trên ${s.name} — đang phát triển`}
                  onClick={() => showToast?.(`Kênh ${s.name} đang được phát triển.`, 'bi-tools')}
                >
                  <i className={`bi ${s.icon}`} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.heading} className="footer-col" aria-label={col.heading}>
              <div className="footer-heading">{col.heading}</div>
              <ul className="footer-list">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.soon ? '#' : buildUrl(l.page, l.params || {})}
                      onClick={(e) => go(e, l)}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Chữ ký thương hiệu cỡ lớn */}
        <div className="footer-wordmark" aria-hidden="true">LYRA</div>

        <div className="footer-bottom">
          <div className="footer-copy">© 2026 LYRA. Bảo lưu mọi quyền.</div>
          <div className="footer-legal">
            <span>128 Phố Huế, Hai Bà Trưng, Hà Nội</span>
            <span aria-hidden="true">·</span>
            <span>Hotline 1900 1234</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════
   ToastContainer — vùng thông báo trực tiếp
   ══════════════════════════════════════════════ */
export function ToastContainer() {
  const { toasts = [], dismissToast } = useCart();
  return (
    <div className="toast-container" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Cho phép trình duyệt vẽ trạng thái ẩn trước rồi mới chuyển sang hiện.
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`toast-notify${visible ? ' visible' : ''}`}>
      <i className={`bi ${toast.icon || 'bi-check-circle'}`} aria-hidden="true" />
      <span className="toast-msg">{toast.msg}</span>
      {toast.action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            toast.action.onClick?.();
            onDismiss?.(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        className="toast-close"
        aria-label="Đóng thông báo"
        onClick={() => onDismiss?.(toast.id)}
      >
        <i className="bi bi-x-lg" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Reveal — bọc nội dung để hiện dần khi cuộn tới
   ══════════════════════════════════════════════ */
export function Reveal({ children, delay = 0, as: Tag = 'div', className = '', ...rest }) {
  return (
    <Tag className={`reveal${className ? ` ${className}` : ''}`} data-reveal style={{ '--i': delay }} {...rest}>
      {children}
    </Tag>
  );
}
