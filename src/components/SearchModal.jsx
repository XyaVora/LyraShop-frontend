// src/components/SearchModal.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS, fmt } from '../data/products';
import { Stars } from './index.jsx';

const SUGGESTIONS = ['Áo lụa', 'Giày da', 'Váy midi', 'Blazer', 'Túi bucket', 'Quần jean'];
const MAX_HISTORY = 6;

export default function SearchModal({ open, onClose }) {
  const { navigate } = useApp();
  const { addToCart } = useCart();
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [history, setHistory]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('maison_search_history') || '[]'); }
    catch { return []; }
  });
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery('');
      setResults([]);
      setActiveIdx(-1);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Live search
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setResults([]); return; }
    const matched = PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.cat.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
    ).slice(0, 8);
    setResults(matched);
    setActiveIdx(-1);
  }, [query]);

  // Keyboard nav
  const handleKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    if (e.key === 'Enter') {
      if (activeIdx >= 0) openProduct(results[activeIdx]);
      else if (query.trim()) goSearchPage(query.trim());
    }
  };

  const saveHistory = useCallback((q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...history.filter(h => h !== trimmed)].slice(0, MAX_HISTORY);
    setHistory(updated);
    try { localStorage.setItem('maison_search_history', JSON.stringify(updated)); } catch {}
  }, [history]);

  const openProduct = (product) => {
    saveHistory(query || product.name);
    onClose();
    navigate('detail', { product });
  };

  const goSearchPage = (q) => {
    saveHistory(q);
    onClose();
    navigate('search', { query: q });
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem('maison_search_history'); } catch {}
  };

  const removeHistoryItem = (item, e) => {
    e.stopPropagation();
    const updated = history.filter(h => h !== item);
    setHistory(updated);
    try { localStorage.setItem('maison_search_history', JSON.stringify(updated)); } catch {}
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(14,14,14,.6)',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn .2s ease',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1101,
        background: 'var(--cream)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 24px 64px rgba(14,14,14,.15)',
        animation: 'slideDown .25s cubic-bezier(.25,.46,.45,.94)',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        {/* Search input row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          borderBottom: '1px solid var(--border)',
          padding: '0 40px',
          height: 72,
        }}>
          <i className="bi bi-search" style={{ fontSize: 20, color: 'var(--muted)', marginRight: 16, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm sản phẩm, danh mục, thương hiệu..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 18, fontFamily: 'var(--font-sans)',
              background: 'transparent', color: 'var(--ink)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--muted)', fontSize: 18 }}
            >
              <i className="bi bi-x-lg" />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--border)', cursor: 'pointer',
              padding: '6px 14px', fontSize: 11.5, letterSpacing: '.08em',
              color: 'var(--muted)', fontFamily: 'var(--font-sans)',
              marginLeft: 12, flexShrink: 0, transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            ESC
          </button>
        </div>

        <div style={{ padding: '28px 40px 36px' }}>
          {/* ── Live results ── */}
          {query && results.length > 0 && (
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
                {results.length} kết quả cho "{query}"
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
                {results.map((p, i) => (
                  <div
                    key={p.id}
                    onClick={() => openProduct(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 14px',
                      background: activeIdx === i ? 'var(--warm-pale)' : 'transparent',
                      cursor: 'pointer', transition: 'background .15s',
                      borderRadius: 2,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-dark)'; setActiveIdx(i); }}
                    onMouseLeave={e => { if (activeIdx !== i) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width: 52, height: 64, background: p.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, color: 'rgba(14,14,14,.2)',
                    }}>
                      <i className={`bi ${p.icon}`} style={{ fontSize: 20 }} />
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, marginBottom: 3 }}>
                        {/* Highlight match */}
                        <HighlightText text={p.name} query={query} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.brand} · {p.cat}</div>
                    </div>
                    {/* Price + badge */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>{fmt(p.price)}</div>
                      {p.badge && (
                        <span style={{
                          fontSize: 10, padding: '2px 8px',
                          background: p.badge === 'Sale' ? 'var(--warm)' : 'var(--ink)',
                          color: '#fff', letterSpacing: '.06em',
                        }}>
                          {p.badge}
                        </span>
                      )}
                    </div>
                    {/* Quick add */}
                    <button
                      onClick={e => { e.stopPropagation(); addToCart(p); }}
                      style={{
                        width: 36, height: 36, border: '1px solid var(--border)',
                        background: 'transparent', cursor: 'pointer', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, color: 'var(--ink)', transition: 'all .2s',
                      }}
                      title="Thêm vào giỏ"
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--cream)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink)'; }}
                    >
                      <i className="bi bi-bag-plus" />
                    </button>
                  </div>
                ))}
              </div>
              {/* View all results */}
              <button
                onClick={() => goSearchPage(query)}
                style={{
                  width: '100%', padding: '13px', border: '1.5px solid var(--border)',
                  background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  fontSize: 12.5, letterSpacing: '.08em', color: 'var(--ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--cream)'; e.currentTarget.style.borderColor = 'var(--ink)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                Xem tất cả {results.length} kết quả cho "{query}"
                <i className="bi bi-arrow-right" />
              </button>
            </div>
          )}

          {/* ── No results ── */}
          {query && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              <i className="bi bi-search" style={{ fontSize: 40, opacity: .2, display: 'block', marginBottom: 16 }} />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 300, color: 'var(--ink)', marginBottom: 8 }}>
                Không tìm thấy "{query}"
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 320, margin: '0 auto 24px' }}>
                Thử tìm với từ khóa khác hoặc khám phá các danh mục bên dưới.
              </p>
              <button className="btn-maison" onClick={() => { onClose(); navigate('shop'); }}>
                Xem tất cả sản phẩm
              </button>
            </div>
          )}

          {/* ── Empty state: suggestions + history ── */}
          {!query && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
              {/* Search history */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Tìm kiếm gần đây
                  </div>
                  {history.length > 0 && (
                    <button onClick={clearHistory} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-sans)' }}>
                      Xóa tất cả
                    </button>
                  )}
                </div>
                {history.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--muted-light)', fontStyle: 'italic' }}>Chưa có lịch sử tìm kiếm</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {history.map(item => (
                      <div
                        key={item}
                        onClick={() => setQuery(item)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 12px', cursor: 'pointer',
                          transition: 'background .15s', borderRadius: 2,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--cream-dark)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <i className="bi bi-clock-history" style={{ fontSize: 13, color: 'var(--muted-light)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13.5, flex: 1 }}>{item}</span>
                        <button
                          onClick={(e) => removeHistoryItem(item, e)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-light)', fontSize: 12, padding: 2 }}
                        >
                          <i className="bi bi-x" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggestions */}
              <div>
                <div style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
                  Gợi ý tìm kiếm
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      style={{
                        padding: '7px 16px', border: '1px solid var(--border)',
                        background: 'transparent', cursor: 'pointer',
                        fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ink)',
                        transition: 'all .2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--warm)'; e.currentTarget.style.color = 'var(--warm)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink)'; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Trending */}
                <div style={{ marginTop: 28 }}>
                  <div style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
                    Trending
                  </div>
                  {PRODUCTS.sort((a, b) => b.reviews - a.reviews).slice(0, 3).map((p, i) => (
                    <div
                      key={p.id}
                      onClick={() => openProduct(p)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--warm)', width: 24 }}>{i + 1}</span>
                      <div style={{ width: 36, height: 44, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`bi ${p.icon}`} style={{ fontSize: 14, color: 'rgba(14,14,14,.25)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <Stars rating={p.rating} size={10} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, flexShrink: 0 }}>{fmt(p.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>
    </>
  );
}

/* ── Highlight matching text ── */
function HighlightText({ text, query }) {
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--warm-light)', color: 'var(--ink)', padding: 0 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}