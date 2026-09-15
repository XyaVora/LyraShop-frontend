// src/components/SearchModal.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { productApi, categoryApi, searchHistoryApi } from '../services/api';
import { normalizeProduct, fmt } from '../data/products';
import '../styles/navigation.css';

const MAX_HISTORY = 6;

const QUICK_TAGS = [
  { label: 'Tất cả', q: '' },
  { label: 'Váy & Đầm', q: 'đầm' },
  { label: 'Áo sơ mi lụa', q: 'sơ mi' },
  { label: 'Áo khoác Blazer', q: 'blazer' },
  { label: 'Quần âu may đo', q: 'quần' },
  { label: 'Phụ kiện', q: 'phụ kiện' },
];

export default function SearchModal({ open, onClose }) {
  const { navigate, isLoggedIn } = useApp();
  const [query, setQuery]                 = useState('');
  const [activeTag, setActiveTag]         = useState('');
  const [results, setResults]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [trending, setTrending]           = useState([]);
  const [categoryNames, setCategoryNames] = useState([]);
  const [history, setHistory]             = useState(() => {
    try { return JSON.parse(localStorage.getItem('lyra_search_history') || '[]'); }
    catch { return []; }
  });
  const [activeIdx, setActiveIdx]         = useState(-1);
  const inputRef = useRef(null);

  // Focus input when modal opens & load trending + categories
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery('');
      setActiveTag('');
      setResults([]);
      setActiveIdx(-1);

      productApi.featured(4)
        .then(res => {
          const list = (res.data || []).map((p, idx) => normalizeProduct(p, idx));
          setTrending(list);
        })
        .catch(() => {});

      if (isLoggedIn) {
        searchHistoryApi.list()
          .then(({ data }) => setHistory((data || []).map(item => item.query).slice(0, MAX_HISTORY)))
          .catch(() => {});
      }

      categoryApi.list()
        .then(res => {
          const names = (res.data || []).map(c => c.name);
          setCategoryNames(names);
        })
        .catch(() => {});
    }
  }, [open, isLoggedIn]);

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
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
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
    if (isLoggedIn) searchHistoryApi.add(trimmed).catch(() => {});
    else try { localStorage.setItem('lyra_search_history', JSON.stringify(updated)); } catch {}
  }, [history, isLoggedIn]);

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
    if (isLoggedIn) searchHistoryApi.clear().catch(() => {});
    else try { localStorage.removeItem('lyra_search_history'); } catch {}
  };

  const removeHistoryItem = (item, e) => {
    e.stopPropagation();
    const updated = history.filter(h => h !== item);
    setHistory(updated);
    if (isLoggedIn) searchHistoryApi.remove(item).catch(() => {});
    else try { localStorage.setItem('lyra_search_history', JSON.stringify(updated)); } catch {}
  };

  const handleSelectQuickTag = (tag) => {
    setActiveTag(tag.label);
    setQuery(tag.q);
    inputRef.current?.focus();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="spotlight-overlay" onClick={onClose} />

      {/* Modal Container */}
      <div className="spotlight-modal">
        {/* Search Input Bar */}
        <div className="spotlight-input-row">
          <i className="bi bi-search spotlight-search-icon" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setActiveTag('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm thiết kế, bộ sưu tập, chất liệu lụa..."
            className="spotlight-input"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setActiveTag(''); inputRef.current?.focus(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 8, fontSize: 16 }}
              title="Xóa tìm kiếm"
            >
              <i className="bi bi-x-circle-fill" />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink)', fontSize: 12.5, fontFamily: 'var(--font-sans)',
              letterSpacing: '.1em', textTransform: 'uppercase',
              marginLeft: 20, padding: '8px 14px',
              borderLeft: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            Đóng <span style={{ opacity: .4, fontSize: 11 }}>(ESC)</span>
          </button>
        </div>

        {/* Quick Search Chips / Tags Bar */}
        <div className="spotlight-quick-chips">
          <span className="spotlight-chip-label">Xu Hướng:</span>
          {QUICK_TAGS.map(tag => (
            <button
              key={tag.label}
              className={`spotlight-chip-btn ${activeTag === tag.label ? 'active' : ''}`}
              onClick={() => handleSelectQuickTag(tag)}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {/* Modal Main Content */}
        <div style={{ padding: '32px 48px 48px', maxWidth: 1200, margin: '0 auto' }}>
          {query ? (
            <div>
              {/* Header result row */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 20,
              }}>
                <span style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
                  {loading ? 'Đang tìm kiếm...' : `Kết quả tìm kiếm (${results.length})`}
                </span>
                {results.length > 0 && (
                  <button
                    onClick={() => goSearchPage(query)}
                    style={{
                      background: 'none', border: 'none', fontSize: 12.5, color: 'var(--warm)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500
                    }}
                  >
                    Xem tất cả kết quả trên trang tìm kiếm <i className="bi bi-arrow-right" />
                  </button>
                )}
              </div>

              {/* Results Grid or Empty State */}
              {results.length === 0 && !loading ? (
                <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--muted)' }}>
                  <i className="bi bi-search" style={{ fontSize: 36, display: 'block', marginBottom: 14, opacity: .4 }} />
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink)', marginBottom: 6 }}>
                    Không tìm thấy sản phẩm cho "{query}"
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 420, margin: '0 auto' }}>
                    Quý khách có thể thử tìm kiếm với từ khóa khác như <em>"đầm"</em>, <em>"lụa"</em>, <em>"blazer"</em> hoặc duyệt qua danh mục thiết kế.
                  </p>
                </div>
              ) : (
                <div className="spotlight-results-grid">
                  {results.map((p, i) => (
                    <div
                      key={p.id}
                      onClick={() => openProduct(p)}
                      className={`spotlight-product-card ${activeIdx === i ? 'focused' : ''}`}
                      onMouseEnter={() => setActiveIdx(i)}
                    >
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="spotlight-product-thumb" />
                      ) : (
                        <div
                          className="spotlight-product-thumb"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#F0EAE1',
                            color: 'var(--warm)',
                            fontSize: 20,
                          }}
                        >
                          <i className={`bi ${p.icon || 'bi-bag'}`} />
                        </div>
                      )}
                      <div className="spotlight-product-info">
                        <div className="spotlight-product-name">{p.name}</div>
                        <div className="spotlight-product-brand">{p.brand || 'LYRA Atelier'}</div>
                        <div className="spotlight-product-price">{fmt(p.price)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Default View: Recent Searches + Trending Picks */
            <div className="row g-5">
              {/* Left Column: Recent Searches */}
              {history.length > 0 && (
                <div className="col-md-5">
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 16,
                  }}>
                    <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--warm)', fontWeight: 600 }}>
                      Lịch Sử Tìm Kiếm
                    </span>
                    <button
                      onClick={clearHistory}
                      style={{ background: 'none', border: 'none', fontSize: 11.5, color: 'var(--muted)', cursor: 'pointer' }}
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {history.map(item => (
                      <div
                        key={item}
                        onClick={() => setQuery(item)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 14px', background: '#FFFFFF', border: '1px solid var(--border)',
                          cursor: 'pointer', fontSize: 13.5, transition: 'all .15s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--warm)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <i className="bi bi-clock-history text-secondary" style={{ fontSize: 13 }} />
                          {item}
                        </span>
                        <i
                          className="bi bi-x text-muted"
                          onClick={(e) => removeHistoryItem(item, e)}
                          style={{ fontSize: 18 }}
                          title="Xóa từ khóa"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Right Column: Featured Categories & Trending Products */}
              <div className={history.length > 0 ? 'col-md-7' : 'col-12'}>
                {categoryNames.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--warm)', fontWeight: 600, marginBottom: 14 }}>
                      Danh Mục Nổi Bật
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {categoryNames.map(name => (
                        <button
                          key={name}
                          onClick={() => setQuery(name)}
                          style={{
                            padding: '8px 18px', border: '1px solid var(--border)',
                            background: '#FFFFFF', cursor: 'pointer',
                            fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--ink)',
                            transition: 'all .2s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--warm)'; e.currentTarget.style.color = 'var(--warm)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink)'; }}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending top picks */}
                {trending.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--warm)', fontWeight: 600, marginBottom: 14 }}>
                      Gợi Ý Thịnh Hành
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {trending.slice(0, 3).map((p, i) => (
                        <div
                          key={p.id}
                          onClick={() => openProduct(p)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 16,
                            padding: '12px 16px', background: '#FFFFFF', border: '1px solid var(--border)',
                            cursor: 'pointer', transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--warm)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                        >
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--warm)', width: 20, textAlign: 'center', fontWeight: 600 }}>
                            {i + 1}
                          </span>
                          {p.image ? (
                            <img src={p.image} alt={p.name} style={{ width: 44, height: 56, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 44, height: 56, background: '#F0EAE1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warm)' }}>
                              <i className={`bi ${p.icon || 'bi-bag'}`} style={{ fontSize: 18 }} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                              {p.brand || 'LYRA Atelier'}
                            </div>
                          </div>
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, flexShrink: 0, fontWeight: 500 }}>
                            {fmt(p.price)}
                          </span>
                        </div>
                      ))}
                    </div>
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
