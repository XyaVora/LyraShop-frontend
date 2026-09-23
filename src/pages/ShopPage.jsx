// src/pages/ShopPage.jsx
import { useState, useEffect, useRef } from 'react';
import { productApi, categoryApi } from '../services/api';
import { normalizeProduct, normalizeCategory, fmt } from '../data/products';
import { ProductCard, Footer } from '../components/index.jsx';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import '../styles/shop.css';

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Mới nhất (BST 2026)' },
  { value: 'price,asc',      label: 'Giá: Thấp → Cao' },
  { value: 'price,desc',     label: 'Giá: Cao → Thấp' },
  { value: 'name,asc',       label: 'Tên: A → Z' },
];

const PRICE_PRESETS = [
  { id: 'all',         label: 'Tất cả mức giá', min: '',        max: '' },
  { id: 'under-500',   label: 'Dưới 500.000₫',  min: '',        max: '500000' },
  { id: '500-1000',    label: '500k - 1.000.000₫', min: '500000', max: '1000000' },
  { id: '1000-2000',   label: '1tr - 2.000.000₫', min: '1000000', max: '2000000' },
  { id: 'above-2000',  label: 'Trên 2.000.000₫', min: '2000000', max: '' },
];

const COLOR_HEX = {
  trắng: '#FAF7F0', đen: '#1A1815', be: '#D9CEBF', rêu: '#485743',
  xanh: '#1B4D72', nâu: '#6E472A', bạc: '#D4D6D9', đỏ: '#9B2C2C', hồng: '#D9A6B2',
};

function facetColorHex(name) {
  const normalized = String(name || '').toLowerCase();
  const key = Object.keys(COLOR_HEX).find(value => normalized.includes(value));
  return key ? COLOR_HEX[key] : '#B9B0A5';
}

const PAGE_SIZE = 12;

