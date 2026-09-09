// src/pages/HomePage.jsx
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { productApi, categoryApi } from '../services/api';
import { normalizeProduct, normalizeCategory } from '../data/products';
import { ProductCard, Marquee, Newsletter, Footer } from '../components/index.jsx';

export default function HomePage() {
  const { navigate } = useApp();
  const { showToast } = useCart();
  const heroRef = useRef(null);

  const [featured, setFeatured]       = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [prodRes, catRes] = await Promise.all([
          productApi.list({ sort: 'createdAt,desc', size: 8 }),
          categoryApi.list(),
        ]);
        if (cancelled) return;
        const products = (prodRes.data.content || []).map((p, i) => normalizeProduct(p, i));
        setFeatured(products.slice(0, 4));
        setNewArrivals(products.slice(4, 8));
        setCategories((catRes.data || []).map(normalizeCategory));
      } catch (err) {
        if (!cancelled) console.error('HomePage load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      const y = window.scrollY || 0;
      el.style.setProperty('--hero-shift', `${Math.min(y * 0.18, 72)}px`);
      el.style.setProperty('--hint-opacity', String(Math.max(0, 1 - y / 160)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div>
      {/* ── HERO ── */}
      <section className="hero-section" ref={heroRef}>
        <div className="hero-left">
          <div className="hero-eyebrow">Bộ sưu tập mùa hè 2026</div>
          <h1 className="hero-title">
            <span className="hero-line"><span style={{ '--d': '0ms' }}>Phong cách</span></span>
            <span className="hero-line"><span style={{ '--d': '110ms' }}>định nghĩa</span></span>
            <span className="hero-line"><span style={{ '--d': '220ms' }}><em>bạn</em></span></span>
          </h1>
          <p className="hero-subtitle">
            Khám phá những thiết kế độc quyền — nơi chất lượng thủ công gặp gỡ phong cách đương đại. Mỗi món đồ là một câu chuyện.
          </p>
          <div className="hero-cta">
            <button className="btn-lyra" onClick={() => navigate('shop')}>
              <span>Khám phá ngay</span> <i className="bi bi-arrow-right" />
            </button>
            <button className="btn-outline-lyra" onClick={() => navigate('sale')}>
              <span>Xem Sale</span>
            </button>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-img-box">
            <i className="bi bi-bag-heart" />
            <span>Lookbook 2026</span>
          </div>
          <div className="hero-float-tag">
            <div className="hero-float-label">Ưu đãi mùa hè</div>
            <div className="hero-float-value">LYRA Edit</div>
          </div>
          <div className="hero-scroll-hint">
            <div className="scroll-line" />
            <span>Scroll</span>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <Marquee />

      {/* ── CATEGORIES ── */}
      <section className="section" data-reveal>
        <div className="container-fluid px-4 px-lg-5">
          <div className="section-header">
            <h2 className="section-title">Mua theo<br /><em>danh mục</em></h2>
            <a className="section-link" onClick={() => navigate('shop')}>
              Xem tất cả <i className="bi bi-arrow-right" />
            </a>
          </div>

          {loading ? (
            <div className="cat-grid">
              {[1, 2, 3, 4].map(i => <div key={i} className="cat-card skeleton" style={{ height: 200 }} />)}
            </div>
          ) : categories.length > 0 ? (
            <div className="cat-grid">
              {categories.map((cat, i) => (
                <div key={cat.id} className="cat-card" data-reveal
                  onClick={() => navigate('shop')}
                  style={{ background: cat.color + '88', '--reveal-delay': `${i * 80}ms` }}
                >
                  <div className="cat-img-placeholder">
                    <i className={`bi ${cat.icon}`} />
                    <span>{cat.name}</span>
                  </div>
                  <div className="cat-overlay">
                    <div className="cat-name">{cat.name}</div>
                    {cat.description && <div className="cat-count">{cat.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              Chưa có danh mục nào trên hệ thống
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURED ── */}
      <section className="section" style={{ paddingTop: 0 }} data-reveal>
        <div className="container-fluid px-4 px-lg-5">
          <div className="section-header">
            <h2 className="section-title">Nổi bật<br /><em>tuần này</em></h2>
            <a className="section-link" onClick={() => navigate('shop')}>
              Tất cả sản phẩm <i className="bi bi-arrow-right" />
            </a>
          </div>
          {loading ? (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="product-card skeleton" style={{ height: 320 }} />)}
            </div>
          ) : featured.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              Chưa có sản phẩm nào
            </div>
          ) : (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {featured.map((p, i) => <ProductCard key={p.id} product={p} delay={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── BANNER ── */}
      <section style={{ padding: '0 0 80px' }} data-reveal="clip">
        <div className="container-fluid px-4 px-lg-5">
          <div style={{
            background: 'linear-gradient(135deg, #C9B99A 0%, #8B7860 100%)',
            padding: '72px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 32,
          }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)', marginBottom: 12 }}>
                Bộ sưu tập mới
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px,3.5vw,52px)', fontWeight: 300, color: '#fff', margin: 0, lineHeight: 1.1 }}>
                Khám phá ngay<br /><em style={{ fontStyle: 'italic' }}>những mẫu mới nhất</em>
              </h2>
            </div>
            <button className="btn-lyra" style={{ background: '#fff', color: 'var(--ink)', borderColor: '#fff' }}
              onClick={() => navigate('shop')}
            >
              Mua ngay <i className="bi bi-arrow-right" />
            </button>
          </div>
        </div>
      </section>

      {/* ── NEW ARRIVALS ── */}
      <section className="section" style={{ paddingTop: 0 }} data-reveal>
        <div className="container-fluid px-4 px-lg-5">
          <div className="section-header">
            <h2 className="section-title">Mới<br /><em>về kho</em></h2>
            <a className="section-link" onClick={() => navigate('new')}>
              Xem thêm <i className="bi bi-arrow-right" />
            </a>
          </div>
          {loading ? (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="product-card skeleton" style={{ height: 320 }} />)}
            </div>
          ) : newArrivals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              Chưa có sản phẩm mới
            </div>
          ) : (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {newArrivals.map((p, i) => <ProductCard key={p.id} product={p} delay={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── PERKS ── */}
      <section className="section-sm" data-reveal style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="row text-center">
            {[
              { icon: 'bi-truck',         label: 'Miễn phí giao hàng', sub: 'Đơn hàng từ 500.000đ' },
              { icon: 'bi-arrow-repeat',  label: 'Đổi trả 30 ngày',    sub: 'Miễn phí, tiện lợi' },
              { icon: 'bi-shield-check',  label: 'Hàng chính hãng',    sub: 'Cam kết 100% authentic' },
              { icon: 'bi-headset',       label: 'Hỗ trợ 24/7',        sub: 'Tư vấn tận tình mọi lúc' },
            ].map(({ icon, label, sub }, i) => (
              <div key={label} className="col-6 col-md-3 py-3" data-reveal style={{ '--reveal-delay': `${i * 80}ms` }}>
                <i className={`bi ${icon}`} style={{ fontSize: 28, color: 'var(--warm)', marginBottom: 10, display: 'block' }} />
                <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ── */}
      <Newsletter showToast={showToast} />

      {/* ── FOOTER ── */}
      <Footer navigate={navigate} />
    </div>
  );
}
