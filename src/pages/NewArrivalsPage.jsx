// src/pages/NewArrivalsPage.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS, fmt } from '../data/products';
import { ProductCard, Footer } from '../components/index.jsx';

// Sản phẩm mới
const NEW_PRODUCTS = PRODUCTS.filter(p => p.badge === 'New');

// Giả lập ngày ra mắt
const WITH_DATES = NEW_PRODUCTS.map((p, i) => ({
  ...p,
  arrivedAt: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000), // mỗi SP cách nhau 3 ngày
  isLatest: i < 2,
}));

const WEEKS = [
  { id: 'this',  label: 'Tuần này',   products: WITH_DATES.slice(0, 2) },
  { id: 'last',  label: 'Tuần trước', products: WITH_DATES.slice(2, 5) },
  { id: 'older', label: 'Tháng này',  products: WITH_DATES.slice(5) },
];

const LOOKBOOK_ITEMS = [
  { title: 'Tối giản & Sang trọng', sub: 'Spring Collection 2025', color: '#C9B99A', icon: 'bi-bag-heart' },
  { title: 'Năng động & Trẻ trung', sub: 'Urban Casual Series',   color: '#A8B8C0', icon: 'bi-person' },
  { title: 'Thanh lịch & Nữ tính',  sub: 'Feminine Edit',         color: '#D4C8B8', icon: 'bi-bag' },
];

