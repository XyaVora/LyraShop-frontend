// src/pages/HomePage.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { productApi, categoryApi } from '../services/api';
import { normalizeProduct, normalizeCategory, fmt } from '../data/products';
import { ProductCard, Marquee, Newsletter, Footer } from '../components/index.jsx';
import '../styles/home.css';

// Fallback high-fashion editorial imagery for categories
const CATEGORY_EDITORIAL_META = {
  'thoi-trang-nu': {
    tag: 'BST NỮ 2026',
    count: '32+ Thiết kế',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop',
  },
  'thoi-trang-nam': {
    tag: 'SARTORIAL MEN',
    count: '28+ Mẫu may đo',
    image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=800&auto=format&fit=crop',
  },
  'giay-dep': {
    tag: 'ATELIER FOOTWEAR',
    count: '16+ Mẫu da thủ công',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop',
  },
  'phu-kien': {
    tag: 'SIGNATURE PIECES',
    count: '24+ Phụ kiện cao cấp',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop',
  },
  default: {
    tag: 'LYRA COLLECTION',
    count: 'Tuyển chọn độc quyền',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop',
  },
};

// "Shop The Look" ensemble data
const ENSEMBLE_ITEMS = [
  {
    id: 'look-1',
    name: 'Áo Blazer Linen Dáng Rộng Cổ Điển',
    category: 'Áo khoác',
    price: 1680000,
    thumb: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=300&auto=format&fit=crop',
    top: '32%',
    left: '48%',
    slug: 'ao-khoac-trench-coat-nu-dang-dai',
  },
  {
    id: 'look-2',
    name: 'Quần Wide-Leg Xếp Ly Đôi Lưng Cao',
    category: 'Quần dài',
    price: 620000,
    thumb: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=300&auto=format&fit=crop',
    top: '64%',
    left: '52%',
    slug: 'quan-tay-nu-ong-rong-xep-ly-doi',
  },
  {
    id: 'look-3',
    name: 'Túi Tote Da Thật Đựng Vừa Laptop',
    category: 'Phụ kiện',
    price: 1550000,
    thumb: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=300&auto=format&fit=crop',
    top: '55%',
    left: '26%',
    slug: 'tui-tote-nu-da-that-co-lon',
  },
];

