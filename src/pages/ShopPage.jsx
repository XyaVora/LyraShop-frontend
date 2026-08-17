// src/pages/ShopPage.jsx
import { useState, useMemo } from 'react';
import { PRODUCTS } from '../data/products';
import { ProductCard } from '../components/index.jsx';
import { Footer } from '../components/index.jsx';
import { useApp } from '../context/AppContext';

const CATS    = ['Tất cả', 'Thời trang nữ', 'Thời trang nam', 'Giày dép', 'Phụ kiện'];
const BRANDS  = ['Lyra'];
const COLORS  = [
  { name: 'Đen',      hex: '#0E0E0E' },
  { name: 'Trắng',    hex: '#F5F0E8' },
  { name: 'Camel',    hex: '#C8A97E' },
  { name: 'Xanh khói', hex: '#7B9EAC' },
  { name: 'Hồng đất', hex: '#A67B7B' },
  { name: 'Xanh lá',  hex: '#6B8C6B' },
];
const ITEMS_PER_PAGE = 9;

export default function ShopPage() {
  const { navigate } = useApp();
  const [selectedCat, setSelectedCat]   = useState('Tất cả');
  const [selectedColor, setSelectedColor] = useState(null);
  const [minPrice, setMinPrice]         = useState('');
  const [maxPrice, setMaxPrice]         = useState('');
  const [sortBy, setSortBy]             = useState('newest');
  const [listView, setListView]         = useState(false);
  const [page, setPage]                 = useState(1);
  const [minRating, setMinRating]       = useState(0);

  const filtered = useMemo(() => {
    let list = [...PRODUCTS];
    if (selectedCat !== 'Tất cả') list = list.filter(p => p.cat === selectedCat);
    if (selectedColor)             list = list.filter(p => p.color);
    if (minPrice)                  list = list.filter(p => p.price >= Number(minPrice.replace(/\D/g, '')));
    if (maxPrice)                  list = list.filter(p => p.price <= Number(maxPrice.replace(/\D/g, '')));
    if (minRating > 0)             list = list.filter(p => p.rating >= minRating);
    switch (sortBy) {
      case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating':     list.sort((a, b) => b.rating - a.rating); break;
      case 'popular':    list.sort((a, b) => b.reviews - a.reviews); break;
      default: break;
    }
    return list;
  }, [selectedCat, selectedColor, minPrice, maxPrice, sortBy, minRating]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const resetFilters = () => {
    setSelectedCat('Tất cả'); setSelectedColor(null);
    setMinPrice(''); setMaxPrice(''); setMinRating(0); setPage(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="shop-header-bar">
        <div className="container-fluid px-4 px-lg-5">
          <h1 className="shop-page-title">Tất cả sản phẩm</h1>
          <p className="shop-meta-text">Hiển thị {paged.length} / {filtered.length} sản phẩm</p>
        </div>
      </div>

      <div className="shop-layout">
        {/* Sidebar */}
        <aside className="shop-sidebar">
          {/* Category */}
          <div className="filter-group">
            <div className="filter-group-title">Danh mục</div>
            {CATS.map(cat => (
              <div key={cat} className="filter-check-item">
                <input type="radio" id={`cat-${cat}`} name="category" checked={selectedCat === cat}
                  onChange={() => { setSelectedCat(cat); setPage(1); }} />
                <label htmlFor={`cat-${cat}`}>{cat}</label>
                {cat !== 'Tất cả' && (
                  <span className="filter-count">{PRODUCTS.filter(p => p.cat === cat).length}</span>
                )}
              </div>
            ))}
          </div>

          {/* Price */}
          <div className="filter-group">
            <div className="filter-group-title">Khoảng giá (VNĐ)</div>
            <div className="price-inputs">
              <input className="price-input-field" placeholder="Từ" value={minPrice}
                onChange={e => { setMinPrice(e.target.value); setPage(1); }} />
              <input className="price-input-field" placeholder="Đến" value={maxPrice}
                onChange={e => { setMaxPrice(e.target.value); setPage(1); }} />
            </div>
          </div>

          {/* Colors */}
          <div className="filter-group">
            <div className="filter-group-title">Màu sắc</div>
            <div className="color-swatches">
              {COLORS.map(c => (
                <div key={c.name} className={`color-swatch${selectedColor === c.name ? ' active' : ''}`}
                  style={{ background: c.hex, border: '2px solid var(--border)' }}
                  title={c.name}
                  onClick={() => { setSelectedColor(prev => prev === c.name ? null : c.name); setPage(1); }}
                />
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="filter-group">
            <div className="filter-group-title">Đánh giá tối thiểu</div>
            {[4, 3, 2].map(r => (
              <div key={r} className="filter-check-item">
                <input type="radio" id={`r${r}`} name="rating" checked={minRating === r}
                  onChange={() => { setMinRating(r); setPage(1); }} />
                <label htmlFor={`r${r}`}>
                  {'★'.repeat(r)}{'☆'.repeat(5 - r)} trở lên
                </label>
              </div>
            ))}
            <div className="filter-check-item">
              <input type="radio" id="r0" name="rating" checked={minRating === 0} onChange={() => { setMinRating(0); setPage(1); }} />
              <label htmlFor="r0">Tất cả</label>
            </div>
          </div>

          <button className="btn-maison w-100 justify-content-center" onClick={resetFilters}>
            <i className="bi bi-arrow-counterclockwise" /> Xóa bộ lọc
          </button>
        </aside>

        {/* Main */}
        <main className="shop-main-area">
          <div className="shop-toolbar">
            <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Mới nhất</option>
              <option value="price-asc">Giá: Thấp → Cao</option>
              <option value="price-desc">Giá: Cao → Thấp</option>
              <option value="rating">Đánh giá cao nhất</option>
              <option value="popular">Bán chạy nhất</option>
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

          {paged.length === 0 ? (
            <div className="cart-empty-state">
              <i className="bi bi-search" />
              <div className="cart-empty-title">Không tìm thấy sản phẩm</div>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Thử thay đổi bộ lọc để xem thêm sản phẩm.</p>
              <button className="btn-maison mt-3" onClick={resetFilters}>Xóa bộ lọc</button>
            </div>
          ) : (
            <div className={`products-grid${listView ? ' list-view' : ''}`}>
              {paged.map((p, i) => <ProductCard key={p.id} product={p} delay={i} />)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="maison-pagination">
              <button className="page-num-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <i className="bi bi-chevron-left" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} className={`page-num-btn${page === n ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className="page-num-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
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