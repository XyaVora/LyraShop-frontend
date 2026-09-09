// src/pages/SalePage.jsx
import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { productApi } from '../services/api';
import { normalizeProduct, fmt } from '../data/products';
import { ProductCard, Footer } from '../components/index.jsx';

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

export default function SalePage() {
  const { navigate } = useApp();
  const { showToast } = useCart();
  const countdown = useCountdown(SALE_END);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('price-asc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productApi.list({ size: 24, sort: 'basePrice,asc' })
      .then(res => {
        if (cancelled) return;
        const list = (res.data?.content || []).map((p, idx) => normalizeProduct(p, idx));
        setProducts(list);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));

    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    switch (sortBy) {
      case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      default: break;
    }
    return list;
  }, [products, sortBy]);

  return (
    <div>
      {/* ── HERO BANNER ── */}
      <section data-reveal style={{
        background: 'linear-gradient(135deg, #1A1A1A 0%, #2D251E 50%, #1A1A1A 100%)',
        color: 'var(--cream)',
        padding: '72px 0 64px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div className="container position-relative" style={{ zIndex: 1 }}>
          <div className="row align-items-center">
            <div className="col-lg-7">
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(200,169,126,.15)', border: '1px solid rgba(200,169,126,.3)',
                padding: '6px 14px', marginBottom: 20,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warm)', display: 'inline-block' }} />
                <span style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--warm)' }}>
                  Ưu đãi có hạn
                </span>
              </div>
              <h1 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(44px,6vw,80px)',
                fontWeight: 300, lineHeight: 1.05,
                margin: '0 0 20px',
              }}>
                Mùa Sale<br />
                <em style={{ fontStyle: 'italic', color: 'var(--warm)' }}>Đặc Quyền</em>
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(247,244,239,.65)', maxWidth: 440, lineHeight: 1.8, marginBottom: 36 }}>
                Bộ sưu tập các thiết kế cao cấp với mức giá ưu đãi nhất mùa. Số lượng có hạn cho từng sản phẩm.
              </p>
              <div className="d-flex gap-3 flex-wrap">
                <button className="btn-warm" onClick={() => {
                  document.getElementById('sale-products')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  Khám phá ngay <i className="bi bi-arrow-down" />
                </button>
              </div>
            </div>

            {/* Countdown timer */}
            <div className="col-lg-5 mt-5 mt-lg-0">
              <div style={{
                background: 'rgba(255,255,255,.05)',
                border: '1px solid rgba(255,255,255,.1)',
                padding: '36px 32px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: 16 }}>
                  Kết thúc sau
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
                  {[
                    { val: String(countdown.h).padStart(2, '0'), label: 'Giờ' },
                    { val: String(countdown.m).padStart(2, '0'), label: 'Phút' },
                    { val: String(countdown.s).padStart(2, '0'), label: 'Giây' },
                  ].map(({ val, label }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 300,
                        background: 'rgba(255,255,255,.08)', padding: '8px 16px', minWidth: 70,
                        border: '1px solid rgba(255,255,255,.1)', lineHeight: 1.1,
                      }}>
                        {val}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'rgba(247,244,239,.4)', marginTop: 6, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(247,244,239,.4)', margin: 0 }}>
                  Miễn phí giao hàng đơn từ 500.000đ
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCTS ── */}
      <section id="sale-products" data-reveal style={{ padding: '64px 0 80px' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 300, margin: 0 }}>
              Sản phẩm ưu đãi ({filtered.length})
            </h2>
            <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="price-asc">Giá: Thấp → Cao</option>
              <option value="price-desc">Giá: Cao → Thấp</option>
            </select>
          </div>

          {loading ? (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="product-card skeleton" style={{ height: 320 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              Hiện chưa có sản phẩm nào
            </div>
          ) : (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {filtered.map((p, i) => <ProductCard key={p.id} product={p} delay={i % 4} />)}
            </div>
          )}
        </div>
      </section>

      <Footer navigate={navigate} />
    </div>
  );
}
