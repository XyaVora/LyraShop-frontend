// src/pages/ProductDetailPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { extractErrorMessage, productApi, reviewApi } from '../services/api';
import { normalizeProduct, fmt } from '../data/products';
import { Stars, ProductCard, Footer } from '../components/index.jsx';
import '../styles/product-detail.css';

// Map color names to visual hex codes for swatches
const COLOR_SWATCH_MAP = {
  'trắng': '#FFFFFF',
  'trắng kem': '#FAF7F0',
  'đen': '#1A1815',
  'be': '#E6DDD0',
  'be khaki': '#D9CEBF',
  'xanh rêu': '#485743',
  'xanh than': '#1B232E',
  'xanh navy': '#1E293B',
  'xám tiêu': '#8C8C8C',
  'kem': '#F5EFE6',
  'nâu sáp': '#6E472A',
  'nâu': '#593D28',
  'ánh bạc': '#D4D6D9',
  'hồng pastel': '#F2D7D9',
  'xanh chàm': '#2C3E50',
};

function getColorHex(colorName) {
  if (!colorName) return '#C8A97E';
  const clean = colorName.toLowerCase().trim();
  for (const [key, hex] of Object.entries(COLOR_SWATCH_MAP)) {
    if (clean.includes(key)) return hex;
  }
  return '#D8CEC0';
}

