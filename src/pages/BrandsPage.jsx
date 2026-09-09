// src/pages/BrandsPage.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { productApi } from '../services/api';
import { normalizeProduct } from '../data/products';
import { ProductCard, Footer } from '../components/index.jsx';

export default function BrandsPage() {
  const { navigate } = useApp();
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productApi.list({ size: 12, sort: 'createdAt,desc' })
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
      <section data-reveal style={{
        background: 'linear-gradient(135deg, #0E0E0E 0%, #1A1A1A 60%, #25201A 100%)',
        color: 'var(--cream)',
        padding: '80px 0 72px',
        borderBottom: '1px solid rgba(247,244,239,.1)',
      }}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-7">
              <div style={{
                fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase',
                color: 'var(--warm)', marginBottom: 18,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ width: 28, height: 1, background: 'var(--warm)', display: 'block' }} />
                Thương hiệu LYRA
              </div>
              <h1 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(44px,5.5vw,76px)',
                fontWeight: 300, lineHeight: 1.05,
                margin: '0 0 24px',
              }}>
                Phong cách<br />
                <em style={{ fontStyle: 'italic', color: 'var(--warm)' }}>Định nghĩa bạn</em>
              </h1>
              <p style={{
                fontSize: 15, color: 'rgba(247,244,239,.65)',
                maxWidth: 480, lineHeight: 1.8, marginBottom: 36,
              }}>
                Thương hiệu thời trang cao cấp tập trung vào thiết kế tối giản, chất liệu bền vững và đường nét thủ công tinh xảo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── BRAND STORY ── */}
      <section data-reveal style={{ padding: '72px 0 80px' }}>
        <div className="container">
          <div style={{
            background: 'rgba(200,169,126,.08)',
            border: '1px solid var(--border)',
            padding: '40px 48px', marginBottom: 64,
          }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, marginBottom: 16 }}>
              Câu chuyện LYRA
            </h2>
            <p style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.9, maxWidth: 800 }}>
              Từ xưởng may thủ công, LYRA không ngừng theo đuổi sự hoàn hảo trong từng đường kim mũi chỉ. Mỗi bộ sưu tập là sự giao thoa hài hòa giữa phom dáng hiện đại và chất liệu thiên nhiên thân thiện với môi trường, mang lại cảm giác thoải mái và thanh lịch cho người mặc.
            </p>
          </div>

          {/* Brand products */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, margin: 0 }}>
                Sản phẩm của LYRA
              </h2>
              <button className="btn-outline-lyra" onClick={() => navigate('shop')}>
                Xem tất cả ở Shop <i className="bi bi-arrow-right" />
              </button>
            </div>

            {loading ? (
              <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                {[1, 2, 3, 4].map(i => <div key={i} className="product-card skeleton" style={{ height: 320 }} />)}
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                Chưa có sản phẩm nào
              </div>
            ) : (
              <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                {products.map((p, i) => <ProductCard key={p.id} product={p} delay={i % 4} />)}
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer navigate={navigate} />
    </div>
  );
}