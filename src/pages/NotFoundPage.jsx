// src/pages/NotFoundPage.jsx
import { useState } from 'react';
import '../styles/notfound.css';
import { useApp } from '../context/AppContext';
import { Reveal, isModifiedClick } from '../components/index.jsx';
import { CATEGORIES } from '../data/products';
import { buildUrl } from '../router.js';

/* Liên kết phụ ở cuối trang 404 — lấy từ các trang có thật trong bảng định tuyến. */
const QUICK_LINKS = [
  { label: 'Hàng mới về', page: 'new' },
  { label: 'Khuyến mãi', page: 'sale' },
  { label: 'Thương hiệu', page: 'brands' },
  { label: 'Yêu thích', page: 'wishlist' },
];

export default function NotFoundPage() {
  const { navigate, pathname } = useApp();
  const [term, setTerm] = useState('');

  /** Điều hướng SPA nhưng vẫn giữ <a href> thật (ctrl/cmd-click mở tab mới). */
  const go = (page, params) => (e) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    navigate(page, params);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    navigate('search', { q });
  };

  const missingPath = pathname && pathname !== '/' ? pathname : '';

  return (
    <div className="not-found nf-page">
      <div className="nf-inner">
        <Reveal delay={0}>
          <p className="eyebrow">Lỗi 404</p>
          <div className="not-found-num" aria-hidden="true">404</div>
          <h1 className="not-found-title">
            Trang này đã <em>lạc lối</em>
          </h1>
          <p className="not-found-sub">
            Địa chỉ bạn vừa mở không tồn tại hoặc đã được chuyển sang nơi khác. Hãy thử tìm
            một thiết kế cụ thể, hoặc quay lại bộ sưu tập Thu – Đông 2026 của LYRA.
          </p>
          {missingPath && (
            <p className="nf-path">
              Không tìm thấy: <code>{missingPath}</code>
            </p>
          )}
        </Reveal>

        <Reveal delay={1}>
          <form className="nf-form" onSubmit={handleSubmit} role="search">
            <label className="sr-only" htmlFor="nf-search">
              Tìm kiếm sản phẩm LYRA
            </label>
            <input
              id="nf-search"
              className="nf-input"
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Tìm áo khoác, giày, phụ kiện…"
              autoComplete="off"
              enterKeyHint="search"
            />
            <button type="submit" className="btn-lyra nf-submit" disabled={!term.trim()}>
              <i className="bi bi-search" aria-hidden="true" /> Tìm kiếm
            </button>
          </form>
        </Reveal>

        <Reveal delay={2}>
          <p className="nf-suggest-label">Hoặc bắt đầu từ một danh mục</p>
          <div className="chip-row">
            {CATEGORIES.map((cat) => (
              <a
                key={cat.id}
                className="chip"
                href={buildUrl('shop', { cat: cat.slug })}
                onClick={go('shop', { cat: cat.slug })}
              >
                <i className={`bi ${cat.icon}`} aria-hidden="true" />
                {cat.name}
                <span className="nf-chip-count">({cat.count})</span>
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal delay={3}>
          <div className="nf-actions">
            <a className="btn-lyra" href={buildUrl('home')} onClick={go('home')}>
              <i className="bi bi-house" aria-hidden="true" /> Về trang chủ
            </a>
            <a className="btn-outline-lyra" href={buildUrl('shop')} onClick={go('shop')}>
              Khám phá cửa hàng
            </a>
          </div>

          <nav className="nf-links" aria-label="Liên kết nhanh">
            {QUICK_LINKS.map((l, i) => (
              <span key={l.page}>
                {i > 0 && (
                  <span className="nf-sep" aria-hidden="true">
                    ·&nbsp;
                  </span>
                )}
                <a className="link-underline" href={buildUrl(l.page)} onClick={go(l.page)}>
                  {l.label}
                </a>
              </span>
            ))}
          </nav>
        </Reveal>
      </div>
    </div>
  );
}

/* Màn hình chờ — App không còn dùng loader giả, nhưng vẫn export để không vỡ import cũ. */
export function LoadingScreen() {
  return (
    <div className="loader-screen" role="status" aria-live="polite">
      <div className="loader-logo">LYRA</div>
      <div className="loader-bar" />
      <div className="loader-note">Đang tải…</div>
    </div>
  );
}
