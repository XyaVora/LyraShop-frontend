// src/pages/ProductDetailPage.jsx — trang chi tiết sản phẩm LYRA.
// Mọi tuỳ chọn (màu / size) lấy TỪ DỮ LIỆU sản phẩm, không còn hằng số dùng chung.
// A11y: radiogroup cho màu & size, tablist cho tab, lightbox và bảng size dùng Modal.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { isUuid } from '../services/shopContract.mjs';
import { loadProductDetail } from '../services/catalog';
import {
  REVIEWS_MOCK,
  fmt,
  relatedProducts,
  slugify,
} from '../data/products';
import { BRAND } from '../data/brand';
import {
  EmptyState,
  Footer,
  Pic,
  ProductCard,
  SectionHeader,
  Stars,
  isModifiedClick,
} from '../components/index.jsx';
import Modal from '../components/Modal.jsx';
import ImageLoupe from '../components/ImageLoupe.jsx';
import { buildUrl } from '../router.js';
import '../styles/detail.css';

/* ══════════════════════════════════════════════════════════════════
   Hằng số cấp module (không phụ thuộc render)
   ══════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: 'desc', label: 'Mô tả' },
  { id: 'spec', label: 'Thông số' },
  { id: 'review', label: 'Đánh giá' },
];

/** Bảng size theo nhóm danh mục — khớp SIZE_SETS trong data/products.js. */
const SIZE_GUIDES = {
  clothing: {
    title: 'Bảng size quần áo',
    cols: ['Size', 'Ngực (cm)', 'Eo (cm)', 'Mông (cm)', 'Gợi ý'],
    rows: [
      ['XS', '78 – 82', '60 – 64', '84 – 88', '1m50 – 1m55 · 40 – 45kg'],
      ['S', '82 – 86', '64 – 68', '88 – 92', '1m55 – 1m60 · 45 – 50kg'],
      ['M', '86 – 90', '68 – 72', '92 – 96', '1m58 – 1m65 · 50 – 56kg'],
      ['L', '90 – 95', '72 – 77', '96 – 101', '1m62 – 1m70 · 56 – 63kg'],
      ['XL', '95 – 100', '77 – 83', '101 – 107', '1m66 – 1m75 · 63 – 70kg'],
    ],
    note: 'Số đo lấy trên cơ thể, chưa cộng độ rộng thoải mái. Nếu số đo của bạn nằm giữa hai size, LYRA khuyên chọn size lớn hơn với dáng suông và size nhỏ hơn với dáng ôm.',
  },
  shoes: {
    title: 'Bảng size giày',
    cols: ['Size', 'Dài bàn chân (cm)', 'Tương đương EU'],
    rows: [
      ['36', '22,5 – 23,0', 'EU 36'],
      ['37', '23,0 – 23,5', 'EU 37'],
      ['38', '23,5 – 24,3', 'EU 38'],
      ['39', '24,3 – 25,0', 'EU 39'],
      ['40', '25,0 – 25,7', 'EU 40'],
      ['41', '25,7 – 26,4', 'EU 41'],
    ],
    note: 'Đo chiều dài bàn chân vào buổi chiều, khi chân nở nhất. Bàn chân bè hoặc mu cao nên chọn tăng nửa size.',
  },
  accessories: {
    title: 'Kích thước phụ kiện',
    cols: ['Size', 'Áp dụng cho', 'Ghi chú'],
    rows: [
      ['Free size', 'Túi, ví, thắt lưng', 'Kích thước cụ thể xem ở tab Thông số'],
    ],
    note: 'Phụ kiện của LYRA làm theo một kích thước duy nhất. Thắt lưng có 5 lỗ chỉnh, cách nhau 2,5cm.',
  },
};

/** Danh mục → nhóm bảng size. */
function sizeGroupOf(cat) {
  if (cat === 'Giày dép') return 'shoes';
  if (cat === 'Phụ kiện') return 'accessories';
  return 'clothing';
}

