// src/pages/SalePage.jsx
import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { extractErrorMessage, productApi, promotionApi } from '../services/api';
import { normalizeProduct } from '../data/products';
import { ProductCard, Footer } from '../components/index.jsx';

function useCountdown(target) {
  const calc = () => {
    const end = target ? new Date(target).getTime() : 0;
    const diff = Number.isFinite(end) ? Math.max(0, end - Date.now()) : 0;
    return {
      h: Math.floor(diff / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    setTime(calc());
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return time;
}

export default function SalePage() {
  const { navigate } = useApp();
  const [promotion, setPromotion] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('price-asc');
  const countdown = useCountdown(promotion?.endsAt);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    promotionApi.active()
      .then(async ({ data }) => {
        if (cancelled) return;
        const normalized = await normalizePromotion(data);
        if (cancelled) return;
        setPromotion(normalized.promotion);
        setProducts(normalized.products);
      })
      .catch(loadError => {
        if (!cancelled) {
          setProducts([]);
          setError(extractErrorMessage(loadError, 'Không thể tải chương trình khuyến mãi'));
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

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
      <section style={{
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
                  {promotion?.badge || 'Ưu đãi có hạn'}
                </span>
              </div>
              <h1 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(44px,6vw,80px)',
                fontWeight: 300, lineHeight: 1.05,
                margin: '0 0 20px',
              }}>
                {promotion?.title || 'Khuyến mãi'}<br />
                <em style={{ fontStyle: 'italic', color: 'var(--warm)' }}>{promotion?.subtitle || 'Đặc quyền LYRA'}</em>
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(247,244,239,.65)', maxWidth: 440, lineHeight: 1.8, marginBottom: 36 }}>
                {promotion?.description || 'Các chương trình ưu đãi đang hoạt động sẽ được cập nhật từ hệ thống.'}
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
      <section id="sale-products" style={{ padding: '64px 0 80px' }}>
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
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ color: 'var(--danger)' }}>{error}</p>
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

async function normalizePromotion(data) {
  const rawPromotion = Array.isArray(data) ? data[0] : (data?.promotion || data);
  if (!rawPromotion) return { promotion: null, products: [] };
  const entries = rawPromotion.products || rawPromotion.items || [];
  const products = await Promise.all(entries.map(async (entry, index) => {
    let raw = entry.product || entry;
    if (!raw?.name) {
      const productId = entry.productId || entry.id;
      if (!productId) return null;
      const response = await productApi.get(productId);
      raw = response.data;
    }
    const product = normalizeProduct(raw, index);
    const salePrice = Number(entry.salePrice ?? entry.discountedPrice ?? product.price);
    const originalPrice = Number(entry.originalPrice ?? product.price);
    const discount = Number(entry.discountPercent ?? (
      originalPrice > salePrice ? Math.round((1 - salePrice / originalPrice) * 100) : 0
    ));
    return {
      ...product,
      price: salePrice,
      oldPrice: originalPrice > salePrice ? originalPrice : null,
      discount,
      badge: discount > 0 ? 'Sale' : product.badge,
    };
  }));
  return {
    promotion: {
      id: rawPromotion.id,
      title: rawPromotion.title || rawPromotion.name,
      subtitle: rawPromotion.subtitle,
      description: rawPromotion.description,
      badge: rawPromotion.badge,
      startsAt: rawPromotion.startsAt,
      endsAt: rawPromotion.endsAt,
    },
    products: products.filter(Boolean),
  };
}
