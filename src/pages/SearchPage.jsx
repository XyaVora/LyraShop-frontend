// src/pages/SearchPage.jsx
import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PRODUCTS } from '../data/products';
import { ProductCard, Footer } from '../components/index.jsx';

export default function SearchPage() {
  const { navigate, searchQuery } = useApp();
  const [sortBy, setSortBy]     = useState('relevant');
  const [activeCat, setActiveCat] = useState('all');

  const results = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return PRODUCTS;
    return PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.cat.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const cats = ['all', ...new Set(results.map(p => p.cat))];

  const filtered = useMemo(() => {
    let list = activeCat === 'all' ? [...results] : results.filter(p => p.cat === activeCat);
    switch (sortBy) {
      case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating':     list.sort((a, b) => b.rating - a.rating); break;
      case 'popular':    list.sort((a, b) => b.reviews - a.reviews); break;
    }
    return list;
  }, [results, activeCat, sortBy]);

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '48px 0 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Kết quả tìm kiếm
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(30px,4vw,48px)', fontWeight: 300, marginBottom: 8 }}>
            {searchQuery
              ? <><em style={{ fontStyle: 'italic', color: 'var(--warm)' }}>"{searchQuery}"</em></>
              : 'Tất cả sản phẩm'
            }
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Tìm thấy <strong style={{ color: 'var(--ink)' }}>{results.length}</strong> sản phẩm
            {searchQuery && ` cho "${searchQuery}"`}
          </p>
        </div>
      </div>

      <div style={{ padding: '36px 0 72px' }}>
        <div className="container-fluid px-4 px-lg-5">

          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            {/* Category tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {cats.map(cat => (
                <button key={cat}
                  onClick={() => setActiveCat(cat)}
                  style={{
                    padding: '7px 16px', fontSize: 12.5,
                    border: '1.5px solid',
                    borderColor: activeCat === cat ? 'var(--ink)' : 'var(--border)',
                    background: activeCat === cat ? 'var(--ink)' : 'transparent',
                    color: activeCat === cat ? 'var(--cream)' : 'var(--ink)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all .2s',
                  }}
                >
                  {{ all: 'Tất cả' }[cat] || cat}
                  <span style={{
                    marginLeft: 6, fontSize: 10.5,
                    color: activeCat === cat ? 'rgba(247,244,239,.6)' : 'var(--muted)',
                  }}>
                    {cat === 'all' ? results.length : results.filter(p => p.cat === cat).length}
                  </span>
                </button>
              ))}
            </div>
            {/* Sort */}
            <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="relevant">Liên quan nhất</option>
              <option value="price-asc">Giá tăng dần</option>
              <option value="price-desc">Giá giảm dần</option>
              <option value="rating">Đánh giá cao nhất</option>
              <option value="popular">Bán chạy nhất</option>
            </select>
          </div>

          {/* Results grid */}
          {filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              <i className="bi bi-search" style={{ fontSize: 56, color: 'var(--border)' }} />
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 300 }}>Không tìm thấy kết quả</h2>
              <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 360, lineHeight: 1.7 }}>
                Không có sản phẩm nào khớp với từ khóa <strong>"{searchQuery}"</strong>. Hãy thử từ khóa khác.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn-maison" onClick={() => navigate('shop')}>Xem tất cả sản phẩm</button>
                <button className="btn-outline-maison" onClick={() => navigate('home')}>Về trang chủ</button>
              </div>
            </div>
          ) : (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {filtered.map((p, i) => <ProductCard key={p.id} product={p} delay={i % 4} />)}
            </div>
          )}

          {/* Related searches */}
          {results.length > 0 && (
            <div style={{ marginTop: 56, paddingTop: 40, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
                Có thể bạn cũng tìm
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Áo lụa', 'Giày da', 'Váy midi', 'Blazer', 'Túi xách', 'Quần jean', 'Phụ kiện', 'Sale'].map(s => (
                  <button key={s}
                    onClick={() => navigate('search', { query: s })}
                    style={{
                      padding: '7px 16px', border: '1px solid var(--border)',
                      background: 'transparent', cursor: 'pointer', fontSize: 13,
                      fontFamily: 'var(--font-sans)', color: 'var(--ink)', transition: 'all .2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--warm)'; e.currentTarget.style.color = 'var(--warm)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink)'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer navigate={navigate} />
    </div>
  );
}