/** ISO 'YYYY-MM-DD' (hoặc ISO đầy đủ) → 'DD/MM/YYYY'. */
function formatDate(iso) {
  const s = String(iso || '');
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Điều hướng con trỏ trong một nhóm radio (mũi tên + Home/End). */
function radioKeyIndex(key, current, count) {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (current + 1) % count;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (current - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return -1;
}

/* ══════════════════════════════════════════════════════════════════
   TRANG
   ══════════════════════════════════════════════════════════════════ */

export default function ProductDetailPage() {
  const { navigate, selectedProduct, user, params } = useApp();
  const {
    addToCart,
    toggleWishlist,
    isWishlisted,
    showToast,
    addRecentlyViewed,
    recentlyViewed,
  } = useCart();

  const [liveProduct, setLiveProduct] = useState(null);
  const [liveLoading, setLiveLoading] = useState(() => isUuid(params?.product) && !selectedProduct);
  const product = liveProduct || selectedProduct;

  useEffect(() => {
    const id = params?.product;
    if (!isUuid(id)) {
      setLiveProduct(null);
      setLiveLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLiveLoading(true);
    loadProductDetail(id)
      .then((mapped) => {
        if (cancelled) return;
        setLiveProduct(mapped || null);
        setLiveLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLiveProduct(null);
        setLiveLoading(false);
      });
    return () => { cancelled = true; };
  }, [params?.product]);

  /* ── State (App remount theo key={slug} nên state luôn khớp sản phẩm) ── */
  const sizes = useMemo(
    () => (Array.isArray(product?.sizes) && product.sizes.length ? product.sizes : ['Free size']),
    [product],
  );
  const colors = useMemo(
    () => (Array.isArray(product?.colors) && product.colors.length
      ? product.colors
      : [{ name: 'Mặc định', hex: product?.color || '#E9E2D6' }]),
    [product],
  );
  const images = useMemo(
    () => (Array.isArray(product?.images) ? product.images.filter(Boolean) : []),
    [product],
  );

  // Size mặc định lấy giữa bộ size — đúng như CartContext để giỏ hàng nhất quán.
  const [sizeIdx, setSizeIdx] = useState(() => Math.floor(sizes.length / 2));
  const [colorIdx, setColorIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('desc');
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(-1);       // -1 = đóng
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [myReviews, setMyReviews] = useState([]);      // đánh giá vừa viết (state cục bộ)

  const uid = useId();
  const tabsRef = useRef(null);

  const stock = Math.max(0, Number(product?.stock) || 0);
  const outOfStock = stock === 0;
  const lowStock = stock > 0 && stock <= 5;

  const selectedSize = sizes[Math.min(sizeIdx, sizes.length - 1)];
  const selectedColor = colors[Math.min(colorIdx, colors.length - 1)];

  /* ── Ghi nhận "đã xem gần đây" ─────────────────────────────────── */
  useEffect(() => {
    if (product?.id !== undefined) addRecentlyViewed(product.id);
  }, [product?.id, addRecentlyViewed]);

  /* ── Lightbox: phím ← / → chuyển ảnh ───────────────────────────── */
  useEffect(() => {
    if (lightbox < 0 || images.length < 2) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setLightbox((i) => (i + 1) % images.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setLightbox((i) => (i - 1 + images.length) % images.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, images.length]);

  /* ── Đánh giá ──────────────────────────────────────────────────── */
  const baseReviews = useMemo(() => {
    const list = product ? REVIEWS_MOCK[product.id] : null;
    return Array.isArray(list) ? list : [];
  }, [product]);

  const reviews = useMemo(() => [...myReviews, ...baseReviews], [myReviews, baseReviews]);

  // Phân bố sao tính THẬT từ các đánh giá đang hiển thị (không bịa tỉ lệ).
  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      const i = Math.round(Number(r.rating) || 0);
      if (i >= 1 && i <= 5) counts[i - 1] += 1;
    });
    return counts;
  }, [reviews]);

  const related = useMemo(() => (product ? relatedProducts(product, 4) : []), [product]);
  const recent = useMemo(
    () => (recentlyViewed || []).filter((p) => p.id !== product?.id).slice(0, 8),
    [recentlyViewed, product],
  );

  /* ── Hành động ─────────────────────────────────────────────────── */
  const handleAdd = useCallback(() => {
    if (!product || outOfStock) return;
    addToCart(product, qty, selectedSize, selectedColor.name);
  }, [product, outOfStock, addToCart, qty, selectedSize, selectedColor]);

  const handleBuyNow = useCallback(() => {
    if (!product || outOfStock) return;
    addToCart(product, qty, selectedSize, selectedColor.name, { openDrawer: false });
    navigate('checkout');
  }, [product, outOfStock, addToCart, qty, selectedSize, selectedColor, navigate]);

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(url);
      showToast('Đã sao chép liên kết sản phẩm', 'bi-link-45deg');
    } catch {
      showToast('Không sao chép được liên kết. Bạn có thể sao chép từ thanh địa chỉ.', 'bi-exclamation-circle');
    }
  }, [showToast]);

  const goto = useCallback((page, params = {}) => (e) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    navigate(page, params);
  }, [navigate]);

  const onTabKey = (e) => {
    const next = radioKeyIndex(e.key, TABS.findIndex((t) => t.id === activeTab), TABS.length);
    if (next < 0) return;
    e.preventDefault();
    setActiveTab(TABS[next].id);
    const nodes = tabsRef.current?.querySelectorAll('[role="tab"]');
    nodes?.[next]?.focus();
  };

  const onOptionKey = (e, count, current, choose) => {
    const next = radioKeyIndex(e.key, current, count);
    if (next < 0) return;
    e.preventDefault();
    choose(next);
    const group = e.currentTarget.closest('[role="radiogroup"]');
    const nodes = group?.querySelectorAll('[role="radio"]');
    nodes?.[next]?.focus();
  };

  /* ── Không tìm thấy sản phẩm ───────────────────────────────────── */
  if (!product && liveLoading) {
    return (
      <div className="detail-page">
        <section className="section">
          <div className="wrap">
            <EmptyState icon="bi-hourglass-split" title="Đang tải sản phẩm" sub="Đang lấy chi tiết và biến thể từ máy chủ LYRA." />
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="detail-page">
        <section className="section">
          <div className="wrap">
            <EmptyState
              icon="bi-bag-x"
              title="Không tìm thấy sản phẩm"
              sub="Sản phẩm bạn tìm có thể đã ngừng kinh doanh hoặc đường dẫn không còn đúng."
              action={{ label: 'Về cửa hàng', onClick: () => navigate('shop') }}
            >
              <button type="button" className="btn-outline-lyra" onClick={() => navigate('home')}>
                Về trang chủ
              </button>
            </EmptyState>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const wished = isWishlisted(product.id);
  const catSlug = slugify(product.cat);
  const guide = SIZE_GUIDES[sizeGroupOf(product.cat)];
  const sku = `LY-${String(product.id).padStart(3, '0')}-2026`;
  const hasSale = product.oldPrice > product.price;

  const specRows = [
    ['Chất liệu', product.material],
    ['Xuất xứ', product.origin],
    ['Kiểu dáng', product.fit],
    ['Bảo quản', product.care],
    ['Danh mục', product.cat],
    ['Thương hiệu', product.brand],
    ['Mã sản phẩm', sku],
  ].filter(([, v]) => Boolean(v));

  return (
    <div className="detail-page has-buy-bar">
      <div className="detail-layout">
        {/* ── Gallery ──────────────────────────────────────────── */}
        <div className="detail-gallery-col">
          <div className="gallery-main-view">
            <ImageLoupe
              src={images[activeImg]}
              alt={`${product.name} — ảnh ${activeImg + 1}`}
              tint={product.color}
              icon={product.icon}
              sizes="(max-width: 1024px) 100vw, 50vw"
              onFallbackClick={() => setLightbox(activeImg)}
            />
            <span className="gallery-zoom-hint" aria-hidden="true">
              <i className="bi bi-search" /> Di chuột để phóng to
            </span>
          </div>

          {images.length > 1 && (
            <div className="gallery-thumbnails" role="group" aria-label="Chọn ảnh sản phẩm">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  className={`gallery-thumb${activeImg === i ? ' active' : ''}`}
                  aria-label={`Xem ảnh ${i + 1} của ${product.name}`}
                  aria-pressed={activeImg === i}
                  onClick={() => setActiveImg(i)}
                >
                  <Pic as="span" src={src} alt="" tint={product.color} icon={product.icon} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Thông tin ────────────────────────────────────────── */}
        <div className="detail-info-col">
          <nav className="detail-breadcrumb" aria-label="Đường dẫn">
            <ol className="detail-crumbs">
              <li>
                <a href={buildUrl('home', {})} onClick={goto('home')}>Trang chủ</a>
              </li>
              <li>
                <a href={buildUrl('shop', {})} onClick={goto('shop')}>Cửa hàng</a>
              </li>
              <li>
                <a href={buildUrl('shop', { cat: catSlug })} onClick={goto('shop', { cat: catSlug })}>
                  {product.cat}
                </a>
              </li>
              <li aria-current="page">{product.name}</li>
            </ol>
          </nav>

          <div className="eyebrow">{BRAND.name} · {BRAND.season}</div>
          <h1 className="detail-product-name">{product.name}</h1>

          <div className="detail-rating-row">
            <Stars rating={product.rating} size={12} />
            <span className="rating-count-text">
              {product.rating.toFixed(1).replace('.', ',')} · {product.reviews} đánh giá · đã bán {product.sold}
            </span>
          </div>

          <div className="detail-price-block">
            <span className="detail-main-price">{fmt(product.price)}</span>
            {hasSale && (
              <>
                <span className="detail-old-price">{fmt(product.oldPrice)}</span>
                <span className="detail-discount-tag">−{product.discount}%</span>
              </>
            )}
          </div>

          {/* Màu sắc */}
          <div className="option-row-label" id={`${uid}-color`}>
            Màu sắc — <span className="selected-val">{selectedColor.name}</span>
          </div>
          <div className="color-options" role="radiogroup" aria-labelledby={`${uid}-color`}>
            {colors.map((c, i) => (
              <button
                key={c.name}
                type="button"
                role="radio"
                aria-checked={colorIdx === i}
                aria-label={c.name}
                tabIndex={colorIdx === i ? 0 : -1}
                className={`color-option-btn${colorIdx === i ? ' active' : ''}`}
                style={{ background: c.hex }}
                onClick={() => setColorIdx(i)}
                onKeyDown={(e) => onOptionKey(e, colors.length, colorIdx, setColorIdx)}
              />
            ))}
          </div>

          {/* Kích thước */}
          <div className="option-row-label" id={`${uid}-size`}>
            Kích thước — <span className="selected-val">{selectedSize}</span>
            <button type="button" className="size-guide-link" onClick={() => setSizeGuideOpen(true)}>
              Hướng dẫn chọn size
            </button>
          </div>
          <div className="size-grid" role="radiogroup" aria-labelledby={`${uid}-size`}>
            {sizes.map((s, i) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={sizeIdx === i}
                tabIndex={sizeIdx === i ? 0 : -1}
                className={`size-option-btn${sizeIdx === i ? ' active' : ''}`}
                onClick={() => setSizeIdx(i)}
                onKeyDown={(e) => onOptionKey(e, sizes.length, sizeIdx, setSizeIdx)}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Số lượng */}
          <div className="option-row-label" id={`${uid}-qty`}>Số lượng</div>
          <div className="detail-qty-row">
            <div className="qty-controller" role="group" aria-labelledby={`${uid}-qty`}>
              <button
                type="button"
                className="qty-step"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1 || outOfStock}
                aria-label="Giảm số lượng"
              >
                −
              </button>
              <output className="qty-display" aria-live="polite">{qty}</output>
              <button
                type="button"
                className="qty-step"
                onClick={() => setQty((q) => Math.min(Math.max(1, stock), q + 1))}
                disabled={qty >= stock || outOfStock}
                aria-label="Tăng số lượng"
              >
                +
              </button>
            </div>
            <span className={`stock-note${lowStock || outOfStock ? ' low' : ''}`}>
              {outOfStock
                ? 'Tạm hết hàng'
                : lowStock
                  ? `Chỉ còn ${stock} sản phẩm`
                  : `Còn ${stock} sản phẩm`}
            </span>
          </div>

          {/* CTA */}
          <div className="detail-cta-row">
            <button type="button" className="btn-add-to-cart" onClick={handleAdd} disabled={outOfStock}>
              <i className="bi bi-bag-plus" aria-hidden="true" />{' '}
              {outOfStock ? 'Tạm hết hàng' : 'Thêm vào giỏ hàng'}
            </button>
            <button
              type="button"
              className={`btn-icon${wished ? ' active' : ''}`}
              onClick={() => toggleWishlist(product)}
              aria-pressed={wished}
              aria-label={wished ? `Bỏ yêu thích ${product.name}` : `Thêm ${product.name} vào yêu thích`}
            >
              <i className={`bi bi-heart${wished ? '-fill' : ''}`} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={handleShare}
              aria-label="Sao chép liên kết sản phẩm"
            >
              <i className="bi bi-share" aria-hidden="true" />
            </button>
          </div>

          <button type="button" className="btn-warm detail-buynow" onClick={handleBuyNow} disabled={outOfStock}>
            Mua ngay <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>

          {/* Cam kết */}
          <div className="detail-perks">
            {BRAND.promises.map((p) => (
              <div key={p.title} className="perk-item">
                <i className={`bi ${p.icon} perk-icon`} aria-hidden="true" />
                <span><strong className="perk-title">{p.title}</strong> — {p.sub}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="detail-tabs" role="tablist" aria-label="Thông tin sản phẩm" ref={tabsRef}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`${uid}-tab-${t.id}`}
                aria-selected={activeTab === t.id}
                aria-controls={`${uid}-panel-${t.id}`}
                tabIndex={activeTab === t.id ? 0 : -1}
                className={`detail-tab-btn${activeTab === t.id ? ' active' : ''}`}
                onClick={() => setActiveTab(t.id)}
                onKeyDown={onTabKey}
              >
                {t.id === 'review' ? `${t.label} (${product.reviews})` : t.label}
              </button>
            ))}
          </div>

          {/* Tab: Mô tả */}
          <div
            role="tabpanel"
            id={`${uid}-panel-desc`}
            aria-labelledby={`${uid}-tab-desc`}
            tabIndex={0}
            className={`tab-pane detail-description${activeTab === 'desc' ? ' active' : ''}`}
          >
            <p>{product.desc}</p>
            <ul className="detail-bullets">
              {product.material && <li><strong>Chất liệu:</strong> {product.material}</li>}
              {product.fit && <li><strong>Kiểu dáng:</strong> {product.fit}</li>}
              {product.care && <li><strong>Bảo quản:</strong> {product.care}</li>}
            </ul>
            {Array.isArray(product.tags) && product.tags.length > 0 && (
              <div className="detail-tags" aria-label="Từ khoá sản phẩm">
                {product.tags.map((t) => (
                  <span key={t} className="detail-tag">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Tab: Thông số */}
          <div
            role="tabpanel"
            id={`${uid}-panel-spec`}
            aria-labelledby={`${uid}-tab-spec`}
            tabIndex={0}
            className={`tab-pane${activeTab === 'spec' ? ' active' : ''}`}
          >
            <div className="spec-list">
              {specRows.map(([k, v]) => (
                <div key={k} className="spec-row">
                  <span className="spec-key">{k}</span>
                  <span className="spec-val">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tab: Đánh giá */}
          <div
            role="tabpanel"
            id={`${uid}-panel-review`}
            aria-labelledby={`${uid}-tab-review`}
            tabIndex={0}
            className={`tab-pane${activeTab === 'review' ? ' active' : ''}`}
          >
            <div className="review-summary">
              <div className="review-score">
                <div className="review-score-num">{product.rating.toFixed(1).replace('.', ',')}</div>
                <Stars rating={product.rating} size={11} />
                <div className="review-score-sub">{product.reviews} đánh giá</div>
              </div>
              <div className="rating-bars">
                <div className="rating-bars-cap">
                  Phân bố {reviews.length} đánh giá đang hiển thị
                </div>
                {[5, 4, 3, 2, 1].map((r) => {
                  const count = distribution[r - 1];
                  const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                  return (
                    <div key={r} className="rating-bar-row">
                      <span className="rating-bar-label">{r} <i className="bi bi-star-fill" aria-hidden="true" /></span>
                      <div className="rating-bar-track">
                        <div className="rating-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="rating-bar-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="review-actions">
              <button type="button" className="btn-outline-lyra btn-sm" onClick={() => setReviewOpen(true)}>
                <i className="bi bi-pencil" aria-hidden="true" /> Viết đánh giá
              </button>
            </div>

            {reviews.length === 0 ? (
              <EmptyState
                icon="bi-chat-quote"
                title="Chưa có đánh giá"
                sub="Hãy là người đầu tiên chia sẻ cảm nhận về sản phẩm này."
              />
            ) : (
              <ul className="review-list">
                {reviews.map((r, i) => (
                  <li key={`${r.name}-${r.date}-${i}`} className="review-item">
                    <div className="review-item-head">
                      <span className="review-author">
                        {r.name}
                        {r.mine && <span className="review-mine">Đánh giá của bạn</span>}
                      </span>
                      <span className="review-date">{formatDate(r.date)}</span>
                    </div>
                    <Stars rating={r.rating} size={11} />
                    <p className="review-text">{r.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Gợi ý ──────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="section detail-suggest">
          <div className="wrap">
            <SectionHeader
              eyebrow="Gợi ý cho bạn"
              title={<>Có thể<br /><em>bạn thích</em></>}
              link={{ label: `Xem ${product.cat}`, page: 'shop', params: { cat: catSlug } }}
            />
            <div className="products-grid">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Đã xem gần đây ─────────────────────────────────────── */}
      {recent.length > 0 && (
        <section className="section-sm detail-recent">
          <div className="wrap">
            <SectionHeader eyebrow="Lịch sử" title={<>Đã xem <em>gần đây</em></>} />
            <div className="scroll-row">
              {recent.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Thanh mua dính đáy (≤768px) ────────────────────────── */}
      <div className="buy-bar">
        <div className="buy-bar-info">
          <div className="buy-bar-price">{fmt(product.price)}</div>
          <div className="buy-bar-meta">{selectedSize} · {selectedColor.name}</div>
        </div>
        <button type="button" className="btn-lyra" onClick={handleAdd} disabled={outOfStock}>
          {outOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
        </button>
      </div>

      <Footer />

      {/* ── Lightbox ───────────────────────────────────────────── */}
      <Modal
        open={lightbox >= 0}
        onClose={() => setLightbox(-1)}
        size="lightbox"
        className="detail-lightbox"
        label={`Ảnh sản phẩm ${product.name}`}
      >
        <div className="lightbox-stage">
          {images.length > 1 && (
            <button
              type="button"
              className="lightbox-nav prev"
              onClick={() => setLightbox((i) => (i - 1 + images.length) % images.length)}
              aria-label="Ảnh trước"
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
          )}
          <Pic
            src={images[Math.max(0, lightbox)]}
            alt={`${product.name} — ảnh ${Math.max(0, lightbox) + 1}`}
            ratio="3/4"
            tint={product.color}
            icon={product.icon}
            eager
            className="lightbox-pic"
          />
          {images.length > 1 && (
            <button
              type="button"
              className="lightbox-nav next"
              onClick={() => setLightbox((i) => (i + 1) % images.length)}
              aria-label="Ảnh tiếp theo"
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          )}
        </div>
        <p className="lightbox-caption">
          {product.name} — ảnh {Math.max(0, lightbox) + 1}/{images.length || 1}
          {images.length > 1 && <span className="lightbox-hint"> · dùng phím ← → để chuyển ảnh</span>}
        </p>
      </Modal>

      {/* ── Bảng size ──────────────────────────────────────────── */}
      <Modal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        title={guide.title}
        size="lg"
        footer={
          <button type="button" className="btn-lyra" onClick={() => setSizeGuideOpen(false)}>
            Đã hiểu
          </button>
        }
      >
        <div className="table-scroll">
          <table className="size-table">
            <thead>
              <tr>{guide.cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
            </thead>
            <tbody>
              {guide.rows.map((row) => (
                <tr key={row[0]} className={row[0] === selectedSize ? 'is-current' : undefined}>
                  {row.map((cell, i) => (
                    i === 0
                      ? <th key={cell} scope="row">{cell}</th>
                      : <td key={`${row[0]}-${i}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="size-guide-note">{guide.note}</p>
      </Modal>

      {/* ── Viết đánh giá ──────────────────────────────────────── */}
      <ReviewFormModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        defaultName={user?.name || ''}
        productName={product.name}
        onSubmit={(review) => {
          setMyReviews((prev) => [review, ...prev]);
          setReviewOpen(false);
          setActiveTab('review');
          showToast('Cảm ơn bạn đã gửi đánh giá!', 'bi-chat-heart');
        }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Form viết đánh giá — state cục bộ, không đụng tới context
   ══════════════════════════════════════════════════════════════════ */
function ReviewFormModal({ open, onClose, onSubmit, defaultName, productName }) {
  const [name, setName] = useState(defaultName);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [errors, setErrors] = useState({});
  const uid = useId();

  // Mở lại form → dọn sạch nội dung cũ.
  useEffect(() => {
    if (open) {
      setName(defaultName);
      setRating(5);
      setText('');
      setErrors({});
    }
  }, [open, defaultName]);

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!name.trim()) next.name = 'Vui lòng nhập tên hiển thị.';
    if (text.trim().length < 10) next.text = 'Nội dung đánh giá cần ít nhất 10 ký tự.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    onSubmit({ name: name.trim(), date, rating, text: text.trim(), mine: true });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Viết đánh giá"
      footer={
        <>
          <button type="button" className="btn-outline-lyra" onClick={onClose}>Huỷ</button>
          <button type="submit" form={`${uid}-form`} className="btn-lyra">Gửi đánh giá</button>
        </>
      }
    >
      <form id={`${uid}-form`} onSubmit={submit} noValidate className="review-form">
        <p className="review-form-lead">
          Chia sẻ cảm nhận của bạn về <strong>{productName}</strong> để giúp khách hàng khác chọn đúng hơn.
        </p>

        <div className="review-field">
          <span className="review-label" id={`${uid}-rate`}>Số sao</span>
          <div className="review-stars-input" role="radiogroup" aria-labelledby={`${uid}-rate`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} sao`}
                tabIndex={rating === n ? 0 : -1}
                className={`review-star-btn${n <= rating ? ' on' : ''}`}
                onClick={() => setRating(n)}
                onKeyDown={(e) => {
                  const next = radioKeyIndex(e.key, rating - 1, 5);
                  if (next < 0) return;
                  e.preventDefault();
                  setRating(next + 1);
                  const nodes = e.currentTarget.closest('[role="radiogroup"]')?.querySelectorAll('[role="radio"]');
                  nodes?.[next]?.focus();
                }}
              >
                <i className={`bi bi-star${n <= rating ? '-fill' : ''}`} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <div className="review-field">
          <label className="review-label" htmlFor={`${uid}-name`}>Tên hiển thị</label>
          <input
            id={`${uid}-name`}
            className="review-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Nguyễn Thu Hà"
            aria-invalid={errors.name ? 'true' : undefined}
            aria-describedby={errors.name ? `${uid}-name-err` : undefined}
          />
          {errors.name && <p className="field-error" id={`${uid}-name-err`}>{errors.name}</p>}
        </div>

        <div className="review-field">
          <label className="review-label" htmlFor={`${uid}-text`}>Nội dung</label>
          <textarea
            id={`${uid}-text`}
            className="review-input review-textarea"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Chất liệu, form dáng, size có đúng không…"
            aria-invalid={errors.text ? 'true' : undefined}
            aria-describedby={errors.text ? `${uid}-text-err` : undefined}
          />
          {errors.text && <p className="field-error" id={`${uid}-text-err`}>{errors.text}</p>}
        </div>
      </form>
    </Modal>
  );
}
