// src/pages/HomePage.jsx
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS, CATEGORIES } from '../data/products';
import { ProductCard, Marquee, Newsletter, Footer } from '../components/index.jsx';

export default function HomePage() {
  const { navigate } = useApp();
  const { showToast } = useCart();

  return (
    <div>
      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-left">
          <div className="hero-eyebrow">Bộ sưu tập mùa hè 2025</div>
          <h1 className="hero-title">
            Phong cách<br />
            định nghĩa<br />
            <em>bạn</em>
          </h1>
          <p className="hero-subtitle">
            Khám phá những thiết kế độc quyền — nơi chất lượng thủ công gặp gỡ phong cách đương đại. Mỗi món đồ là một câu chuyện.
          </p>
          <div className="hero-cta">
            <button className="btn-maison" onClick={() => navigate('shop')}>
              Khám phá ngay <i className="bi bi-arrow-right" />
            </button>
            <button className="btn-outline-maison" onClick={() => navigate('shop')}>
              Xem Sale
            </button>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-img-box">
            <i className="bi bi-bag-heart" />
            <span>Lookbook 2025</span>
          </div>
          <div className="hero-float-tag">
            <div className="hero-float-label">Giảm đến</div>
            <div className="hero-float-value">40% Off</div>
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
      <section className="section">
        <div className="container-fluid px-4 px-lg-5">
          <div className="section-header">
            <h2 className="section-title">Mua theo<br /><em>danh mục</em></h2>
            <a className="section-link" onClick={() => navigate('shop')}>
              Xem tất cả <i className="bi bi-arrow-right" />
            </a>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((cat, i) => (
              <div key={cat.id} className="cat-card" onClick={() => navigate('shop')}
                style={{ background: cat.color + '88' }}
              >
                <div className="cat-img-placeholder">
                  <i className={`bi ${cat.icon}`} />
                  <span>{cat.name}</span>
                </div>
                <div className="cat-overlay">
                  <div className="cat-name">{cat.name}</div>
                  <div className="cat-count">{cat.count} sản phẩm</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container-fluid px-4 px-lg-5">
          <div className="section-header">
            <h2 className="section-title">Nổi bật<br /><em>tuần này</em></h2>
            <a className="section-link" onClick={() => navigate('shop')}>
              Tất cả sản phẩm <i className="bi bi-arrow-right" />
            </a>
          </div>
          <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {PRODUCTS.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} delay={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── BANNER ── */}
      <section style={{ padding: '0 0 80px' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{
            background: 'linear-gradient(135deg, #C9B99A 0%, #8B7860 100%)',
            padding: '72px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 32,
          }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)', marginBottom: 12 }}>
                Ưu đãi đặc biệt
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px,3.5vw,52px)', fontWeight: 300, color: '#fff', margin: 0, lineHeight: 1.1 }}>
                Sale cuối mùa<br /><em style={{ fontStyle: 'italic' }}>giảm đến 50%</em>
              </h2>
            </div>
            <button className="btn-maison" style={{ background: '#fff', color: 'var(--ink)', borderColor: '#fff' }}
              onClick={() => navigate('shop')}
            >
              Mua ngay <i className="bi bi-arrow-right" />
            </button>
          </div>
        </div>
      </section>

      {/* ── NEW ARRIVALS ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container-fluid px-4 px-lg-5">
          <div className="section-header">
            <h2 className="section-title">Mới<br /><em>về kho</em></h2>
            <a className="section-link" onClick={() => navigate('shop')}>
              Xem thêm <i className="bi bi-arrow-right" />
            </a>
          </div>
          <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {PRODUCTS.filter(p => p.badge === 'New').slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} delay={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PERKS ── */}
      <section className="section-sm" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="row text-center">
            {[
              { icon: 'bi-truck', label: 'Miễn phí giao hàng', sub: 'Đơn hàng từ 500.000đ' },
              { icon: 'bi-arrow-repeat', label: 'Đổi trả 30 ngày', sub: 'Miễn phí, không cần lý do' },
              { icon: 'bi-shield-check', label: 'Hàng chính hãng', sub: 'Cam kết 100% authentic' },
              { icon: 'bi-headset', label: 'Hỗ trợ 24/7', sub: 'Tư vấn tận tình mọi lúc' },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="col-6 col-md-3 py-3">
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