export default function ProductDetailPage() {
  const { navigate, selectedProduct, isLoggedIn, user } = useApp();
  const { addToCart, toggleWishlist, isWishlisted, showToast } = useCart();

  const [product, setProduct]                 = useState(null);
  const [related, setRelated]                 = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty]                         = useState(1);
  const [activeTab, setActiveTab]             = useState('desc');
  const [activeThumb, setActiveThumb]         = useState(0);
  const [showSizeGuide, setShowSizeGuide]     = useState(false);
  const [lightboxImage, setLightboxImage]     = useState(null);
  const [isStickyVisible, setIsStickyVisible] = useState(false);

  // Reviews state
  const [reviews, setReviews]                 = useState([]);
  const [reviewsLoading, setReviewsLoading]   = useState(false);
  const [reviewsError, setReviewsError]       = useState('');
  const [reviewRating, setReviewRating]       = useState(5);
  const [reviewComment, setReviewComment]     = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const ctaRef = useRef(null);

  // Sticky bottom bar trigger on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!ctaRef.current) return;
      const rect = ctaRef.current.getBoundingClientRect();
      // Show sticky bar when the main CTA button has scrolled out of the top of viewport
      setIsStickyVisible(rect.bottom < 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load product detail
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
        // Default to first variant in stock
        const firstAvail = (p.variants || []).find(v => v.stock > 0) || p.variants?.[0] || null;
        setSelectedVariant(firstAvail);
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tải thông tin sản phẩm.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedProduct?.id, selectedProduct?.slug]);

  // Load related products
  useEffect(() => {
    if (!product?.categoryId) return;
    productApi.related(product.id, 4)
      .then(res => {
        const all = (res.data || []).map((p, i) => normalizeProduct(p, i));
        setRelated(all.filter(p => p.id !== product.id).slice(0, 4));
      })
      .catch(() => {});
  }, [product?.categoryId, product?.id]);

  // Load reviews
  useEffect(() => {
    if (!product?.id) return;
    let cancelled = false;
    setReviewsLoading(true);
    setReviewsError('');
    reviewApi.list(product.id)
      .then(({ data }) => { if (!cancelled) setReviews(data || []); })
      .catch(error => {
        if (!cancelled) setReviewsError(extractErrorMessage(error, 'Không thể tải đánh giá'));
      })
      .finally(() => { if (!cancelled) setReviewsLoading(false); });
    return () => { cancelled = true; };
  }, [product?.id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 480 }}>
      <div style={{ textAlign: 'center' }}>
        <i className="bi bi-hourglass-split" style={{ fontSize: 36, color: 'var(--warm)' }} />
        <div style={{ marginTop: 14, color: 'var(--muted)', fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Đang tải thiết kế...
        </div>
      </div>
    </div>
  );

  if (error || !product) return (
    <div className="not-found" style={{ padding: '80px 20px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 72, color: 'var(--warm)', fontWeight: 300 }}>404</div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, margin: '16px 0 24px' }}>{error || 'Sản phẩm không tồn tại'}</h2>
      <button className="btn-hero-primary" onClick={() => navigate('shop')}>
        <i className="bi bi-arrow-left" /> Quay lại Cửa hàng
      </button>
    </div>
  );

  const wished = isWishlisted(product.id);
  const variants = product.variants || [];
  const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const galleryImages = product.images && product.images.length > 0
    ? product.images
    : product.image ? [product.image] : [];

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
    addToCart(
      { ...product, price: currentPrice, stock: currentStock, variantPrice: currentPrice },
      qty,
      selectedSize || null,
      selectedColor || null,
      selectedVariant?.id || null,
    );
    showToast(`Đã thêm ${product.name} vào giỏ hàng!`, 'success');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('cart');
  };

  const handleReviewSubmit = async () => {
    if (!isLoggedIn) {
      navigate('auth');
      return;
    }
    if (!reviewComment.trim()) {
      showToast('Vui lòng nhập nội dung đánh giá của bạn.', 'error');
      return;
    }
    setReviewSubmitting(true);
    setReviewsError('');
    try {
      const { data } = await reviewApi.create(product.id, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      const next = [data, ...reviews];
      setReviews(next);
      setProduct(prev => ({
        ...prev,
        rating: next.reduce((sum, r) => sum + r.rating, 0) / next.length,
        reviews: next.length,
      }));
      setReviewComment('');
      showToast('Cảm ơn bạn đã gửi đánh giá cho thiết kế này!', 'success');
    } catch (err) {
      setReviewsError(extractErrorMessage(err, 'Không thể gửi đánh giá.'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Review star bars distribution
  const totalReviews = reviews.length;
  const ratingDistribution = [5, 4, 3, 2, 1].map(star => {
    const count = reviews.filter(r => r.rating === star).length;
    const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, percent };
  });

  return (
    <div className="pdp-root">
      {/* ── 1. BREADCRUMB ── */}
      <div className="container-fluid px-4 px-lg-5">
        <div className="pdp-breadcrumb-wrap">
          <nav className="pdp-breadcrumb">
            <a onClick={() => navigate('home')}>Trang chủ</a>
            <span className="sep">/</span>
            <a onClick={() => navigate('shop')}>Cửa hàng</a>
            {product.cat && (
              <>
                <span className="sep">/</span>
                <a onClick={() => navigate('shop', { cat: product.cat })}>{product.cat}</a>
              </>
            )}
            <span className="sep">/</span>
            <span className="current">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* ── 2. MAIN PRODUCT GRID ── */}
      <div className="container-fluid px-4 px-lg-5">
        <div className="pdp-main-grid">
          {/* Gallery (Left) */}
          <div className="pdp-gallery-wrap">
            {/* Thumbnail Rail */}
            {galleryImages.length > 1 && (
              <div className="pdp-thumbnails-rail">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    className={`pdp-thumb-btn ${activeThumb === idx ? 'active' : ''}`}
                    onClick={() => setActiveThumb(idx)}
                  >
                    <img src={imgUrl} alt={`${product.name} - ${idx}`} className="pdp-thumb-img" />
                  </button>
                ))}
              </div>
            )}

            {/* Main Showcase */}
            <div
              className="pdp-main-image-box"
              onClick={() => {
                if (galleryImages[activeThumb]) setLightboxImage(galleryImages[activeThumb]);
              }}
            >
              <div className="pdp-tag-badge">ATELIER 2026 • HANDCRAFTED</div>
              <button
                className={`pdp-wishlist-float ${wished ? 'wished' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(product.id);
                  showToast(wished ? 'Đã xóa khỏi danh sách yêu thích' : 'Đã thêm vào danh sách yêu thích', 'success');
                }}
                title={wished ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
              >
                <i className={`bi ${wished ? 'bi-heart-fill' : 'bi-heart'}`} />
              </button>

              {galleryImages[activeThumb] ? (
                <img
                  src={galleryImages[activeThumb]}
                  alt={product.name}
                  className="pdp-main-image"
                />
              ) : (
                <div className="pdp-main-placeholder">
                  <i className={`bi ${product.icon || 'bi-bag-heart'}`} />
                  <span style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase' }}>
                    {product.name}
                  </span>
                </div>
              )}

              <div className="pdp-zoom-hint">
                <i className="bi bi-arrows-fullscreen" /> Nhấn để phóng to
              </div>
            </div>
          </div>

          {/* Product Purchasing Box (Right) */}
          <div className="pdp-info-wrap">
            <div className="pdp-eyebrow-row">
              <div className="pdp-category-tag">
                {product.cat || 'BỘ SƯU TẬP CAO CẤP'}
              </div>
              <div className="pdp-sku-badge">
                {selectedVariant?.sku || `REF: LY-${product.id}`}
              </div>
            </div>

            <h1 className="pdp-product-title">{product.name}</h1>

            {/* Rating & Sold Row */}
            <div className="pdp-rating-row">
              <div className="pdp-stars-box">
                <i className="bi bi-star-fill" />
                <span className="pdp-rating-num">{product.rating ? product.rating.toFixed(1) : '5.0'}</span>
              </div>
              <span
                className="pdp-review-count-link"
                onClick={() => {
                  setActiveTab('reviews');
                  document.getElementById('pdp-tabs-anchor')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                ({product.reviews || reviews.length || 12} đánh giá)
              </span>
              <span className="pdp-sold-badge">ĐÃ BÁN 68+</span>
            </div>

            {/* Price Box */}
            <div className="pdp-price-box">
              <span className="pdp-current-price">{fmt(currentPrice)}</span>
              {product.oldPrice && (
                <span className="pdp-old-price">{fmt(product.oldPrice)}</span>
              )}
              <div className="pdp-vip-note">
                <i className="bi bi-gem" />
                <span>Tích lũy 5% Lyra Xu & Hỗ trợ trả góp 0% qua thẻ tín dụng</span>
              </div>
            </div>

            {/* Social Proof / Urgency */}
            <div className="pdp-urgency-banner">
              <i className="bi bi-fire" />
              <span>
                <strong>14 khách hàng</strong> đang xem thiết kế này.
                {currentStock <= 5 ? ` Chỉ còn ${currentStock} chiếc trong kho!` : ' Sẵn sàng giao ngay.'}
              </span>
            </div>

            {/* Variants: Colors & Sizes */}
            <div className="pdp-variants-section">
              {/* Colors */}
              {colors.length > 0 && (
                <div className="pdp-option-group">
                  <div className="pdp-option-header">
                    <span className="pdp-option-title">
                      MÀU SẮC: <span>{selectedColor || 'Chọn màu'}</span>
                    </span>
                  </div>
                  <div className="pdp-swatches-row">
                    {colors.map(color => {
                      const active = selectedColor === color;
                      const hex = getColorHex(color);
                      return (
                        <div
                          key={color}
                          className={`pdp-swatch-circle ${active ? 'active' : ''}`}
                          onClick={() => selectVariant(selectedSize, color)}
                          title={color}
                        >
                          <div className="pdp-swatch-inner" style={{ backgroundColor: hex }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sizes */}
              {sizes.length > 0 && (
                <div className="pdp-option-group">
                  <div className="pdp-option-header">
                    <span className="pdp-option-title">
                      KÍCH CỠ: <span>{selectedSize || 'Chọn kích cỡ'}</span>
                    </span>
                    <button
                      className="pdp-size-guide-btn"
                      onClick={() => setShowSizeGuide(true)}
                    >
                      <i className="bi bi-rulers" /> Bảng quy đổi kích cỡ
                    </button>
                  </div>
                  <div className="pdp-sizes-row">
                    {sizes.map(size => {
                      const v = variants.find(item =>
                        item.size === size &&
                        (selectedColor ? item.color === selectedColor : true)
                      );
                      const isOutOfStock = v && v.stock <= 0;
                      const active = selectedSize === size;

                      return (
                        <button
                          key={size}
                          className={`pdp-size-pill ${active ? 'active' : ''} ${isOutOfStock ? 'disabled' : ''}`}
                          onClick={() => !isOutOfStock && selectVariant(size, selectedColor)}
                          disabled={isOutOfStock}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quantity & CTA Action Buttons */}
            <div className="pdp-cta-wrap" ref={ctaRef}>
              <div className="pdp-cta-row">
                <div className="pdp-qty-stepper">
                  <button
                    className="pdp-qty-btn"
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >
                    −
                  </button>
                  <span className="pdp-qty-val">{qty}</span>
                  <button
                    className="pdp-qty-btn"
                    onClick={() => setQty(q => Math.min(currentStock, q + 1))}
                    disabled={qty >= currentStock}
                  >
                    +
                  </button>
                </div>

                <button
                  className="btn-pdp-add-cart"
                  onClick={handleAddToCart}
                  disabled={currentStock <= 0}
                >
                  <i className="bi bi-bag-plus" />
                  {currentStock <= 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
                </button>
              </div>

              <button
                className="btn-pdp-buy-now"
                onClick={handleBuyNow}
                disabled={currentStock <= 0}
              >
                Mua ngay bằng 1-Click
              </button>
            </div>

            {/* Service Guarantees Mini Grid */}
            <div className="pdp-guarantees-grid">
              <div className="pdp-guarantee-box">
                <i className="bi bi-box2 pdp-guarantee-icon" />
                <div>
                  <div className="pdp-guarantee-label">Signature Gift Box</div>
                  <div className="pdp-guarantee-desc">Đóng gói hộp quà cao cấp kèm thiệp viết tay</div>
                </div>
              </div>
              <div className="pdp-guarantee-box">
                <i className="bi bi-truck pdp-guarantee-icon" />
                <div>
                  <div className="pdp-guarantee-label">Miễn Phí Giao Hàng</div>
                  <div className="pdp-guarantee-desc">Áp dụng cho mọi đơn hàng từ 500.000₫</div>
                </div>
              </div>
              <div className="pdp-guarantee-box">
                <i className="bi bi-arrow-repeat pdp-guarantee-icon" />
                <div>
                  <div className="pdp-guarantee-label">Đổi Size 30 Ngày</div>
                  <div className="pdp-guarantee-desc">Hỗ trợ thử đồ và đổi mẫu tận nơi linh hoạt</div>
                </div>
              </div>
              <div className="pdp-guarantee-box">
                <i className="bi bi-patch-check pdp-guarantee-icon" />
                <div>
                  <div className="pdp-guarantee-label">May Đo Chính Hãng</div>
                  <div className="pdp-guarantee-desc">Cam kết chất liệu 100% tự nhiên chuẩn xưởng</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. EXPANDED CONTENT TABS ── */}
      <div className="container-fluid px-4 px-lg-5" id="pdp-tabs-anchor">
        <section className="pdp-tabs-section">
          <div className="pdp-tabs-header">
            <button
              className={`pdp-tab-trigger ${activeTab === 'desc' ? 'active' : ''}`}
              onClick={() => setActiveTab('desc')}
            >
              Mô tả & Thiết kế
            </button>
            <button
              className={`pdp-tab-trigger ${activeTab === 'care' ? 'active' : ''}`}
              onClick={() => setActiveTab('care')}
            >
              Chất liệu & Bảo quản
            </button>
            <button
              className={`pdp-tab-trigger ${activeTab === 'packaging' ? 'active' : ''}`}
              onClick={() => setActiveTab('packaging')}
            >
              Đóng gói Signature
            </button>
            <button
              className={`pdp-tab-trigger ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Đánh giá ({reviews.length})
            </button>
          </div>

          <div className="pdp-tab-content-wrap">
            {/* Tab 1: Description */}
            {activeTab === 'desc' && (
              <div>
                <p className="pdp-desc-text">
                  {product.description || (
                    'Thiết kế kết tinh từ chuẩn mực may đo đương đại và chất liệu tự nhiên thượng hạng. Phom dáng thanh lịch, đường cắt sắc sảo tôn vinh vóc dáng tự nhiên của người mặc. Từng chiếc khuy xà cừ, nẹp viền giấu chỉ và ve áo đều được chăm chút tỉ mỉ bởi các nghệ nhân may đo lành nghề của Lyra.'
                  )}
                </p>
                <div style={{ marginTop: 24, padding: '20px 24px', background: '#FFFFFF', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 12 }}>Đặc tính nổi bật:</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--muted)', fontSize: 14, lineHeight: 1.8 }}>
                    <li>Phom dáng Regular Fit chuẩn quý phái, tạo cảm giác cử động nhẹ nhàng và thoải mái.</li>
                    <li>Chất vải đã qua xử lý sinh học chống co rút, thoáng mát và thấm hút mồ hôi tối ưu.</li>
                    <li>Dễ dàng phối cùng quần tây ống rộng, chân váy xếp ly hoặc khoác ngoài blazer.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 2: Care & Fabric */}
            {activeTab === 'care' && (
              <div>
                <p className="pdp-desc-text">
                  Để giữ cho sản phẩm may đo luôn giữ được phom dáng hoàn hảo và độ óng tự nhiên của sợi vải, Lyra khuyến nghị khách hàng tuân thủ quy chuẩn chăm sóc chuyên biệt dưới đây:
                </p>
                <div className="pdp-care-grid">
                  <div className="pdp-care-item">
                    <i className="bi bi-hand-index-thumb pdp-care-icon" />
                    <div className="pdp-care-name">Giặt tay nhẹ nhàng</div>
                    <div className="pdp-care-hint">Giặt bằng nước mát dưới 30°C với dầu gội hoặc nước giặt lụa.</div>
                  </div>
                  <div className="pdp-care-item">
                    <i className="bi bi-shield-slash pdp-care-icon" />
                    <div className="pdp-care-name">Không dùng chất tẩy</div>
                    <div className="pdp-care-hint">Tránh xa clo và chất tẩy rửa mạnh để bảo vệ sợi vải tự nhiên.</div>
                  </div>
                  <div className="pdp-care-item">
                    <i className="bi bi-thermometer-low pdp-care-icon" />
                    <div className="pdp-care-name">Ủi nhiệt độ thấp</div>
                    <div className="pdp-care-hint">Ủi ở mặt trái khi vải còn ẩm nhẹ, hoặc dùng bàn ủi hơi nước.</div>
                  </div>
                  <div className="pdp-care-item">
                    <i className="bi bi-recycle pdp-care-icon" />
                    <div className="pdp-care-name">Giặt hấp khô</div>
                    <div className="pdp-care-hint">Khuyến khích giặt hấp khô định kỳ tại các tiệm giặt uy tín.</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Packaging & Shipping */}
            {activeTab === 'packaging' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <i className="bi bi-gift" style={{ fontSize: 44, color: 'var(--warm)', marginBottom: 16, display: 'block' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 12 }}>Chuẩn Mực Đóng Gói Signature Box</h3>
                <p style={{ maxWidth: 640, margin: '0 auto 24px', fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.8 }}>
                  Mỗi món đồ từ Lyra khi gửi đến tay bạn đều được đặt trong hộp cứng cao cấp chống va đập, bọc giấy nến lụa thơm và thắt ruy băng trang trọng. Kèm theo thiệp cảm ơn viết tay và túi đựng quần áo chống bụi.
                </p>
                <div style={{ display: 'inline-flex', gap: 20, fontSize: 13, color: 'var(--ink)' }}>
                  <span>✦ Hộp quà độc quyền</span>
                  <span>✦ Túi vải canvas bảo quản</span>
                  <span>✦ Thiệp thông điệp viết tay</span>
                </div>
              </div>
            )}

            {/* Tab 4: Reviews */}
            {activeTab === 'reviews' && (
              <div className="pdp-reviews-layout">
                {/* Overview Card */}
                <div className="pdp-rating-overview-card">
                  <div className="pdp-big-score">
                    {product.rating ? product.rating.toFixed(1) : '5.0'}
                  </div>
                  <div className="pdp-stars-lg">
                    <Stars score={product.rating || 5} />
                  </div>
                  <div className="pdp-rating-count-text">
                    Dựa trên {totalReviews > 0 ? totalReviews : 12} đánh giá của khách hàng
                  </div>

                  <div className="pdp-rating-bars-list">
                    {ratingDistribution.map(({ star, count, percent }) => (
                      <div key={star} className="pdp-rating-bar-row">
                        <span>{star}★</span>
                        <div className="pdp-bar-track">
                          <div className="pdp-bar-fill" style={{ width: `${percent}%` }} />
                        </div>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reviews List & Write Form */}
                <div>
                  {/* Form */}
                  <div className="pdp-review-form-card">
                    <h4 className="pdp-form-title">Để lại cảm nhận của bạn</h4>
                    <div className="pdp-rating-select-stars">
                      {[1, 2, 3, 4, 5].map(star => (
                        <i
                          key={star}
                          className={`bi ${star <= reviewRating ? 'bi-star-fill' : 'bi-star'}`}
                          onClick={() => setReviewRating(star)}
                        />
                      ))}
                    </div>
                    <textarea
                      className="pdp-review-input"
                      placeholder="Chia sẻ về chất vải, độ vừa vặn và trải nghiệm của bạn..."
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                    />
                    <button
                      className="btn-hero-primary"
                      onClick={handleReviewSubmit}
                      disabled={reviewSubmitting}
                    >
                      {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                    </button>
                    {reviewsError && (
                      <div style={{ color: '#d9534f', fontSize: 13, marginTop: 10 }}>{reviewsError}</div>
                    )}
                  </div>

                  {/* List */}
                  {reviewsLoading ? (
                    <div style={{ padding: 20, color: 'var(--muted)', textAlign: 'center' }}>Đang tải đánh giá...</div>
                  ) : reviews.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', background: '#FFFFFF', border: '1px solid var(--border)' }}>
                      Chưa có đánh giá nào. Hãy là người đầu tiên để lại cảm nhận về thiết kế này!
                    </div>
                  ) : (
                    <div>
                      {reviews.map((r, i) => (
                        <div key={r.id || i} className="pdp-review-item">
                          <div className="pdp-review-header">
                            <div>
                              <span className="pdp-reviewer-name">{r.userName || r.userFullName || 'Khách hàng ẩn danh'}</span>
                              <div style={{ color: 'var(--warm)', fontSize: 12, marginTop: 2 }}>
                                <Stars score={r.rating || 5} />
                              </div>
                            </div>
                            <span className="pdp-review-date">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong'}
                            </span>
                          </div>
                          <p className="pdp-review-text">{r.comment || 'Sản phẩm rất đẹp, chất vải mềm mát và đường may cực kỳ sắc sảo!'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── 4. RELATED PRODUCTS / COMPLETE THE LOOK ── */}
      {related.length > 0 && (
        <section className="section" style={{ paddingTop: 0, paddingBottom: 80 }}>
          <div className="container-fluid px-4 px-lg-5">
            <div className="editorial-header">
              <div className="editorial-header-left">
                <div className="editorial-subtitle">
                  <i className="bi bi-gem" /> HOÀN THIỆN PHONG CÁCH
                </div>
                <h2 className="editorial-title">
                  Các thiết kế<br /><em>cùng bộ sưu tập</em>
                </h2>
              </div>
              <a className="editorial-view-all" onClick={() => navigate('shop')}>
                Xem tất cả <i className="bi bi-arrow-right" />
              </a>
            </div>

            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} delay={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 5. STICKY BOTTOM ACTION BAR ── */}
      <div className={`pdp-sticky-bar ${isStickyVisible ? 'visible' : ''}`}>
        <div className="pdp-sticky-left">
          <img
            src={galleryImages[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=200&auto=format&fit=crop'}
            alt={product.name}
            className="pdp-sticky-thumb"
          />
          <div>
            <h4 className="pdp-sticky-title">{product.name}</h4>
            <div className="pdp-sticky-price">{fmt(currentPrice)}</div>
          </div>
        </div>

        <div className="pdp-sticky-right">
          {sizes.length > 0 && (
            <select
              className="pdp-sticky-size-select"
              value={selectedSize}
              onChange={e => selectVariant(e.target.value, selectedColor)}
            >
              {sizes.map(s => (
                <option key={s} value={s}>Kích cỡ: {s}</option>
              ))}
            </select>
          )}

          <button
            className="btn-hero-primary"
            style={{ height: 42, padding: '0 24px', fontSize: 11.5 }}
            onClick={handleAddToCart}
            disabled={currentStock <= 0}
          >
            <i className="bi bi-bag-plus" />
            {currentStock <= 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
          </button>
        </div>
      </div>

      {/* ── 6. INTERACTIVE SIZE GUIDE MODAL ── */}
      {showSizeGuide && (
        <div className="pdp-modal-backdrop" onClick={() => setShowSizeGuide(false)}>
          <div className="pdp-modal-card" onClick={e => e.stopPropagation()}>
            <button className="pdp-modal-close" onClick={() => setShowSizeGuide(false)}>
              <i className="bi bi-x-lg" />
            </button>
            <h3 className="pdp-modal-title">Bảng Quy Đổi Kích Cỡ Chuẩn</h3>
            <p className="pdp-modal-subtitle">
              Bảng kích thước tiêu chuẩn theo nhân trắc học phụ nữ và nam giới Việt Nam (Đơn vị tính: cm)
            </p>

            <table className="pdp-size-table">
              <thead>
                <tr>
                  <th>Kích cỡ</th>
                  <th>Rộng vai</th>
                  <th>Vòng ngực</th>
                  <th>Vòng eo</th>
                  <th>Vòng mông</th>
                  <th>Gợi ý Cân nặng</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Size S</strong></td>
                  <td>36 - 37</td>
                  <td>82 - 86</td>
                  <td>64 - 68</td>
                  <td>88 - 92</td>
                  <td>45 - 52 kg</td>
                </tr>
                <tr>
                  <td><strong>Size M</strong></td>
                  <td>37 - 38</td>
                  <td>86 - 90</td>
                  <td>68 - 72</td>
                  <td>92 - 96</td>
                  <td>52 - 58 kg</td>
                </tr>
                <tr>
                  <td><strong>Size L</strong></td>
                  <td>38 - 39</td>
                  <td>90 - 94</td>
                  <td>72 - 76</td>
                  <td>96 - 100</td>
                  <td>58 - 64 kg</td>
                </tr>
                <tr>
                  <td><strong>Size XL</strong></td>
                  <td>39 - 40</td>
                  <td>94 - 98</td>
                  <td>76 - 80</td>
                  <td>100 - 104</td>
                  <td>64 - 70 kg</td>
                </tr>
              </tbody>
            </table>

            <div style={{ background: '#FAF8F5', padding: '16px 20px', borderLeft: '3px solid var(--warm)', fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
              <strong>Lời khuyên từ Stylist Lyra:</strong> Nếu số đo của bạn nằm giữa 2 size, hãy ưu tiên chọn size lớn hơn để có độ rũ bay bổng thoải mái, hoặc liên hệ CSKH để được may đo điều chỉnh theo yêu cầu.
            </div>
          </div>
        </div>
      )}

      {/* ── 7. LIGHTBOX MODAL ── */}
      {lightboxImage && (
        <div className="pdp-lightbox-backdrop" onClick={() => setLightboxImage(null)}>
          <img src={lightboxImage} alt="Phóng to chi tiết" className="pdp-lightbox-img" />
        </div>
      )}

      {/* ── 8. FOOTER ── */}
      <Footer navigate={navigate} />
    </div>
  );
}
