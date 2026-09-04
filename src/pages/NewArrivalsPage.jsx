// src/pages/NewArrivalsPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { productApi } from '../services/api';
import { normalizeProduct, fmt } from '../data/products';
import { ProductCard, Footer } from '../components/index.jsx';

export default function NewArrivalsPage() {
  const { navigate } = useApp();
  const { showToast } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeLook, setActiveLook] = useState(0);

  const LOOKBOOK_ITEMS = [
    { title: 'Tối giản & Sang trọng', sub: 'Spring Collection 2026', color: '#C9B99A', icon: 'bi-bag-heart' },
    { title: 'Năng động & Trẻ trung', sub: 'Urban Casual Series',   color: '#A8B8C0', icon: 'bi-person' },
    { title: 'Thanh lịch & Nữ tính',  sub: 'Feminine Edit',         color: '#D4C8B8', icon: 'bi-bag' },
  ];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productApi.list({ sort: 'createdAt,desc', size: 16 })
      .then(res => {
        if (cancelled) return;
        const list = (res.data?.content || []).map((p, idx) => normalizeProduct(p, idx));
        setProducts(list);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));

    return () => { cancelled = true; };
  }, []);

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
              <div className="d-flex gap-3">
                <button className="btn-lyra" onClick={() => navigate('shop')}>
                  Xem tất cả <i className="bi bi-arrow-right" />
                </button>
              </div>
            </div>

            {/* Lookbook carousel */}
            <div className="col-lg-5 offset-lg-1 mt-5 mt-lg-0">
              <div style={{
                background: LOOKBOOK_ITEMS[activeLook].color,
                height: 380, display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-end', padding: '36px 32px',
                position: 'relative', transition: 'background .4s ease',
              }}>
                <i className={`bi ${LOOKBOOK_ITEMS[activeLook].icon}`} style={{
                  position: 'absolute', top: '35%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 100, color: 'rgba(14,14,14,.1)',
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(14,14,14,.5)', marginBottom: 6 }}>
                    {LOOKBOOK_ITEMS[activeLook].sub}
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, color: 'var(--ink)' }}>
                    {LOOKBOOK_ITEMS[activeLook].title}
                  </div>
                </div>
              </div>
              {/* Lookbook dots */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'center' }}>
                {LOOKBOOK_ITEMS.map((_, i) => (
                  <button key={i}
                    onClick={() => setActiveLook(i)}
                    style={{
                      width: i === activeLook ? 28 : 8, height: 8,
                      borderRadius: 4, border: 'none',
                      background: i === activeLook ? 'var(--ink)' : 'var(--border)',
                      cursor: 'pointer', transition: 'all .25s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCTS ── */}
      <section style={{ padding: '64px 0 80px' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 300, margin: 0 }}>
              Sản phẩm mới nhất ({products.length})
            </h2>
          </div>

          {loading ? (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="product-card skeleton" style={{ height: 320 }} />)}
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              Chưa có sản phẩm mới
            </div>
          ) : (
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {products.map((p, i) => <ProductCard key={p.id} product={p} delay={i % 4} />)}
            </div>
          )}
        </div>
      </section>

      <Footer navigate={navigate} />
    </div>
  );
}