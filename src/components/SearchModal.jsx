// src/components/SearchModal.jsx — hộp tìm kiếm nhanh (Ctrl + K).
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt } from '../data/products';
import { useCatalog } from '../context/CatalogContext';
import { deburr } from '../router.js';
import { Pic, Stars, useBodyScrollLock, useDialogA11y } from './index.jsx';
import '../styles/components.css';

// Gợi ý phải khớp dữ liệu thật (tránh chip bấm vào ra 0 kết quả).
const SUGGESTIONS = ['Áo lụa', 'Váy midi', 'Blazer', 'Sneaker', 'Túi', 'Quần jean'];
const MAX_HISTORY = 6;
const MAX_RESULTS = 8;



/** Chuỗi tìm kiếm gộp của một sản phẩm, đã bỏ dấu. */
function haystack(p) {
  return deburr(
    [p.name, p.cat, p.brand, p.desc, ...(Array.isArray(p.tags) ? p.tags : [])].filter(Boolean).join(' ')
  );
}

export default function SearchModal({ open, onClose }) {
  const { navigate } = useApp();
  const { addToCart } = useCart();
  const { products } = useCatalog();
  const trending = useMemo(
    () => [...products].sort((a, b) => (b.reviews || 0) - (a.reviews || 0)).slice(0, 3),
    [products],
  );

  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);
  const [history, setHistory] = useState(() => {
    try {
      // Dùng CHUNG khoá với trang Tìm kiếm (SearchPage) — trước đây mỗi nơi
      // lưu một khoá riêng nên cùng một tính năng lại hiện hai danh sách khác nhau.
      const raw = JSON.parse(localStorage.getItem('lyra_recent_searches') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  });

  const panelRef = useRef(null);
  const inputRef = useRef(null);

  useBodyScrollLock(open);
  useDialogA11y(open, panelRef, onClose, { initialFocus: inputRef });

  // Reset nội dung mỗi lần mở lại.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(-1);
    }
  }, [open]);

  // Tìm kiếm bỏ dấu; giữ TỔNG số khớp riêng với danh sách đã cắt.
  const { results, total } = useMemo(() => {
    const q = deburr(query.trim());
    if (!q) return { results: [], total: 0 };
    const matched = products.filter((p) => haystack(p).includes(q));
    return { results: matched.slice(0, MAX_RESULTS), total: matched.length };
  }, [query, products]);

  useEffect(() => {
    setActiveIdx(-1);
  }, [query]);

  const saveHistory = useCallback((q) => {
    const trimmed = String(q || '').trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const updated = [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem('lyra_recent_searches', JSON.stringify(updated));
      } catch { /* localStorage bị chặn — bỏ qua */ }
      return updated;
    });
  }, []);

  const openProduct = useCallback(
    (product) => {
      saveHistory(query || product.name);
      onClose();
      navigate('detail', { product });
    },
    [navigate, onClose, query, saveHistory]
  );

  const goSearchPage = useCallback(
    (q) => {
      saveHistory(q);
      onClose();
      navigate('search', { q });   // router dùng tham số ?q=
    },
    [navigate, onClose, saveHistory]
  );

  const handleKeyDown = (e) => {
    // Enter luôn hoạt động, kể cả khi chưa có kết quả trực tiếp.
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && results[activeIdx]) openProduct(results[activeIdx]);
      else if (query.trim()) goSearchPage(query.trim());
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('lyra_recent_searches');
    } catch { /* bỏ qua */ }
  };

  const removeHistoryItem = (item) => {
    setHistory((prev) => {
      const updated = prev.filter((h) => h !== item);
      try {
        localStorage.setItem('lyra_recent_searches', JSON.stringify(updated));
      } catch { /* bỏ qua */ }
      return updated;
    });
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="search-overlay">
      <div className="search-scrim" onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        className="search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm sản phẩm"
        tabIndex={-1}
      >
        {/* ── Ô nhập ── */}
        <div className="search-modal-bar">
          <i className="bi bi-search search-bar-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="search-modal-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm sản phẩm, danh mục, thương hiệu..."
            aria-label="Tìm kiếm sản phẩm"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={activeIdx >= 0 ? `search-result-${activeIdx}` : undefined}
            autoComplete="off"
          />
          {query && (
            <button type="button" className="search-x-btn" onClick={() => setQuery('')} aria-label="Xoá từ khoá">
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          )}
          <button type="button" className="search-esc-btn" onClick={onClose}>
            ESC
          </button>
        </div>

        <div className="search-modal-body">
          {/* Thông báo số kết quả cho trình đọc màn hình */}
          <p className="sr-only" role="status" aria-live="polite">
            {query ? `${total} kết quả cho ${query}` : ''}
          </p>

          {/* ── Kết quả ── */}
          {query && results.length > 0 && (
            <div>
              <div className="eyebrow">{total} kết quả cho “{query}”</div>
              <ul className="search-results" id="search-results" role="listbox" aria-label="Kết quả tìm kiếm">
                {results.map((p, i) => (
                  <li
                    key={p.id}
                    id={`search-result-${i}`}
                    role="option"
                    aria-selected={activeIdx === i}
                    className={`search-result${activeIdx === i ? ' active' : ''}`}
                  >
                    <button
                      type="button"
                      className="search-result-main"
                      onClick={() => openProduct(p)}
                      onMouseEnter={() => setActiveIdx(i)}
                    >
                      <Pic
                        src={p.images?.[0]}
                        alt={p.name}
                        tint={p.color}
                        icon={p.icon}
                        ratio="3/4"
                        as="span"
                        className="search-result-pic"
                      />
                      <span className="search-result-info">
                        <span className="search-result-name">
                          <HighlightText text={p.name} query={query} />
                        </span>
                        <span className="search-result-meta">
                          {p.brand} · {p.cat}
                        </span>
                      </span>
                      <span className="search-result-price">
                        {fmt(p.price)}
                        {p.badge && <span className={`product-badge ${String(p.badge).toLowerCase()}`}>{p.badge}</span>}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="search-result-add"
                      /* Đóng hộp tìm kiếm TRƯỚC khi thêm vào giỏ: addToCart mở
                         ngăn kéo giỏ hàng, mà ngăn kéo nằm dưới lớp phủ tìm
                         kiếm — focus sẽ nhảy vào một hộp thoại bị che khuất. */
                      onClick={() => { onClose(); addToCart(p, 1); }}
                      aria-label={`Thêm nhanh ${p.name} vào giỏ hàng`}
                    >
                      <i className="bi bi-bag-plus" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>

              <button type="button" className="search-viewall" onClick={() => goSearchPage(query.trim())}>
                Xem tất cả {total} kết quả cho “{query}”
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* ── Không có kết quả ── */}
          {query && results.length === 0 && (
            <div className="search-empty">
              <i className="bi bi-search" aria-hidden="true" />
              <h3>Không tìm thấy “{query}”</h3>
              <p>Thử từ khoá khác, hoặc khám phá toàn bộ bộ sưu tập Thu – Đông 2026.</p>
              <button
                type="button"
                className="btn-lyra"
                onClick={() => {
                  onClose();
                  navigate('shop');
                }}
              >
                Xem tất cả sản phẩm
              </button>
            </div>
          )}

          {/* ── Chưa nhập gì: lịch sử + gợi ý + trending ── */}
          {!query && (
            <div className="search-idle">
              <section className="search-col">
                <div className="search-col-head">
                  <div className="eyebrow">Tìm kiếm gần đây</div>
                  {history.length > 0 && (
                    <button type="button" className="search-textbtn" onClick={clearHistory}>
                      Xoá tất cả
                    </button>
                  )}
                </div>
                {history.length === 0 ? (
                  <p className="search-muted">Chưa có lịch sử tìm kiếm.</p>
                ) : (
                  <ul className="search-history">
                    {history.map((item) => (
                      <li key={item}>
                        <button type="button" className="search-history-main" onClick={() => setQuery(item)}>
                          <i className="bi bi-clock-history" aria-hidden="true" />
                          <span>{item}</span>
                        </button>
                        <button
                          type="button"
                          className="search-x-btn"
                          onClick={() => removeHistoryItem(item)}
                          aria-label={`Xoá “${item}” khỏi lịch sử`}
                        >
                          <i className="bi bi-x" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="eyebrow search-col-gap">Gợi ý tìm kiếm</div>
                <div className="search-chips">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="search-chip" onClick={() => setQuery(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </section>

              <section className="search-col">
                <div className="eyebrow">Được quan tâm nhất</div>
                <ul className="search-trending">
                  {trending.map((p, i) => (
                    <li key={p.id}>
                      <button type="button" className="search-trending-row" onClick={() => openProduct(p)}>
                        <span className="search-trending-rank" aria-hidden="true">
                          {i + 1}
                        </span>
                        <Pic
                          src={p.images?.[0]}
                          alt={p.name}
                          tint={p.color}
                          icon={p.icon}
                          ratio="3/4"
                          as="span"
                          className="search-trending-pic"
                        />
                        <span className="search-trending-info">
                          <span className="search-trending-name">{p.name}</span>
                          <Stars rating={p.rating} size={10} />
                        </span>
                        <span className="search-trending-price">{fmt(p.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Tô sáng phần khớp (so khớp bỏ dấu để vẫn đúng vị trí) ── */
function HighlightText({ text, query }) {
  const q = deburr(String(query || '').trim());
  if (!q) return <span>{text}</span>;
  const idx = deburr(text).indexOf(q);
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </span>
  );
}
