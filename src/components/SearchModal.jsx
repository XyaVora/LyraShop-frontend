// src/components/SearchModal.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { productApi, categoryApi } from '../services/api';
import { normalizeProduct, fmt } from '../data/products';
import { Stars } from './index.jsx';

const MAX_HISTORY = 6;

export default function SearchModal({ open, onClose }) {
  const { navigate } = useApp();
  const { addToCart } = useCart();
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [trending, setTrending]     = useState([]);
  const [categoryNames, setCategoryNames] = useState([]);
  const [history, setHistory]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('lyra_search_history') || '[]'); }
    catch { return []; }
  });
  const [activeIdx, setActiveIdx]   = useState(-1);
  const inputRef = useRef(null);

  // Focus input when modal opens & load trending + categories
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery('');
      setResults([]);
      setActiveIdx(-1);

      productApi.list({ size: 4, sort: 'createdAt,desc' })
        .then(res => {
          const list = (res.data?.content || []).map((p, idx) => normalizeProduct(p, idx));
          setTrending(list);
        })
        .catch(() => {});

      categoryApi.list()
        .then(res => {
          const names = (res.data || []).map(c => c.name);
          setCategoryNames(names);
        })
        .catch(() => {});
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Live search debounced
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      productApi.list({ keyword: q, size: 8 })
        .then(res => {
          const list = (res.data?.content || []).map((p, idx) => normalizeProduct(p, idx));
          setResults(list);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
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
    try { localStorage.setItem('lyra_search_history', JSON.stringify(updated)); } catch {}
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
    try { localStorage.removeItem('lyra_search_history'); } catch {}
  };

  const removeHistoryItem = (item, e) => {
    e.stopPropagation();
    const updated = history.filter(h => h !== item);
    setHistory(updated);
    try { localStorage.setItem('lyra_search_history', JSON.stringify(updated)); } catch {}
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="search-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="search-panel">
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
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm sản phẩm, danh mục..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 18, fontFamily: 'var(--font-sans)',
              background: 'transparent', color: 'var(--ink)',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 8 }}
            >
              <i className="bi bi-x-lg" />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink)', fontSize: 13, fontFamily: 'var(--font-sans)',
              letterSpacing: '.08em', textTransform: 'uppercase',
              marginLeft: 16, padding: '6px 12px',
              borderLeft: '1px solid var(--border)',
            }}
          >
            Đóng <span style={{ opacity: .4, fontSize: 11 }}>(ESC)</span>
          </button>
        </div>

        {/* Content area */}
        <div style={{ padding: '32px 40px 40px', maxWidth: 1100, margin: '0 auto' }}>

          {/* If query has input */}
          {query ? (
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 20,
              }}>
                <span style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {loading ? 'Đang tìm kiếm...' : `Kết quả tìm kiếm (${results.length})`}
                </span>
                {results.length > 0 && (
                  <a
                    onClick={() => goSearchPage(query)}
                    style={{ fontSize: 12.5, color: 'var(--warm)', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Xem tất cả kết quả →
                  </a>
                )}
              </div>

              {results.length === 0 && !loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                  <i className="bi bi-search" style={{ fontSize: 36, display: 'block', marginBottom: 12, opacity: .4 }} />
                  <div style={{ fontSize: 15 }}>Không tìm thấy sản phẩm cho "{query}"</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                  {results.map((p, i) => (
                    <div
                      key={p.id}
                      onClick={() => openProduct(p)}
                      style={{
                        padding: 12, border: '1px solid',
                        borderColor: activeIdx === i ? 'var(--ink)' : 'var(--border)',
                        background: activeIdx === i ? '#fff' : 'transparent',
                        cursor: 'pointer', transition: 'all .15s',
                        display: 'flex', gap: 12, alignItems: 'center',
                      }}
                      onMouseEnter={() => setActiveIdx(i)}
                    >
                      <div style={{
                        width: 48, height: 56, background: p.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <i className={`bi ${p.icon}`} style={{ fontSize: 20, color: 'rgba(14,14,14,.25)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 500,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          marginBottom: 3,
                        }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                          {p.brand}
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink)' }}>
                          {fmt(p.price)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Default: Suggestions from backend categories & History */
            <div className="row g-4">
              {/* Left: Recent searches */}
              {history.length > 0 && (
                <div className="col-md-5">
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 14,
                  }}>
                    <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                      Tìm kiếm gần đây
                    </span>
                    <button
                      onClick={clearHistory}
                      style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--muted)', cursor: 'pointer' }}
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {history.map(item => (
                      <div
                        key={item}
                        onClick={() => setQuery(item)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 12px', borderRadius: 4, cursor: 'pointer',
                          fontSize: 13.5, transition: 'background .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,14,14,.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <i className="bi bi-clock-history" style={{ color: 'var(--muted)', fontSize: 12 }} />
                          {item}
                        </span>
                        <i
                          className="bi bi-x"
                          onClick={(e) => removeHistoryItem(item, e)}
                          style={{ color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions from backend categories */}
              <div className={history.length > 0 ? 'col-md-7' : 'col-12'}>
                {categoryNames.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
                      Danh mục nổi bật
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {categoryNames.map(name => (
                        <button
                          key={name}
                          onClick={() => setQuery(name)}
                          style={{
                            padding: '7px 16px', border: '1px solid var(--border)',
                            background: 'transparent', cursor: 'pointer',
                            fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ink)',
                            transition: 'all .2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--warm)'; e.currentTarget.style.color = 'var(--warm)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink)'; }}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Trending */}
                {trending.length > 0 && (
                  <div style={{ marginTop: 28 }}>
                    <div style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
                      Sản phẩm mới
                    </div>
                    {trending.slice(0, 3).map((p, i) => (
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
                        </div>
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, flexShrink: 0 }}>{fmt(p.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}