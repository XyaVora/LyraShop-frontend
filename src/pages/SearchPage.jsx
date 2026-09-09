// src/pages/SearchPage.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { productApi, categoryApi } from '../services/api';
import { normalizeProduct, normalizeCategory } from '../data/products';
import { ProductCard, Footer } from '../components/index.jsx';

export default function SearchPage() {
  const { navigate, searchQuery } = useApp();
  const [sortBy, setSortBy]       = useState('createdAt,desc');
  const [activeCatSlug, setActiveCatSlug] = useState('all');
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Load categories for filter tabs & search suggestions
  useEffect(() => {
    categoryApi.list()
      .then(res => setCategories((res.data || []).map(normalizeCategory)))
      .catch(() => {});
  }, []);

  // Search products from backend
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = {
      keyword: searchQuery || undefined,
      category: activeCatSlug !== 'all' ? activeCatSlug : undefined,
      sort: sortBy,
      size: 40,
    };

    productApi.list(params)
      .then(res => {
        if (cancelled) return;
        const list = (res.data?.content || []).map((p, idx) => normalizeProduct(p, idx));
        setProducts(list);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [searchQuery, activeCatSlug, sortBy]);

  return (
    <div>
      {/* Header */}
      <div data-reveal style={{ padding: '48px 0 32px', borderBottom: '1px solid var(--border)' }}>
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
            Tìm thấy <strong style={{ color: 'var(--ink)' }}>{products.length}</strong> sản phẩm
            {searchQuery && ` cho "${searchQuery}"`}
          </p>
        </div>
      </div>

      <div data-reveal style={{ padding: '36px 0 72px' }}>
        <div className="container-fluid px-4 px-lg-5">

          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            {/* Category tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveCatSlug('all')}
                style={{
                  padding: '7px 16px', fontSize: 12.5,
                  border: '1.5px solid',
                  borderColor: activeCatSlug === 'all' ? 'var(--ink)' : 'var(--border)',
                  background: activeCatSlug === 'all' ? 'var(--ink)' : 'transparent',
                  color: activeCatSlug === 'all' ? 'var(--cream)' : 'var(--ink)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all .2s',
                }}
              >
                Tất cả
              </button>
              {categories.map(cat => (
                <button key={cat.id}
                  onClick={() => setActiveCatSlug(cat.slug)}
                  style={{
                    padding: '7px 16px', fontSize: 12.5,
                    border: '1.5px solid',
                    borderColor: activeCatSlug === cat.slug ? 'var(--ink)' : 'var(--border)',
                    background: activeCatSlug === cat.slug ? 'var(--ink)' : 'transparent',
                    color: activeCatSlug === cat.slug ? 'var(--cream)' : 'var(--ink)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all .2s',
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="createdAt,desc">Mới nhất</option>
              <option value="price,asc">Giá tăng dần</option>
              <option value="price,desc">Giá giảm dần</option>
              <option value="name,asc">Tên A-Z</option>
            </select>
          </div>

          {/* Results grid */}
          {loading ? (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="product-card skeleton" style={{ height: 320 }} />
              ))}
            </div>
          ) : products.length === 0 ? (
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
                <button className="btn-lyra" onClick={() => navigate('shop')}>Xem tất cả sản phẩm</button>
                <button className="btn-outline-lyra" onClick={() => navigate('home')}>Về trang chủ</button>
              </div>
            </div>
          ) : (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {products.map((p, i) => <ProductCard key={p.id} product={p} delay={i % 4} />)}
            </div>
          )}

          {/* Related searches from backend categories */}
          {categories.length > 0 && (
            <div style={{ marginTop: 56, paddingTop: 40, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
                Tìm kiếm theo danh mục
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {categories.map(c => (
                  <button key={c.id}
                    onClick={() => navigate('search', { query: c.name })}
                    style={{
                      padding: '7px 16px', border: '1px solid var(--border)',
                      background: 'transparent', cursor: 'pointer', fontSize: 13,
                      fontFamily: 'var(--font-sans)', color: 'var(--ink)', transition: 'all .2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--warm)'; e.currentTarget.style.color = 'var(--warm)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink)'; }}
                  >
                    {c.name}
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