export default function ShopPage() {
  const { navigate } = useApp();
  const { addToCart, showToast } = useCart();

  // Filters state
  const [selectedCatSlug, setSelectedCatSlug]         = useState(() => new URLSearchParams(window.location.search).get('cat') || '');
  const [selectedPricePreset, setSelectedPricePreset] = useState('all');
  const [minPrice, setMinPrice]                       = useState('');
  const [maxPrice, setMaxPrice]                       = useState('');
  const [selectedColor, setSelectedColor]             = useState('');
  const [selectedSize, setSelectedSize]               = useState('');
  const [sortBy, setSortBy]                           = useState('createdAt,desc');
  const [gridView, setGridView]                       = useState('grid-4'); // 'grid-4' | 'grid-3' | 'list'
  const [page, setPage]                               = useState(0);

  // Data state
  const [products, setProducts]           = useState([]);
  const [categories, setCategories]       = useState([]);
  const [filterColors, setFilterColors]   = useState([]);
  const [filterSizes, setFilterSizes]     = useState([]);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading]             = useState(true);
  const [catLoading, setCatLoading]       = useState(true);
  const [error, setError]                 = useState(null);

  // Mobile Drawer & Quick View
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [qvSize, setQvSize]                     = useState('');
  const [qvQty, setQvQty]                       = useState(1);

  const priceTimer = useRef(null);

  // Load categories
  useEffect(() => {
    Promise.all([categoryApi.list(), productApi.facets()])
      .then(([categoryResponse, facetResponse]) => {
        setCategories((categoryResponse.data || []).map(normalizeCategory));
        setFilterColors(facetResponse.data?.colors || []);
        setFilterSizes(facetResponse.data?.sizes || []);
      })
      .catch(() => {})
      .finally(() => setCatLoading(false));
  }, []);

  // Sync category from URL parameter
  useEffect(() => {
    const handleLocationChange = () => {
      const catParam = new URLSearchParams(window.location.search).get('cat') || '';
      setSelectedCatSlug(catParam);
      setPage(0);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Fetch products
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
    if (selectedColor) params.color = selectedColor;
    if (selectedSize) params.variantSize = selectedSize;

    productApi.list(params)
      .then(res => {
        if (cancelled) return;
        const data = res.data;
        const items = (data.content || []).map((p, i) => normalizeProduct(p, i + page * PAGE_SIZE));

        setProducts(items);
        setTotalPages(data.totalPages || 0);
        setTotalElements(data.totalElements || 0);
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tải sản phẩm. Vui lòng thử lại.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedCatSlug, minPrice, maxPrice, selectedColor, selectedSize, sortBy, page]);

  // Handle Preset Price Change
  const handlePresetPrice = (preset) => {
    setSelectedPricePreset(preset.id);
    setMinPrice(preset.min);
    setMaxPrice(preset.max);
    setPage(0);
  };

  // Handle Custom Price Change
  const handlePriceInput = (setter) => (e) => {
    setSelectedPricePreset('custom');
    setter(e.target.value);
    clearTimeout(priceTimer.current);
    priceTimer.current = setTimeout(() => setPage(0), 600);
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedCatSlug('');
    setSelectedPricePreset('all');
    setMinPrice('');
    setMaxPrice('');
    setSelectedColor('');
    setSelectedSize('');
    setSortBy('createdAt,desc');
    setPage(0);
  };

  // Open Quick View
  const handleOpenQuickView = (product) => {
    setQuickViewProduct(product);
    const firstSize = (product.variants || [])[0]?.size || '';
    setQvSize(firstSize);
    setQvQty(1);
  };

  const handleQuickAddToCart = () => {
    if (!quickViewProduct) return;
    addToCart(quickViewProduct, qvQty, qvSize || null);
    showToast(`Đã thêm ${quickViewProduct.name} vào giỏ hàng!`, 'success');
    setQuickViewProduct(null);
  };

  // Active filters list
  const activeCategoryObj = categories.find(c => c.slug === selectedCatSlug);
  const hasActiveFilters = Boolean(selectedCatSlug || minPrice || maxPrice || selectedColor || selectedSize);

  return (
    <>
      <div className="shop-root">
      {/* ── 1. EDITORIAL HEADER ── */}
      <section className="shop-editorial-header">
        <div className="container-fluid px-4 px-lg-5">
          <div className="shop-header-inner">
            <div>
              <div className="shop-eyebrow">ATELIER READY-TO-WEAR • BỘ SƯU TẬP 2026</div>
              <h1 className="shop-main-title">
                Cửa hàng<br /><em>tuyển chọn</em>
              </h1>
              <p className="shop-header-desc">
                Khám phá các thiết kế may đo đương đại từ lụa tơ tằm Bảo Lộc, linen hữu cơ Ý và da thuộc thủ công.
                Từng sản phẩm mang đậm tinh thần tối giản, thanh lịch và bền vững với thời gian.
              </p>
            </div>
            <div className="shop-count-badge">
              Hiển thị {products.length} / {totalElements} thiết kế
            </div>
          </div>
        </div>
      </section>

      <div className="container-fluid px-4 px-lg-5">
        {/* ── 2. ACTIVE FILTER CHIPS BAR ── */}
        {hasActiveFilters && (
          <div className="shop-active-chips-bar">
            <span className="active-chip-label">Đang lọc theo:</span>

            {activeCategoryObj && (
              <span className="active-chip-tag" onClick={() => setSelectedCatSlug('')}>
                Danh mục: {activeCategoryObj.name} <i className="bi bi-x-lg" />
              </span>
            )}

            {(minPrice || maxPrice) && (
              <span className="active-chip-tag" onClick={() => { setMinPrice(''); setMaxPrice(''); setSelectedPricePreset('all'); }}>
                Giá: {minPrice ? fmt(minPrice) : '0đ'} – {maxPrice ? fmt(maxPrice) : 'Tất cả'} <i className="bi bi-x-lg" />
              </span>
            )}

            {selectedColor && (
              <span className="active-chip-tag" onClick={() => setSelectedColor('')}>
                Màu: {selectedColor} <i className="bi bi-x-lg" />
              </span>
            )}

            {selectedSize && (
              <span className="active-chip-tag" onClick={() => setSelectedSize('')}>
                Size: {selectedSize} <i className="bi bi-x-lg" />
              </span>
            )}

            <button className="active-chip-clear-all" onClick={resetFilters}>
              Xóa tất cả bộ lọc ↺
            </button>
          </div>
        )}

        {/* ── 3. MAIN LAYOUT (SIDEBAR + CONTENT) ── */}
        <div className="shop-layout">
          {/* Desktop Filter Sidebar */}
          <aside className="shop-sidebar">
            {/* Category Filter */}
            <div className="shop-filter-group">
              <div className="shop-filter-title">
                <span>Danh Mục Thiết Kế</span>
                <i className="bi bi-grid" style={{ color: 'var(--warm)' }} />
              </div>
              <div className="shop-cat-list">
                <button
                  className={`shop-cat-btn ${selectedCatSlug === '' ? 'active' : ''}`}
                  onClick={() => { setSelectedCatSlug(''); setPage(0); }}
                >
                  <span>Tất cả danh mục</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>({totalElements})</span>
                </button>
                {catLoading ? (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Đang tải danh mục...</div>
                ) : (
                  categories.map(cat => (
                    <button
                      key={cat.id}
                      className={`shop-cat-btn ${selectedCatSlug === cat.slug ? 'active' : ''}`}
                      onClick={() => { setSelectedCatSlug(cat.slug); setPage(0); }}
                    >
                      <span>{cat.name}</span>
                      <i className="bi bi-chevron-right" style={{ fontSize: 10, opacity: 0.5 }} />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Price Presets & Range */}
            <div className="shop-filter-group">
              <div className="shop-filter-title">
                <span>Khoảng Giá</span>
                <i className="bi bi-cash-stack" style={{ color: 'var(--warm)' }} />
              </div>
              <div className="price-presets-list">
                {PRICE_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    className={`price-preset-pill ${selectedPricePreset === preset.id ? 'active' : ''}`}
                    onClick={() => handlePresetPrice(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="custom-price-wrap">
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                  Tự nhập khoảng giá:
                </div>
                <div className="custom-price-inputs">
                  <input
                    className="custom-price-field"
                    placeholder="Từ (đ)"
                    value={minPrice}
                    onChange={handlePriceInput(setMinPrice)}
                  />
                  <span style={{ color: 'var(--muted)' }}>—</span>
                  <input
                    className="custom-price-field"
                    placeholder="Đến (đ)"
                    value={maxPrice}
                    onChange={handlePriceInput(setMaxPrice)}
                  />
                </div>
              </div>
            </div>

            {/* Color Swatches */}
            <div className="shop-filter-group">
              <div className="shop-filter-title">
                <span>Màu Sắc Tuyển Chọn</span>
                <i className="bi bi-palette" style={{ color: 'var(--warm)' }} />
              </div>
              <div className="shop-colors-grid">
                {filterColors.map(color => (
                  <div
                    key={color}
                    className={`shop-color-swatch ${selectedColor === color ? 'active' : ''}`}
                    onClick={() => { setSelectedColor(selectedColor === color ? '' : color); setPage(0); }}
                    title={color}
                  >
                    <div className="shop-color-inner" style={{ backgroundColor: facetColorHex(color) }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Size Filter */}
            <div className="shop-filter-group">
              <div className="shop-filter-title">
                <span>Kích Cỡ</span>
                <i className="bi bi-rulers" style={{ color: 'var(--warm)' }} />
              </div>
              <div className="shop-sizes-grid">
                {filterSizes.map(size => (
                  <button
                    key={size}
                    className={`shop-size-btn ${selectedSize === size ? 'active' : ''}`}
                    onClick={() => { setSelectedSize(selectedSize === size ? '' : size); setPage(0); }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            <button className="btn-reset-sidebar" onClick={resetFilters}>
              <i className="bi bi-arrow-counterclockwise" /> Xóa tất cả bộ lọc
            </button>
          </aside>

          {/* Main Area */}
          <main className="shop-main-area">
            {/* Toolbar */}
            <div className="shop-toolbar">
              <div className="shop-toolbar-left">
                {/* Mobile Filter Toggle Button */}
                <button
                  className="btn-mobile-filter-open"
                  onClick={() => setMobileDrawerOpen(true)}
                >
                  <i className="bi bi-sliders" /> Bộ lọc {hasActiveFilters && '•'}
                </button>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {loading ? 'Đang tải...' : `Hiển thị ${products.length} sản phẩm`}
                </div>
              </div>

              <div className="shop-toolbar-right">
                {/* Sort dropdown */}
                <div className="shop-sort-wrap">
                  <span className="shop-sort-label">Sắp xếp:</span>
                  <select
                    className="shop-sort-dropdown"
                    value={sortBy}
                    onChange={e => { setSortBy(e.target.value); setPage(0); }}
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Grid View Switcher */}
                <div className="shop-view-switcher">
                  <button
                    className={`shop-view-btn ${gridView === 'grid-4' ? 'active' : ''}`}
                    onClick={() => setGridView('grid-4')}
                    title="Lưới 4 cột tiêu chuẩn"
                  >
                    <i className="bi bi-grid-fill" />
                  </button>
                  <button
                    className={`shop-view-btn ${gridView === 'grid-3' ? 'active' : ''}`}
                    onClick={() => setGridView('grid-3')}
                    title="Lưới 3 cột lớn (Editorial)"
                  >
                    <i className="bi bi-grid-3x2" />
                  </button>
                  <button
                    className={`shop-view-btn ${gridView === 'list' ? 'active' : ''}`}
                    onClick={() => setGridView('list')}
                    title="Dạng danh sách chi tiết"
                  >
                    <i className="bi bi-list-ul" />
                  </button>
                </div>
              </div>
            </div>

            {/* Product Grid / List */}
            {error ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', border: '1px solid var(--border)' }}>
                <i className="bi bi-exclamation-circle" style={{ fontSize: 36, color: 'var(--warm)', marginBottom: 16, display: 'block' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, marginBottom: 8 }}>{error}</h3>
                <button className="btn-hero-primary mt-3" onClick={resetFilters}>Thử lại</button>
              </div>
            ) : loading ? (
              <div className={`products-grid ${gridView}`}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="product-card skeleton" style={{ height: 340 }} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '72px 20px', background: '#fff', border: '1px solid var(--border)' }}>
                <i className="bi bi-search" style={{ fontSize: 40, color: 'var(--muted)', marginBottom: 16, display: 'block' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 8 }}>Không tìm thấy thiết kế phù hợp</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 440, margin: '0 auto 24px' }}>
                  Vui lòng thử điều chỉnh lại mức giá, màu sắc hoặc chọn danh mục khác để xem thêm sản phẩm.
                </p>
                <button className="btn-hero-primary" onClick={resetFilters}>Xóa bộ lọc</button>
              </div>
            ) : (
              <div className={`products-grid ${gridView}`}>
                {products.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    delay={i}
                    onQuickView={() => handleOpenQuickView(p)}
                  />
                ))}
              </div>
            )}

            {/* Luxury Pagination */}
            {totalPages > 1 && (
              <div className="shop-pagination-wrap">
                <button
                  className="shop-page-btn"
                  onClick={() => {
                    setPage(p => Math.max(0, p - 1));
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  disabled={page === 0}
                  aria-label="Trang trước"
                >
                  <i className="bi bi-chevron-left" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i).map(n => (
                  <button
                    key={n}
                    className={`shop-page-btn ${page === n ? 'active' : ''}`}
                    onClick={() => {
                      setPage(n);
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                  >
                    {n + 1}
                  </button>
                ))}

                <button
                  className="shop-page-btn"
                  onClick={() => {
                    setPage(p => Math.min(totalPages - 1, p + 1));
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  disabled={page === totalPages - 1}
                  aria-label="Trang sau"
                >
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── 4. QUICK VIEW MODAL ── */}
      {quickViewProduct && (
        <div className="quickview-backdrop" onClick={() => setQuickViewProduct(null)}>
          <div className="quickview-card" onClick={e => e.stopPropagation()}>
            <button className="quickview-close" onClick={() => setQuickViewProduct(null)}>
              <i className="bi bi-x-lg" />
            </button>

            <div className="quickview-img-box">
              <img
                src={quickViewProduct.image || (quickViewProduct.images && quickViewProduct.images[0]) || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop'}
                alt={quickViewProduct.name}
                className="quickview-img"
              />
            </div>

            <div className="quickview-info-box">
              <div className="quickview-cat">{quickViewProduct.cat || 'BỘ SƯU TẬP 2026'}</div>
              <h3 className="quickview-title">{quickViewProduct.name}</h3>
              <div className="quickview-price">{fmt(quickViewProduct.price)}</div>
              <p className="quickview-desc">
                {quickViewProduct.description || 'Thiết kế thời trang may đo cao cấp với chất liệu tự nhiên, phom dáng thanh lịch tôn vinh khí chất của bạn.'}
              </p>

              {/* Sizes in Quick View */}
              {quickViewProduct.variants && quickViewProduct.variants.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
                    Kích cỡ:
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[...new Set(quickViewProduct.variants.map(v => v.size).filter(Boolean))].map(s => (
                      <button
                        key={s}
                        className={`shop-size-btn ${qvSize === s ? 'active' : ''}`}
                        onClick={() => setQvSize(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  className="btn-hero-primary"
                  style={{ flexGrow: 1 }}
                  onClick={handleQuickAddToCart}
                >
                  <i className="bi bi-bag-plus" /> Thêm vào giỏ
                </button>
                <button
                  className="btn-hero-secondary"
                  onClick={() => {
                    navigate('detail', { product: quickViewProduct.slug || quickViewProduct.id });
                    setQuickViewProduct(null);
                  }}
                >
                  Xem chi tiết ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. MOBILE FILTER DRAWER ── */}
      {mobileDrawerOpen && (
        <div className="mobile-filter-drawer-backdrop" onClick={() => setMobileDrawerOpen(false)}>
          <div className="mobile-filter-drawer" onClick={e => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <h3 className="mobile-drawer-title">Bộ Lọc Thiết Kế</h3>
              <button
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
                onClick={() => setMobileDrawerOpen(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="mobile-drawer-body">
              {/* Category */}
              <div>
                <div className="shop-filter-title" style={{ marginBottom: 12 }}>Danh Mục</div>
                <div className="shop-cat-list">
                  <button
                    className={`shop-cat-btn ${selectedCatSlug === '' ? 'active' : ''}`}
                    onClick={() => { setSelectedCatSlug(''); setPage(0); }}
                  >
                    <span>Tất cả</span>
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      className={`shop-cat-btn ${selectedCatSlug === cat.slug ? 'active' : ''}`}
                      onClick={() => { setSelectedCatSlug(cat.slug); setPage(0); }}
                    >
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <div className="shop-filter-title" style={{ marginBottom: 12 }}>Khoảng Giá</div>
                <div className="price-presets-list">
                  {PRICE_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      className={`price-preset-pill ${selectedPricePreset === preset.id ? 'active' : ''}`}
                      onClick={() => handlePresetPrice(preset)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div>
                <div className="shop-filter-title" style={{ marginBottom: 12 }}>Kích Cỡ</div>
                <div className="shop-sizes-grid">
                  {FILTER_SIZES.map(s => (
                    <button
                      key={s.value}
                      className={`shop-size-btn ${selectedSize === s.value ? 'active' : ''}`}
                      onClick={() => { setSelectedSize(selectedSize === s.value ? '' : s.value); setPage(0); }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mobile-drawer-footer">
              <button
                className="btn-hero-primary w-100 justify-content-center"
                onClick={() => setMobileDrawerOpen(false)}
              >
                Xem {products.length} kết quả
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* ── 6. FOOTER ── */}
      <Footer navigate={navigate} />
    </>
  );
}