export default function HomePage() {
  const { navigate } = useApp();
  const { showToast, addToCart } = useCart();

  const [featured, setFeatured]             = useState([]);
  const [newArrivals, setNewArrivals]       = useState([]);
  const [categories, setCategories]         = useState([]);
  const [allProducts, setAllProducts]       = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading]               = useState(true);
  const [loadError, setLoadError]           = useState('');
  const [reloadKey, setReloadKey]           = useState(0);
  const [voucherCopied, setVoucherCopied]   = useState(false);
  const [activeLookItem, setActiveLookItem] = useState(ENSEMBLE_ITEMS[0]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError('');
      const [productResult, featuredResult, categoryResult] = await Promise.allSettled([
        retryRequest(() => productApi.list({ sort: 'createdAt,desc', size: 16 })),
        retryRequest(() => productApi.featured(8)),
        retryRequest(() => categoryApi.list()),
      ]);
      if (cancelled) return;

      const latest = productResult.status === 'fulfilled'
        ? (productResult.value.data?.content || []).map((product, index) => normalizeProduct(product, index))
        : [];
      const highlighted = featuredResult.status === 'fulfilled'
        ? (featuredResult.value.data || []).map((product, index) => normalizeProduct(product, index))
        : [];

      setAllProducts(latest.length ? latest : highlighted);
      setFeatured((highlighted.length ? highlighted : latest).slice(0, 8));
      setNewArrivals((latest.length ? latest : highlighted).slice(0, 8));

      if (categoryResult.status === 'fulfilled') {
        setCategories((categoryResult.value.data || []).map(normalizeCategory));
      }
      if (!latest.length && !highlighted.length) {
        setLoadError('Không thể tải sản phẩm. Vui lòng kiểm tra backend và thử lại.');
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [reloadKey]);

  // Handle voucher copy
  const handleCopyVoucher = () => {
    navigator.clipboard?.writeText('LYRA10');
    setVoucherCopied(true);
    showToast('Đã sao chép mã ưu đãi LYRA10 (-10%) thành công!', 'success');
    setTimeout(() => setVoucherCopied(false), 3500);
  };

  // Filtered products for Featured section
  const filteredProducts = selectedFilter === 'all'
    ? featured
    : featured.filter(p => {
        if (!p.categoryId && !p.cat) return false;
        return String(p.categoryId) === String(selectedFilter) ||
               (p.cat && p.cat.toLowerCase().includes(selectedFilter.toLowerCase()));
      });

  return (
    <div className="home-page-root">
      {/* ── 1. EDITORIAL HERO SECTION ── */}
      <section className="home-hero">
        <div className="home-hero-left">
          <div className="home-hero-eyebrow">
            BST XUÂN HÈ 2026 • LA POÉSIE DE LA SOIE
          </div>
          <h1 className="home-hero-title">
            Vẻ đẹp vĩnh cửu<br />
            trong từng<br />
            <em>đường may</em>
          </h1>
          <p className="home-hero-subtitle">
            Nơi chuẩn mực may đo Savile Row giao hòa cùng chất lụa tơ tằm và linen hữu cơ cao cấp. 
            Mỗi thiết kế của Lyra tôn vinh phong thái đĩnh đạc và phong cách tối giản thanh lịch của bạn.
          </p>
          <div className="home-hero-actions">
            <button className="btn-hero-primary" onClick={() => navigate('shop')}>
              Khám phá Bộ sưu tập <i className="bi bi-arrow-right" />
            </button>
            <button className="btn-hero-secondary" onClick={() => navigate('shop', { filter: 'lookbook' })}>
              Xem Lookbook 2026
            </button>
          </div>
          <div className="home-hero-guarantees">
            <div className="hero-guarantee-item">
              <span className="star-bullet">✦</span> 100% Lụa & Linen tuyển chọn
            </div>
            <div className="hero-guarantee-item">
              <span className="star-bullet">✦</span> May đo giới hạn (Limited Drop)
            </div>
            <div className="hero-guarantee-item">
              <span className="star-bullet">✦</span> Đổi size 30 ngày tận nơi
            </div>
          </div>
        </div>

        <div className="home-hero-right">
          <div className="hero-visual-container">
            <img
              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop"
              alt="Lyra Summer Lookbook"
              className="hero-visual-img"
            />
            <div className="hero-visual-overlay" />
            <div className="hero-top-badge">
              SS26 PRIVATE DROP • LIMITED EDITION
            </div>
            <div
              className="hero-floating-card"
              onClick={() => navigate('shop', { cat: 'thoi-trang-nu' })}
            >
              <div>
                <div className="hero-floating-label">FEATURED LOOKBOOK PIECE</div>
                <h3 className="hero-floating-title">Áo Sơ Mi Silk Étoile</h3>
                <div className="hero-floating-price">890.000₫ • 100% Tơ lụa tự nhiên</div>
              </div>
              <div className="hero-floating-btn">
                <i className="bi bi-arrow-up-right" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. MARQUEE BANNER ── */}
      <Marquee />

      {/* ── 3. CURATED CATEGORIES SECTION ── */}
      <section className="section" style={{ padding: '88px 0' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div className="editorial-header">
            <div className="editorial-header-left">
              <div className="editorial-subtitle">
                <i className="bi bi-grid" /> BỘ SƯU TẬP THEO PHONG CÁCH
              </div>
              <h2 className="editorial-title">
                Mua sắm theo<br /><em>danh mục tuyển chọn</em>
              </h2>
            </div>
            <a className="editorial-view-all" onClick={() => navigate('shop')}>
              Xem tất cả danh mục <i className="bi bi-arrow-right" />
            </a>
          </div>

          {loading ? (
            <div className="curated-cat-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="curated-cat-card skeleton" style={{ height: 380 }} />
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="curated-cat-grid">
              {categories.slice(0, 4).map((cat) => {
                const meta = CATEGORY_EDITORIAL_META[cat.slug] || CATEGORY_EDITORIAL_META.default;
                return (
                  <div
                    key={cat.id}
                    className="curated-cat-card"
                    onClick={() => navigate('shop', { cat: cat.slug })}
                  >
                    <img
                      src={meta.image}
                      alt={cat.name}
                      className="curated-cat-img"
                    />
                    <div className="curated-cat-gradient" />
                    <div className="curated-cat-content">
                      <div className="curated-cat-tag">{meta.tag}</div>
                      <h3 className="curated-cat-name">{cat.name}</h3>
                      <div className="curated-cat-link">
                        <span>{cat.description || meta.count}</span>
                        <i className="bi bi-arrow-right" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
              Chưa có danh mục nào trên hệ thống
            </div>
          )}
        </div>
      </section>

      {/* ── 4. FEATURED PRODUCTS WITH FILTER TABS ── */}
      <section className="section" style={{ paddingTop: 0, paddingBottom: 88 }}>
        <div className="container-fluid px-4 px-lg-5">
          <div className="editorial-header">
            <div className="editorial-header-left">
              <div className="editorial-subtitle">
                <i className="bi bi-stars" /> NỔI BẬT TRONG TUẦN
              </div>
              <h2 className="editorial-title">
                Những thiết kế<br /><em>được yêu thích nhất</em>
              </h2>
            </div>
            <a className="editorial-view-all" onClick={() => navigate('shop')}>
              Xem toàn bộ sản phẩm <i className="bi bi-arrow-right" />
            </a>
          </div>

          {/* Category Filter Pills */}
          <div className="home-filter-tabs">
            <button
              className={`home-filter-pill ${selectedFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('all')}
            >
              Tất cả thiết kế
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`home-filter-pill ${selectedFilter === String(cat.id) ? 'active' : ''}`}
                onClick={() => setSelectedFilter(String(cat.id))}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="product-card skeleton" style={{ height: 340 }} />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--muted)' }}>
              <div>{loadError || 'Chưa có sản phẩm phù hợp cho danh mục này'}</div>
              {loadError && (
                <button className="btn-hero-secondary mt-3" onClick={() => setReloadKey(v => v + 1)}>
                  Thử lại
                </button>
              )}
            </div>
          ) : (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {filteredProducts.slice(0, 8).map((p, i) => (
                <ProductCard key={p.id} product={p} delay={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 5. "SHOP THE LOOK" CURATED ENSEMBLE ── */}
      <section className="shop-the-look-section">
        <div className="container-fluid px-4 px-lg-5">
          <div className="look-grid">
            {/* Lookbook Visual with Hotspots */}
            <div className="look-visual-wrap">
              <img
                src="https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?q=80&w=1200&auto=format&fit=crop"
                alt="Parisian Summer Ensemble"
                className="look-visual-img"
              />
              <div className="look-badge">LOOKBOOK EDIT NO. 04</div>

              {ENSEMBLE_ITEMS.map((item, idx) => (
                <div
                  key={item.id}
                  className="look-hotspot"
                  style={{ top: item.top, left: item.left }}
                  onClick={() => setActiveLookItem(item)}
                  title={item.name}
                >
                  {idx + 1}
                </div>
              ))}
            </div>

            {/* Look Description & Item Breakdown */}
            <div className="look-details-wrap">
              <div className="look-tag-top">CURATED STYLING • BỘ PHỐI MÙA HÈ</div>
              <h2 className="look-main-title">
                The Parisian<br />
                <em>Summer Ensemble</em>
              </h2>
              <p className="look-desc">
                Sự kết hợp hoàn hảo giữa nét phóng khoáng của chất vải linen thô mộc và phom dáng may đo chuẩn chỉ. 
                Một set đồ tinh giản nhưng tôn vinh khí chất thanh lịch của bạn trong mọi buổi hẹn hay sự kiện quan trọng.
              </p>

              <div className="look-items-list">
                {ENSEMBLE_ITEMS.map((item, idx) => (
                  <div
                    key={item.id}
                    className="look-item-card"
                    style={{
                      borderColor: activeLookItem.id === item.id ? 'var(--warm)' : 'var(--border)',
                      background: activeLookItem.id === item.id ? '#FFFFFF' : '#FAFAF8',
                    }}
                    onClick={() => setActiveLookItem(item)}
                  >
                    <div className="look-item-info">
                      <img src={item.thumb} alt={item.name} className="look-item-thumb" />
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>
                          MÓN ĐỒ 0{idx + 1} • {item.category}
                        </div>
                        <h4 className="look-item-name">{item.name}</h4>
                        <div className="look-item-meta">{fmt(item.price)}</div>
                      </div>
                    </div>
                    <div
                      className="look-item-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        showToast(`Đã thêm ${item.name} vào giỏ hàng!`, 'success');
                      }}
                    >
                      <span>Mua món này</span>
                      <i className="bi bi-bag-plus" />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 14 }}>
                <button
                  className="btn-hero-primary"
                  onClick={() => {
                    showToast('Đã thêm trọn bộ Parisian Ensemble (3 món) vào giỏ hàng!', 'success');
                  }}
                >
                  Mua trọn bộ phối này <i className="bi bi-arrow-right" />
                </button>
                <button className="btn-hero-secondary" onClick={() => navigate('shop')}>
                  Khám phá thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. BRAND CRAFTSMANSHIP & PHILOSOPHY ── */}
      <section className="craftsmanship-section">
        <div className="container-fluid px-4 px-lg-5">
          <div className="editorial-header">
            <div className="editorial-header-left">
              <div className="editorial-subtitle">
                <i className="bi bi-flower1" /> TRIẾT LÝ & CHẤT LIỆU TỰ NHIÊN
              </div>
              <h2 className="editorial-title">
                Nghệ thuật thủ công<br /><em>vị nhân sinh</em>
              </h2>
            </div>
            <div style={{ maxWidth: 360, fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
              Lyra tin rằng thời trang cao cấp bền vững bắt nguồn từ sự tôn trọng tuyệt đối dành cho nguyên liệu tự nhiên và người thợ may lành nghề.
            </div>
          </div>

          <div className="craftsmanship-grid">
            <div className="craftsmanship-card">
              <span className="craftsmanship-num">01.</span>
              <h3 className="craftsmanship-title">Lụa Tơ Tằm Bảo Lộc</h3>
              <p className="craftsmanship-text">
                Được tuyển chọn từ thủ phủ tơ tằm Bảo Lộc với mật độ sợi dệt dày dặn, độ bóng mờ ngọc trai tự nhiên, 
                mang lại cảm giác êm dịu nâng niu làn da nhạy cảm nhất.
              </p>
              <div className="craftsmanship-badge">✦ 100% ORGANIC SILK</div>
            </div>

            <div className="craftsmanship-card">
              <span className="craftsmanship-num">02.</span>
              <h3 className="craftsmanship-title">Linen Hữu Cơ Châu Âu</h3>
              <p className="craftsmanship-text">
                Sợi lanh tự nhiên thu hoạch tại Pháp & Ý, trải qua quy trình giặt mềm sinh học độc quyền giúp vải rũ nhẹ, 
                không gây thô ráp và thoáng khí lý tưởng cho khí hậu nhiệt đới.
              </p>
              <div className="craftsmanship-badge">✦ ECO-CERTIFIED LINEN</div>
            </div>

            <div className="craftsmanship-card">
              <span className="craftsmanship-num">03.</span>
              <h3 className="craftsmanship-title">May Đo Thủ Công Tinh Xảo</h3>
              <p className="craftsmanship-text">
                Từng đường kim, nếp gấp và chiếc khuy xà cừ thiên nhiên đều được đính kết thủ công bởi các nghệ nhân may đo 
                với hơn 15 năm kinh nghiệm trong ngành haute couture.
              </p>
              <div className="craftsmanship-badge">✦ ARTISANAL ATELIER</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. EDITORIAL CAMPAIGN & VOUCHER BANNER ── */}
      <section className="home-campaign-banner">
        <div className="container-fluid px-4 px-lg-5">
          <div className="campaign-banner-content">
            <div className="campaign-banner-text">
              <div className="campaign-eyebrow">PRIVATE CLIENT PRIVILEGE • ĐẶC QUYỀN ĐỘC QUYỀN</div>
              <h2 className="campaign-title">
                Ưu đãi 10% đơn hàng đầu tiên<br />
                <em>dành cho khách hàng mới</em>
              </h2>
              <p className="campaign-desc">
                Nhập mã ưu đãi độc quyền khi thanh toán để nhận ngay đặc quyền giảm 10% cùng hộp quà Signature Box đóng gói cao cấp.
              </p>
            </div>

            <div className="campaign-action-box">
              <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>
                MÃ ƯU ĐÃI RIÊNG CỦA BẠN:
              </div>
              <div className="campaign-voucher-code">
                <span className="voucher-pill">LYRA10</span>
                <button className="btn-copy-voucher" onClick={handleCopyVoucher}>
                  <i className={`bi ${voucherCopied ? 'bi-check-lg' : 'bi-clipboard'}`} />
                  {' '}{voucherCopied ? 'ĐÃ SAO CHÉP' : 'SAO CHÉP MÃ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. NEW ARRIVALS SECTION ── */}
      <section className="section" style={{ padding: '88px 0' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div className="editorial-header">
            <div className="editorial-header-left">
              <div className="editorial-subtitle">
                <i className="bi bi-stars" /> NOUVELLE COLLECTION
              </div>
              <h2 className="editorial-title">
                Mới về kho<br /><em>thiết kế mới nhất</em>
              </h2>
            </div>
            <a className="editorial-view-all" onClick={() => navigate('new')}>
              Khám phá toàn bộ <i className="bi bi-arrow-right" />
            </a>
          </div>

          {loading ? (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="product-card skeleton" style={{ height: 340 }} />)}
            </div>
          ) : newArrivals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
              Chưa có sản phẩm mới cập nhật
            </div>
          ) : (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {newArrivals.slice(0, 8).map((p, i) => (
                <ProductCard key={p.id} product={p} delay={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 9. CLIENT TESTIMONIAL QUOTE ── */}
      <section className="home-quotes-section">
        <div className="container px-4">
          <div className="quote-eyebrow">✦ LỜI TRI ÂN TỪ KHÁCH HÀNG ✦</div>
          <p className="quote-text">
            “Chất vải lụa tơ tằm và linen của Lyra mang lại cảm giác nhẹ tênh trên da. Từng đường may, chiếc khuy xà cừ và chiếc hộp Signature đóng gói chỉn chu đến mức mở ra như nhận một món quà từ Paris.”
          </p>
          <div className="quote-author">
            — Lan Chi • Fashion Editor & VIP Patron
          </div>
        </div>
      </section>

      {/* ── 10. THE LYRA STANDARD (SERVICE GUARANTEES) ── */}
      <section className="home-standards-section">
        <div className="container-fluid px-4 px-lg-5">
          <div className="standards-grid">
            <div className="standard-item">
              <div className="standard-icon-wrap">
                <i className="bi bi-gift" />
              </div>
              <div className="standard-title">Signature Gift Box</div>
              <div className="standard-desc">Mọi đơn hàng đều được đóng gói hộp quà sang trọng kèm thiệp viết tay.</div>
            </div>

            <div className="standard-item">
              <div className="standard-icon-wrap">
                <i className="bi bi-truck" />
              </div>
              <div className="standard-title">Giao Hàng Hỏa Tốc</div>
              <div className="standard-desc">Miễn phí giao hàng toàn quốc từ 500.000đ, bảo hiểm nguyên vẹn 100%.</div>
            </div>

            <div className="standard-item">
              <div className="standard-icon-wrap">
                <i className="bi bi-arrow-repeat" />
              </div>
              <div className="standard-title">Đổi Mẫu 30 Ngày</div>
              <div className="standard-desc">Hỗ trợ thử đồ và đổi size linh hoạt tận nhà hoàn toàn miễn phí.</div>
            </div>

            <div className="standard-item">
              <div className="standard-icon-wrap">
                <i className="bi bi-gem" />
              </div>
              <div className="standard-title">Chăm Sóc Trọn Đời</div>
              <div className="standard-desc">Tư vấn bảo quản tơ lụa và hỗ trợ may đo chỉnh sửa phom dáng miễn phí.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. NEWSLETTER ── */}
      <Newsletter showToast={showToast} />

      {/* ── 12. FOOTER ── */}
      <Footer navigate={navigate} />
    </div>
  );
}

async function retryRequest(request, attempts = 6) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (status && status < 500) throw error;
      if (attempt < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  throw lastError;
}
