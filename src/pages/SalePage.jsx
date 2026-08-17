// src/pages/SalePage.jsx
import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS, fmt } from '../data/products';
import { ProductCard, Footer } from '../components/index.jsx';

// Sản phẩm đang sale (có oldPrice)
const SALE_PRODUCTS = PRODUCTS.filter(p => p.oldPrice && p.discount > 0);

// Flash sale products (discount >= 28%)
const FLASH_PRODUCTS = SALE_PRODUCTS.filter(p => p.discount >= 28);

// Sale kết thúc sau 2 ngày từ now
const SALE_END = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

function useCountdown(target) {
  const calc = () => {
    const diff = Math.max(0, target - Date.now());
    return {
      h: Math.floor(diff / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const SALE_CATS = [
  { id: 'all',   label: 'Tất cả',        count: SALE_PRODUCTS.length },
  { id: 'nu',    label: 'Thời trang nữ', count: SALE_PRODUCTS.filter(p => p.cat === 'Thời trang nữ').length },
  { id: 'nam',   label: 'Thời trang nam', count: SALE_PRODUCTS.filter(p => p.cat === 'Thời trang nam').length },
  { id: 'giay',  label: 'Giày dép',      count: SALE_PRODUCTS.filter(p => p.cat === 'Giày dép').length },
];

export default function SalePage() {
  const { navigate } = useApp();
  const { showToast } = useCart();
  const countdown = useCountdown(SALE_END);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('discount');

  const filtered = useMemo(() => {
    let list = [...SALE_PRODUCTS];
    if (activeTab === 'nu')   list = list.filter(p => p.cat === 'Thời trang nữ');
    if (activeTab === 'nam')  list = list.filter(p => p.cat === 'Thời trang nam');
    if (activeTab === 'giay') list = list.filter(p => p.cat === 'Giày dép');
    switch (sortBy) {
      case 'discount':   list.sort((a, b) => b.discount - a.discount); break;
      case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'popular':    list.sort((a, b) => b.reviews - a.reviews); break;
    }
    return list;
  }, [activeTab, sortBy]);

  const pad = n => String(n).padStart(2, '0');

  return (
    <div>
      {/* ── SALE HERO ── */}
      <section style={{
        background: 'var(--ink)', color: 'var(--cream)',
        padding: '64px 0 56px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', inset: 0, opacity: .04,
          backgroundImage: 'repeating-linear-gradient(45deg, var(--warm) 0, var(--warm) 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px',
        }} />
        <div className="container" style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span style={{ display: 'block', width: 32, height: 1, background: 'var(--warm)' }} />
            Chương trình khuyến mãi
            <span style={{ display: 'block', width: 32, height: 1, background: 'var(--warm)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(52px,6vw,88px)', fontWeight: 300, lineHeight: 1.0, marginBottom: 12 }}>
            End of Season<br /><em style={{ fontStyle: 'italic', color: 'var(--warm)' }}>Sale</em>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(247,244,239,.55)', marginBottom: 40, maxWidth: 420, margin: '0 auto 40px' }}>
            Giảm giá lên đến <strong style={{ color: 'var(--warm)' }}>50%</strong> cho hàng ngàn sản phẩm thời trang cao cấp. Số lượng có hạn!
          </p>

          {/* Countdown */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(247,244,239,.4)', marginBottom: 16 }}>
              Kết thúc sau
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
              {[
                { val: pad(countdown.h + 48), label: 'Giờ' },
                { val: pad(countdown.m),      label: 'Phút' },
                { val: pad(countdown.s),      label: 'Giây' },
              ].map(({ val, label }, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px,5vw,64px)', fontWeight: 300,
                      lineHeight: 1, color: 'var(--cream)',
                      background: 'rgba(255,255,255,.07)',
                      border: '1px solid rgba(255,255,255,.1)',
                      padding: '10px 20px', minWidth: 90,
                    }}>
                      {val}
                    </div>
                    <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(247,244,239,.4)', marginTop: 8 }}>{label}</div>
                  </div>
                  {i < 2 && <span style={{ fontFamily: 'var(--font-serif)', fontSize: 40, color: 'var(--warm)', marginBottom: 20 }}>:</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { num: `${SALE_PRODUCTS.length}+`, label: 'Sản phẩm sale' },
              { num: 'Đến 50%',                  label: 'Mức giảm tối đa' },
              { num: 'Miễn phí',                 label: 'Giao hàng toàn quốc' },
            ].map(({ num, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 300, color: 'var(--warm)' }}>{num}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(247,244,239,.45)', letterSpacing: '.06em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FLASH SALE ── */}
      <section style={{ padding: '56px 0', background: '#FFF8F0', borderBottom: '1px solid var(--border)' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div className="section-header">
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: 8 }}>
                ⚡ Giảm sâu nhất
              </div>
              <h2 className="section-title">Flash <em>Sale</em></h2>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', textAlign: 'right' }}>
              Giảm từ <strong style={{ color: 'var(--warm)' }}>28% trở lên</strong>
            </div>
          </div>

          <div className="products-grid flash-sale-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {FLASH_PRODUCTS.map((p, i) => (
              <div key={p.id} className="flash-sale-item">
                {/* Discount ribbon */}
                <div className="flash-sale-discount" style={{
                  position: 'absolute', top: 0, right: 0, zIndex: 10,
                  background: 'var(--warm)', color: '#fff',
                  fontSize: 13, fontFamily: 'var(--font-serif)', fontWeight: 400,
                  padding: '6px 14px',
                }}>
                  −{p.discount}%
                </div>
                <ProductCard product={p} delay={i} />
                <div className="flash-sale-saving">
                  Tiết kiệm: <span style={{ color: 'var(--warm)', fontFamily: 'var(--font-serif)' }}>
                    {fmt(p.oldPrice - p.price)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SALE BANNER STRIP ── */}
      <div style={{
        background: 'var(--warm)', color: '#fff',
        padding: '18px 0', textAlign: 'center',
        fontSize: 13, letterSpacing: '.06em',
        display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span><i className="bi bi-truck me-2" />Miễn phí ship cho đơn trên 500K</span>
        <span style={{ opacity: .5 }}>✦</span>
        <span><i className="bi bi-arrow-repeat me-2" />Đổi trả miễn phí 30 ngày</span>
        <span style={{ opacity: .5 }}>✦</span>
        <span><i className="bi bi-shield-check me-2" />Hàng chính hãng 100%</span>
      </div>

      {/* ── ALL SALE PRODUCTS ── */}
      <section style={{ padding: '56px 0' }}>
        <div className="container-fluid px-4 px-lg-5">
          {/* Sub header */}
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 className="section-title">Tất cả <em>ưu đãi</em></h2>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>{filtered.length} sản phẩm đang giảm giá</p>
            </div>
            <select
              className="sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="discount">Giảm nhiều nhất</option>
              <option value="price-asc">Giá: Thấp → Cao</option>
              <option value="price-desc">Giá: Cao → Thấp</option>
              <option value="popular">Bán chạy nhất</option>
            </select>
          </div>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 32, flexWrap: 'wrap' }}>
            {SALE_CATS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                style={{
                  padding: '9px 20px',
                  border: '1.5px solid',
                  borderColor: activeTab === cat.id ? 'var(--ink)' : 'var(--border)',
                  background: activeTab === cat.id ? 'var(--ink)' : 'transparent',
                  color: activeTab === cat.id ? 'var(--cream)' : 'var(--ink)',
                  fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  transition: 'all .2s',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}
              >
                {cat.label}
                <span style={{
                  fontSize: 10, padding: '1px 6px',
                  background: activeTab === cat.id ? 'rgba(255,255,255,.2)' : 'var(--warm-pale)',
                  color: activeTab === cat.id ? '#fff' : 'var(--warm)',
                  borderRadius: 10,
                }}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {filtered.map((p, i) => <ProductCard key={p.id} product={p} delay={i % 4} />)}
          </div>

          {filtered.length === 0 && (
            <div className="cart-empty-state">
              <i className="bi bi-tag" />
              <div className="cart-empty-title">Không có sản phẩm sale</div>
            </div>
          )}
        </div>
      </section>

      {/* ── COUPON BANNER ── */}
      <section style={{ padding: '0 0 64px' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{
            background: 'var(--cream-dark)', border: '1px solid var(--border)',
            padding: '40px 48px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
            gap: 24, alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: 8 }}>Mã giảm thêm</div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 300, marginBottom: 6 }}>Dùng coupon để <em style={{ fontStyle: 'italic' }}>tiết kiệm hơn</em></h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>Nhập mã khi thanh toán để được giảm thêm.</p>
            </div>
            {[
              { code: 'LYRA10', desc: 'Giảm thêm 10%' },
              { code: 'SAVE100K', desc: 'Giảm 100.000đ' },
              { code: 'FREESHIP', desc: 'Miễn phí vận chuyển' },
            ].map(({ code, desc }) => (
              <div key={code}
                onClick={() => { navigator.clipboard?.writeText(code); showToast(`Đã copy mã "${code}"`, 'bi-clipboard-check'); }}
                style={{
                  border: '1.5px dashed var(--warm)', padding: '16px 20px',
                  cursor: 'pointer', transition: 'background .2s',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--warm-pale)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 700, letterSpacing: '.08em', color: 'var(--warm)' }}>{code}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{desc}</span>
                <span style={{ fontSize: 10.5, color: 'var(--muted-light)' }}>Click để sao chép</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer navigate={navigate} />
    </div>
  );
}
