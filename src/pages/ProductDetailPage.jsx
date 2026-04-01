// src/pages/ProductDetailPage.jsx
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt, PRODUCTS } from '../data/products';
import { Stars, ProductCard, Footer } from '../components/index.jsx';

const COLORS = [
  { name: 'Trắng ngà', hex: '#F5F0E8' },
  { name: 'Đen',       hex: '#0E0E0E' },
  { name: 'Camel',     hex: '#C8A97E' },
  { name: 'Xanh khói', hex: '#7B9EAC' },
  { name: 'Hồng đất',  hex: '#A67B7B' },
];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const UNAVAIL = ['XXL'];

export default function ProductDetailPage() {
  const { navigate, selectedProduct } = useApp();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const product = selectedProduct || PRODUCTS[0];

  const [selectedColor, setSelectedColor] = useState(COLORS[0].name);
  const [selectedSize, setSelectedSize]   = useState('M');
  const [qty, setQty]     = useState(1);
  const [activeTab, setActiveTab] = useState('desc');
  const [activeThumb, setActiveThumb] = useState(0);

  const wished = isWishlisted(product.id);

  const thumbIcons = [product.icon, 'bi-bag', 'bi-star', 'bi-heart'];

  const related = PRODUCTS.filter(p => p.id !== product.id && p.cat === product.cat).slice(0, 4);

  return (
    <div>
      <div className="detail-layout">
        {/* Gallery */}
        <div className="detail-gallery-col">
          <div className="gallery-main-view" style={{ background: product.color + 'BB' }}>
            <i className={`bi ${thumbIcons[activeThumb]}`} style={{ fontSize: 88, color: 'rgba(14,14,14,.18)' }} />
            <span style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(14,14,14,.2)' }}>
              Hình ảnh sản phẩm
            </span>
          </div>
          <div className="gallery-thumbnails">
            {thumbIcons.map((icon, i) => (
              <div key={i} className={`gallery-thumb${activeThumb === i ? ' active' : ''}`}
                style={{ background: product.color + '88' }}
                onClick={() => setActiveThumb(i)}
              >
                <i className={`bi ${icon}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="detail-info-col">
          <div className="detail-breadcrumb">
            <span onClick={() => navigate('home')}>Trang chủ</span>
            {' / '}
            <span onClick={() => navigate('shop')}>Shop</span>
            {' / '}
            <span style={{ color: 'var(--ink)' }}>{product.cat}</span>
          </div>

          <div className="detail-brand-tag">{product.brand.toUpperCase()} EXCLUSIVE</div>
          <h1 className="detail-product-name">{product.name}</h1>

          <div className="detail-rating-row">
            <Stars rating={product.rating} size={12} />
            <span className="rating-count-text">({product.reviews} đánh giá)</span>
          </div>

          <div className="detail-price-block">
            <span className="detail-main-price">{fmt(product.price)}</span>
            {product.oldPrice && <>
              <span className="detail-old-price">{fmt(product.oldPrice)}</span>
              <span className="detail-discount-tag">-{product.discount}%</span>
            </>}
          </div>

          {/* Color */}
          <div className="option-row-label">
            Màu sắc — <span className="selected-val">{selectedColor}</span>
          </div>
          <div className="d-flex gap-2 mb-3">
            {COLORS.map(c => (
              <div key={c.name}
                className={`color-swatch${selectedColor === c.name ? ' active' : ''}`}
                style={{ background: c.hex, border: '2px solid var(--border)' }}
                title={c.name}
                onClick={() => setSelectedColor(c.name)}
              />
            ))}
          </div>

          {/* Size */}
          <div className="option-row-label">
            Kích thước — <span className="selected-val">{selectedSize}</span>
            <span style={{ fontSize: 11, color: 'var(--warm)', marginLeft: 10, cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
              Hướng dẫn chọn size
            </span>
          </div>
          <div className="size-grid">
            {SIZES.map(s => (
              <button key={s}
                className={`size-option-btn${selectedSize === s ? ' active' : ''}`}
                disabled={UNAVAIL.includes(s)}
                onClick={() => setSelectedSize(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Qty */}
          <div className="option-row-label" style={{ marginBottom: 10 }}>Số lượng</div>
          <div className="d-flex align-items-center mb-4 gap-3">
            <div className="qty-controller">
              <button className="qty-step" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
              <div className="qty-display">{qty}</div>
              <button className="qty-step" onClick={() => setQty(q => Math.min(product.stock, q + 1))}>+</button>
            </div>
            <span className="stock-note">Còn {product.stock} sản phẩm</span>
          </div>

          {/* CTA */}
          <div className="detail-cta-row">
            <button className="btn-add-to-cart" onClick={() => addToCart(product, qty, selectedSize, selectedColor)}>
              <i className="bi bi-bag-plus" /> Thêm vào giỏ hàng
            </button>
            <button className="btn-icon" onClick={() => toggleWishlist(product)} title="Yêu thích">
              <i className={`bi bi-heart${wished ? '-fill' : ''}`} style={{ color: wished ? 'var(--warm)' : 'inherit' }} />
            </button>
          </div>

          <button className="btn-warm mb-4" onClick={() => { addToCart(product, qty, selectedSize, selectedColor); navigate('cart'); }}>
            Mua ngay <i className="bi bi-arrow-right" />
          </button>

          {/* Perks */}
          <div className="detail-perks">
            <div className="perk-item"><i className="bi bi-truck perk-icon" /> Miễn phí giao hàng cho đơn trên 500.000đ</div>
            <div className="perk-item"><i className="bi bi-arrow-repeat perk-icon" /> Đổi trả miễn phí trong 30 ngày</div>
            <div className="perk-item"><i className="bi bi-shield-check perk-icon" /> Hàng chính hãng 100%, đảm bảo chất lượng</div>
            <div className="perk-item"><i className="bi bi-box-seam perk-icon" /> Đóng gói cẩn thận, giao hàng 2–3 ngày</div>
          </div>

          {/* Tabs */}
          <div className="detail-tabs">
            {[
              { id: 'desc',   label: 'Mô tả' },
              { id: 'spec',   label: 'Thông số' },
              { id: 'review', label: `Đánh giá (${product.reviews})` },
            ].map(tab => (
              <button key={tab.id}
                className={`detail-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={`tab-pane${activeTab === 'desc' ? ' active' : ''}`}>
            <p>Sản phẩm được làm từ chất liệu cao cấp, mang lại cảm giác mềm mại, thoáng mát và sang trọng. Thiết kế tối giản với đường may tinh tế, phù hợp cho nhiều dịp từ công sở đến tiệc tối.</p>
            <br />
            <p>Chất liệu thấm hút tốt, điều hòa thân nhiệt. Màu sắc bền đẹp sau nhiều lần giặt. Có thể giặt tay nhẹ nhàng hoặc giặt khô để bảo quản lâu dài.</p>
          </div>

          <div className={`tab-pane${activeTab === 'spec' ? ' active' : ''}`}>
            <div className="spec-list">
              {[
                ['Chất liệu', '100% Lụa tự nhiên (Silk)'],
                ['Xuất xứ', 'Việt Nam'],
                ['Kiểu dáng', 'Regular Fit'],
                ['Danh mục', product.cat],
                ['Thương hiệu', product.brand],
                ['Bảo quản', 'Giặt tay, không vắt mạnh'],
                ['SKU', `MSN-${product.id.toString().padStart(3,'0')}-2025`],
              ].map(([k, v]) => (
                <div key={k} className="spec-row">
                  <span className="spec-key">{k}</span>
                  <span className="spec-val">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`tab-pane${activeTab === 'review' ? ' active' : ''}`}>
            <div className="review-summary">
              <div className="review-score">
                <div className="review-score-num">{product.rating}</div>
                <Stars rating={product.rating} size={11} />
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{product.reviews} đánh giá</div>
              </div>
              <div style={{ flex: 1 }}>
                {[5,4,3,2,1].map(r => (
                  <div key={r} className="rating-bar-row">
                    <span style={{ width: 18 }}>{r}★</span>
                    <div className="rating-bar-track">
                      <div className="rating-bar-fill" style={{ width: `${[62,24,10,3,1][5-r]}%` }} />
                    </div>
                    <span style={{ color: 'var(--muted)', minWidth: 28 }}>{[62,24,10,3,1][5-r]}%</span>
                  </div>
                ))}
              </div>
            </div>
            {[
              { name: 'Nguyễn Linh Chi', date: '12/01/2025', rating: 5, text: 'Vải rất mềm mịn và mát. Mặc vào cảm giác nhẹ nhàng, thoải mái. Màu đẹp, không bị lóa. Sẽ mua thêm màu khác!' },
              { name: 'Trần Minh Anh',   date: '05/01/2025', rating: 4, text: 'Chất lượng tốt, đúng như mô tả. Giao hàng nhanh, đóng gói cẩn thận. Chỉ tiếc size hơi rộng, nên chọn nhỏ hơn.' },
              { name: 'Phạm Thu Hà',     date: '28/12/2024', rating: 5, text: 'Mình rất hài lòng! Sản phẩm đẹp hơn ảnh, chất liệu cao cấp. Sẽ ủng hộ shop dài dài.' },
            ].map(r => (
              <div key={r.name} className="review-item">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="review-author">{r.name}</span>
                  <span className="review-date">{r.date}</span>
                </div>
                <Stars rating={r.rating} size={11} />
                <p className="review-text">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="section">
          <div className="container-fluid px-4 px-lg-5">
            <div className="section-header">
              <h2 className="section-title">Có thể<br /><em>bạn thích</em></h2>
            </div>
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {related.map((p, i) => <ProductCard key={p.id} product={p} delay={i} />)}
            </div>
          </div>
        </section>
      )}

      <Footer navigate={navigate} />
    </div>
  );
}