export default function NewArrivalsPage() {
  const { navigate } = useApp();
  const { showToast } = useCart();
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeLook, setActiveLook] = useState(0);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return WITH_DATES;
    return WITH_DATES.filter(p => p.cat === activeFilter);
  }, [activeFilter]);

  const cats = ['all', ...new Set(NEW_PRODUCTS.map(p => p.cat))];
  const catLabels = { all: 'Tất cả', 'Thời trang nữ': 'Nữ', 'Thời trang nam': 'Nam', 'Giày dép': 'Giày dép', 'Phụ kiện': 'Phụ kiện' };

  return (
    <div>
      {/* ── HERO ── */}
      <section style={{ padding: '72px 0 60px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 28, height: 1, background: 'var(--warm)', display: 'block' }} />
                Cập nhật liên tục
              </div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(44px,5vw,72px)', fontWeight: 300, lineHeight: 1.08, marginBottom: 20 }}>
                Mới về<br /><em style={{ fontStyle: 'italic', color: 'var(--warm)' }}>kho hàng</em>
              </h1>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.8, maxWidth: 400, marginBottom: 36 }}>
                Khám phá những thiết kế vừa ra mắt — được tuyển chọn kỹ lưỡng từ các xu hướng thời trang quốc tế, phù hợp với phong cách Việt Nam.
              </p>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                {[
                  { num: `${NEW_PRODUCTS.length}`, label: 'Sản phẩm mới' },
                  { num: 'Hàng tuần',              label: 'Cập nhật mới' },
                  { num: '2–3 ngày',               label: 'Giao hàng nhanh' },
                ].map(({ num, label }) => (
                  <div key={label}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 300, color: 'var(--ink)' }}>{num}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '.04em' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-lg-5 offset-lg-1 mt-5 mt-lg-0">
              {/* Featured new product */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  background: WITH_DATES[0]?.color || '#E4DAD0',
                  aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 14, color: 'rgba(14,14,14,.18)',
                  cursor: 'pointer',
                }}
                  onClick={() => navigate('detail', { product: WITH_DATES[0] })}
                >
                  <i className={`bi ${WITH_DATES[0]?.icon || 'bi-bag'}`} style={{ fontSize: 80 }} />
                  <span style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' }}>New Arrival</span>
                </div>
                {/* Badge */}
                <div style={{
                  position: 'absolute', top: 16, left: 16,
                  background: 'var(--ink)', color: 'var(--cream)',
                  fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase',
                  padding: '6px 14px',
                }}>
                  Just In
                </div>
                {/* Info card */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(247,244,239,.95)', backdropFilter: 'blur(10px)',
                  padding: '20px 24px',
                }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 300, marginBottom: 4 }}>
                    {WITH_DATES[0]?.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{WITH_DATES[0]?.brand}</span>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>{fmt(WITH_DATES[0]?.price || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LOOKBOOK STRIP ── */}
      <section style={{ padding: '56px 0', background: 'var(--ink)' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: 10 }}>
              Phong cách tuần này
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 300, color: 'var(--cream)' }}>
              Lookbook <em style={{ fontStyle: 'italic', color: 'var(--warm)' }}>2025</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {LOOKBOOK_ITEMS.map((item, i) => (
              <div
                key={item.title}
                onClick={() => setActiveLook(i)}
                style={{
                  background: item.color + (activeLook === i ? 'FF' : '88'),
                  padding: '48px 32px',
                  cursor: 'pointer', transition: 'all .3s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  border: activeLook === i ? `2px solid var(--warm)` : '2px solid transparent',
                  color: 'rgba(14,14,14,.3)',
                }}
              >
                <i className={`bi ${item.icon}`} style={{ fontSize: 52 }} />
                <div style={{ textAlign: 'center', color: activeLook === i ? 'var(--ink)' : 'rgba(14,14,14,.5)' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 300, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 11.5, letterSpacing: '.06em' }}>{item.sub}</div>
                </div>
                {activeLook === i && (
                  <button className="btn-maison" style={{ marginTop: 8, fontSize: 11, padding: '8px 18px' }}
                    onClick={e => { e.stopPropagation(); navigate('shop'); }}>
                    Xem BST
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WEEKLY TIMELINE ── */}
      <section style={{ padding: '64px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{ marginBottom: 44 }}>
            <h2 className="section-title">Theo <em>thời gian</em></h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>Sản phẩm mới được cập nhật mỗi tuần</p>
          </div>

          {WEEKS.filter(w => w.products.length > 0).map((week, wi) => (
            <div key={week.id} style={{ marginBottom: 52 }}>
              {/* Week header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                <div style={{
                  background: wi === 0 ? 'var(--ink)' : 'var(--cream-dark)',
                  color: wi === 0 ? 'var(--cream)' : 'var(--muted)',
                  padding: '6px 18px', fontSize: 11.5, letterSpacing: '.1em', textTransform: 'uppercase',
                  border: `1px solid ${wi === 0 ? 'var(--ink)' : 'var(--border)'}`,
                }}>
                  {week.label}
                  {wi === 0 && <span style={{ marginLeft: 8, background: 'var(--warm)', padding: '1px 7px', fontSize: 9, borderRadius: 10 }}>● LIVE</span>}
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{week.products.length} sản phẩm</span>
              </div>

              <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                {week.products.map((p, i) => <ProductCard key={p.id} product={p} delay={i} />)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ALL NEW ── */}
      <section style={{ padding: '56px 0' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <h2 className="section-title">Xem <em>tất cả</em></h2>
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {cats.map(cat => (
                <button key={cat}
                  onClick={() => setActiveFilter(cat)}
                  style={{
                    padding: '7px 16px', fontSize: 11.5,
                    border: '1.5px solid',
                    borderColor: activeFilter === cat ? 'var(--ink)' : 'var(--border)',
                    background: activeFilter === cat ? 'var(--ink)' : 'transparent',
                    color: activeFilter === cat ? 'var(--cream)' : 'var(--ink)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all .2s',
                  }}
                >
                  {catLabels[cat] || cat}
                </button>
              ))}
            </div>
          </div>

          <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {filtered.map((p, i) => <ProductCard key={p.id} product={p} delay={i % 4} />)}
          </div>
        </div>
      </section>

      {/* ── NOTIFY ME ── */}
      <section style={{ padding: '0 0 64px' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{
            background: 'var(--cream-dark)', border: '1px solid var(--border)',
            padding: '48px 56px', display: 'grid', gridTemplateColumns: '1fr auto',
            gap: 32, alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: 10 }}>
                Không bỏ lỡ
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 300, marginBottom: 8 }}>
                Nhận thông báo khi có <em style={{ fontStyle: 'italic' }}>hàng mới</em>
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                Đăng ký để được thông báo sớm nhất khi có sản phẩm mới về kho. Thành viên được ưu tiên mua trước 24 giờ.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 0 }}>
              <input
                style={{ border: '1.5px solid var(--border)', borderRight: 'none', padding: '13px 18px', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none', width: 260 }}
                placeholder="Email của bạn..."
              />
              <button className="btn-maison" style={{ borderRadius: 0 }}
                onClick={() => showToast('Đã đăng ký thông báo hàng mới!', 'bi-bell-fill')}>
                Đăng ký
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer navigate={navigate} />
    </div>
  );
}