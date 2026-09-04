// src/pages/ShopPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { productApi, categoryApi } from '../services/api';
import { normalizeProduct, normalizeCategory } from '../data/products';
import { ProductCard } from '../components/index.jsx';
import { Footer } from '../components/index.jsx';
import { useApp } from '../context/AppContext';

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Mới nhất' },
  { value: 'price,asc',      label: 'Giá: Thấp → Cao' },
  { value: 'price,desc',     label: 'Giá: Cao → Thấp' },
  { value: 'name,asc',       label: 'Tên A → Z' },
];

const PAGE_SIZE = 9;

export default function ShopPage() {
  const { navigate } = useApp();

  // Filter state
  const [selectedCatSlug, setSelectedCatSlug] = useState('');
  const [minPrice, setMinPrice]               = useState('');
  const [maxPrice, setMaxPrice]               = useState('');
  const [sortBy, setSortBy]                   = useState('createdAt,desc');
  const [listView, setListView]               = useState(false);
  const [page, setPage]                       = useState(0); // 0-indexed (Spring)

  // Data state
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const [error, setError]         = useState(null);

  // Debounce price input
  const priceTimer = useRef(null);

  // Load categories once
  useEffect(() => {
    categoryApi.list()
      .then(res => setCategories((res.data || []).map(normalizeCategory)))
      .catch(() => {})
      .finally(() => setCatLoading(false));
  }, []);

  // Load products whenever filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = {
      sort: sortBy,
      page,
      size: PAGE_SIZE,
    };
    if (selectedCatSlug) params.category = selectedCatSlug;
    if (minPrice) params.minPrice = minPrice.replace(/\D/g, '');
    if (maxPrice) params.maxPrice = maxPrice.replace(/\D/g, '');

    productApi.list(params)
      .then(res => {
        if (cancelled) return;
        const data = res.data;
        setProducts((data.content || []).map((p, i) => normalizeProduct(p, i + page * PAGE_SIZE)));
        setTotalPages(data.totalPages || 0);
        setTotalElements(data.totalElements || 0);
      })
      .catch(err => {
        if (!cancelled) setError('Không thể tải sản phẩm. Vui lòng thử lại.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedCatSlug, minPrice, maxPrice, sortBy, page]);

  const handlePriceChange = (setter) => (e) => {
    const val = e.target.value;
    setter(val);
    clearTimeout(priceTimer.current);
    priceTimer.current = setTimeout(() => setPage(0), 600);
  };

  const resetFilters = () => {
    setSelectedCatSlug(''); setMinPrice(''); setMaxPrice('');
    setSortBy('createdAt,desc'); setPage(0);
  };

  return (
    <div>
      {/* Header */}
      <div className="shop-header-bar">
        <div className="container-fluid px-4 px-lg-5">
          <h1 className="shop-page-title">Tất cả sản phẩm</h1>
          <p className="shop-meta-text">
            {loading ? 'Đang tải...' : `Hiển thị ${products.length} / ${totalElements} sản phẩm`}
          </p>
        </div>
      </div>

      <div className="shop-layout">
        {/* Sidebar */}
        <aside className="shop-sidebar">
          {/* Category */}
          <div className="filter-group">
            <div className="filter-group-title">Danh mục</div>
            <div className="filter-check-item">
              <input type="radio" id="cat-all" name="category" checked={selectedCatSlug === ''}
                onChange={() => { setSelectedCatSlug(''); setPage(0); }} />
              <label htmlFor="cat-all">Tất cả</label>
            </div>
            {catLoading ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', padding: '4px 0' }}>Đang tải...</div>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="filter-check-item">
                  <input type="radio" id={`cat-${cat.slug}`} name="category"
                    checked={selectedCatSlug === cat.slug}
                    onChange={() => { setSelectedCatSlug(cat.slug); setPage(0); }} />
                  <label htmlFor={`cat-${cat.slug}`}>{cat.name}</label>
                </div>
              ))
            )}
          </div>

          {/* Price */}
          <div className="filter-group">
            <div className="filter-group-title">Khoảng giá (VNĐ)</div>
            <div className="price-inputs">
              <input className="price-input-field" placeholder="Từ" value={minPrice}
                onChange={handlePriceChange(setMinPrice)} />
              <input className="price-input-field" placeholder="Đến" value={maxPrice}
                onChange={handlePriceChange(setMaxPrice)} />
            </div>
          </div>

          <button className="btn-maison w-100 justify-content-center" onClick={resetFilters}>
            <i className="bi bi-arrow-counterclockwise" /> Xóa bộ lọc
          </button>
        </aside>

        {/* Main */}
        <main className="shop-main-area">
          <div className="shop-toolbar">
            <select className="sort-select" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(0); }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="view-toggle">
              <button className={`view-btn${!listView ? ' active' : ''}`} onClick={() => setListView(false)}>
                <i className="bi bi-grid-3x3-gap" />
              </button>
              <button className={`view-btn${listView ? ' active' : ''}`} onClick={() => setListView(true)}>
                <i className="bi bi-list-ul" />
              </button>
            </div>
          </div>

          {error ? (
            <div className="cart-empty-state">
              <i className="bi bi-exclamation-circle" />
              <div className="cart-empty-title">{error}</div>
              <button className="btn-maison mt-3" onClick={resetFilters}>Thử lại</button>
            </div>
          ) : loading ? (
            <div className={`products-grid${listView ? ' list-view' : ''}`}>
              {[...Array(PAGE_SIZE)].map((_, i) => (
                <div key={i} className="product-card skeleton" style={{ height: 320 }} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="cart-empty-state">
              <i className="bi bi-search" />
              <div className="cart-empty-title">Không tìm thấy sản phẩm</div>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Thử thay đổi bộ lọc để xem thêm sản phẩm.</p>
              <button className="btn-maison mt-3" onClick={resetFilters}>Xóa bộ lọc</button>
            </div>
          ) : (
            <div className={`products-grid${listView ? ' list-view' : ''}`}>
              {products.map((p, i) => <ProductCard key={p.id} product={p} delay={i} />)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="maison-pagination">
              <button className="page-num-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                <i className="bi bi-chevron-left" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i).map(n => (
                <button key={n} className={`page-num-btn${page === n ? ' active' : ''}`} onClick={() => setPage(n)}>
                  {n + 1}
                </button>
              ))}
              <button className="page-num-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          )}
        </main>
      </div>

      <Footer navigate={navigate} />
    </div>
  );
}