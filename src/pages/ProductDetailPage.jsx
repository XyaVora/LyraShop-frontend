// src/pages/ProductDetailPage.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { productApi } from '../services/api';
import { normalizeProduct, fmt } from '../data/products';
import { Stars, ProductCard, Footer } from '../components/index.jsx';

export default function ProductDetailPage() {
  const { navigate, selectedProduct } = useApp();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();

  const [product, setProduct]         = useState(null);
  const [related, setRelated]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty]                 = useState(1);
  const [activeTab, setActiveTab]     = useState('desc');
  const [activeThumb, setActiveThumb] = useState(0);

  // Load product detail từ backend
  useEffect(() => {
    if (!selectedProduct?.id && !selectedProduct?.slug) {
      setError('Không tìm thấy sản phẩm.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const request = selectedProduct.id
      ? productApi.get(selectedProduct.id)
      : productApi.list({ size: 100 }).then(response => {
        const match = (response.data?.content || []).find(item => item.slug === selectedProduct.slug);
        if (!match) throw new Error('Product not found');
        return { data: match };
      });

    request
      .then(res => {
        if (cancelled) return;
        const p = normalizeProduct(res.data, 0);
        setProduct(p);
        // Chọn variant đầu tiên còn hàng làm mặc định
        const firstAvail = (p.variants || []).find(v => v.stock > 0) || p.variants?.[0] || null;
        setSelectedVariant(firstAvail);
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tải thông tin sản phẩm.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedProduct?.id, selectedProduct?.slug]);

  // Load related products (cùng category)
  useEffect(() => {
    if (!product?.categoryId) return;
    productApi.list({ size: 5 })
      .then(res => {
        const all = (res.data.content || []).map((p, i) => normalizeProduct(p, i));
        setRelated(all.filter(p => p.id !== product.id).slice(0, 4));
      })
      .catch(() => {});
  }, [product?.categoryId, product?.id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <i className="bi bi-hourglass-split" style={{ fontSize: 40, color: 'var(--warm)' }} />
        <div style={{ marginTop: 16, color: 'var(--muted)' }}>Đang tải sản phẩm...</div>
      </div>
    </div>
  );

  if (error || !product) return (
    <div className="not-found">
      <div className="not-found-num">404</div>
      <h2 className="not-found-title">{error || 'Sản phẩm không tồn tại'}</h2>
      <button className="btn-lyra" onClick={() => navigate('shop')}>
        <i className="bi bi-arrow-left" /> Quay lại Shop
      </button>
    </div>
  );

  const wished = isWishlisted(product.id);
  const variants = product.variants || [];
  const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const thumbIcons = [product.icon, 'bi-bag', 'bi-star', 'bi-heart'];
  const galleryImages = product.images || [];

  const currentPrice  = selectedVariant?.price ? parseFloat(selectedVariant.price) : product.price;
  const currentStock  = selectedVariant?.stock ?? product.stock;
  const selectedSize  = selectedVariant?.size  || '';
  const selectedColor = selectedVariant?.color || '';

  const selectVariant = (size, color) => {
    const v = variants.find(v =>
      (size  ? v.size  === size  : true) &&
      (color ? v.color === color : true) &&
      v.stock > 0
    ) || variants.find(v =>
      (size  ? v.size  === size  : true) &&
      (color ? v.color === color : true)
    );
    if (v) setSelectedVariant(v);
  };

  const handleAddToCart = () => {
    return addToCart(
      { ...product, price: currentPrice, stock: currentStock, variantPrice: currentPrice },
      qty,
      selectedSize || null,
      selectedColor || null,
      selectedVariant?.id || null,
    );
  };

  return (
    <div>
      <div className="detail-layout">
        {/* Gallery */}
        <div className="detail-gallery-col">
          <div className="gallery-main-view" style={{ background: product.color + 'BB', position: 'relative' }}>
            {galleryImages[activeThumb] ? (
              <>
                <i className={`bi ${product.icon}`} style={{ fontSize: 88, color: 'rgba(14,14,14,.18)' }} />
                <img
                  src={galleryImages[activeThumb]}
                  alt={product.name}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={event => { event.currentTarget.style.display = 'none'; }}
                />
              </>
            ) : (
              <>
                <i className={`bi ${thumbIcons[activeThumb]}`} style={{ fontSize: 88, color: 'rgba(14,14,14,.18)' }} />
                <span style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(14,14,14,.2)' }}>
                  Hình ảnh sản phẩm
                </span>
              </>
            )}
          </div>
          <div className="gallery-thumbnails">
            {(galleryImages.length > 0 ? galleryImages : thumbIcons).map((media, i) => (
              <div key={i} className={`gallery-thumb${activeThumb === i ? ' active' : ''}`}
                style={{ background: product.color + '88', position: 'relative', overflow: 'hidden' }}
                onClick={() => setActiveThumb(i)}
              >
                {galleryImages.length > 0
                  ? <>
                      <i className={`bi ${product.icon}`} />
                      <img
                        src={media}
                        alt={`${product.name} ${i + 1}`}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={event => { event.currentTarget.style.display = 'none'; }}
                      />
                      </>
                  : <i className={`bi ${media}`} />}
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
            <span style={{ color: 'var(--ink)' }}>{product.name}</span>
          </div>

          <div className="detail-brand-tag">{product.brand.toUpperCase()} EXCLUSIVE</div>
          <h1 className="detail-product-name">{product.name}</h1>

          {product.rating > 0 && (
            <div className="detail-rating-row">
              <Stars rating={product.rating} size={12} />
              <span className="rating-count-text">({product.reviews} đánh giá)</span>
            </div>
          )}

          <div className="detail-price-block">
            <span className="detail-main-price">{fmt(currentPrice)}</span>
            {product.oldPrice && <>
              <span className="detail-old-price">{fmt(product.oldPrice)}</span>
              <span className="detail-discount-tag">-{product.discount}%</span>
            </>}
          </div>

          {/* Màu sắc — từ variants */}
          {colors.length > 0 && (
            <>
              <div className="option-row-label">
                Màu sắc — <span className="selected-val">{selectedColor || 'Chọn màu'}</span>
              </div>
              <div className="d-flex gap-2 mb-3 flex-wrap">
                {colors.map(c => (
                  <button key={c}
                    className={`size-option-btn${selectedColor === c ? ' active' : ''}`}
                    onClick={() => selectVariant(selectedSize, c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Kích thước — từ variants */}
          {sizes.length > 0 && (
            <>
              <div className="option-row-label">
                Kích thước — <span className="selected-val">{selectedSize || 'Chọn size'}</span>
              </div>
              <div className="size-grid">
                {sizes.map(s => {
                  const v = variants.find(v => v.size === s && (selectedColor ? v.color === selectedColor : true));
                  const outOfStock = v ? v.stock === 0 : true;
                  return (
                    <button key={s}
                      className={`size-option-btn${selectedSize === s ? ' active' : ''}`}
                      disabled={outOfStock}
                      onClick={() => selectVariant(s, selectedColor)}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Số lượng */}
          <div className="option-row-label" style={{ marginBottom: 10 }}>Số lượng</div>
          <div className="d-flex align-items-center mb-4 gap-3">
            <div className="qty-controller">
              <button className="qty-step" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
              <div className="qty-display">{qty}</div>
              <button className="qty-step" onClick={() => setQty(q => Math.min(currentStock || 99, q + 1))}>+</button>
            </div>
            <span className="stock-note">
              {currentStock > 0 ? `Còn ${currentStock} sản phẩm` : 'Hết hàng'}
            </span>
          </div>

          {/* CTA */}
          <div className="detail-cta-row">
            <button
              className="btn-add-to-cart"
              disabled={currentStock === 0}
              onClick={handleAddToCart}
            >
              <i className="bi bi-bag-plus" /> Thêm vào giỏ hàng
            </button>
            <button className="btn-icon" onClick={() => toggleWishlist(product)} title="Yêu thích">
              <i className={`bi bi-heart${wished ? '-fill' : ''}`} style={{ color: wished ? 'var(--warm)' : 'inherit' }} />
            </button>
          </div>

          <button className="btn-warm mb-4"
            disabled={currentStock === 0}
            onClick={async () => {
              const added = await handleAddToCart();
              if (added) navigate('cart');
            }}
          >
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
              { id: 'desc',  label: 'Mô tả' },
              { id: 'spec',  label: 'Thông số' },
            ].map(tab => (
              <button key={tab.id}
                className={`detail-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={`tab-pane detail-description${activeTab === 'desc' ? ' active' : ''}`}>
            {product.description
              ? <p>{product.description}</p>
              : <p style={{ color: 'var(--muted)' }}>Chưa có mô tả cho sản phẩm này.</p>
            }
          </div>

          <div className={`tab-pane${activeTab === 'spec' ? ' active' : ''}`}>
            <div className="spec-list">
              {[
                ['Thương hiệu', product.brand],
                ['SKU', selectedVariant?.sku || '—'],
                ...(variants.length > 0
                  ? [['Các kích thước', sizes.join(', ') || '—']]
                  : []
                ),
                ['Tình trạng', currentStock > 0 ? `Còn hàng (${currentStock})` : 'Hết hàng'],
              ].map(([k, v]) => (
                <div key={k} className="spec-row">
                  <span className="spec-key">{k}</span>
                  <span className="spec-val">{v}</span>
                </div>
              ))}
            </div>
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
