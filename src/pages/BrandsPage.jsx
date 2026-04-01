// src/pages/BrandsPage.jsx
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS, fmt } from '../data/products';
import { ProductCard, Footer } from '../components/index.jsx';

const BRANDS = [
  {
    id: 'maison',
    name: 'MAISON',
    tagline: 'Phong cách định nghĩa bạn',
    desc: 'Thương hiệu thời trang cao cấp Việt Nam được thành lập năm 2018. MAISON tập trung vào thiết kế tối giản, chất liệu cao cấp và sự bền vững.',
    story: 'Từ một xưởng may nhỏ tại Hà Nội, MAISON đã vươn lên trở thành thương hiệu thời trang được yêu thích với hơn 100.000 khách hàng trung thành. Mỗi sản phẩm được tạo ra bởi các nghệ nhân lành nghề, kết hợp giữa kỹ thuật truyền thống và xu hướng đương đại.',
    color: '#C9B99A',
    darkColor: '#8B7355',
    icon: 'bi-bag-heart',
    founded: '2018',
    country: 'Việt Nam',
    products: PRODUCTS.filter(p => p.brand === 'Maison').length,
    rating: 4.6,
    isLocal: true,
    tags: ['Lụa tự nhiên', 'Tối giản', 'Bền vững', 'Local Brand'],
  },
  {
    id: 'zara',
    name: 'ZARA',
    tagline: 'Live in Style',
    desc: 'Thương hiệu thời trang đến từ Tây Ban Nha nổi tiếng với thiết kế theo kịp xu hướng nhanh nhất thế giới ở mức giá phải chăng.',
    story: 'Zara được thành lập năm 1975 bởi Amancio Ortega tại Tây Ban Nha. Với mô hình "fast fashion" đột phá, Zara có thể ra mắt thiết kế mới trong vòng 2 tuần — nhanh hơn bất kỳ đối thủ nào.',
    color: '#1A1A1A',
    darkColor: '#0A0A0A',
    icon: 'bi-bag',
    founded: '1975',
    country: 'Tây Ban Nha',
    products: 0,
    rating: 4.3,
    isLocal: false,
    tags: ['Fast Fashion', 'Xu hướng mới', 'Đa dạng', 'Global'],
  },
  {
    id: 'hm',
    name: 'H&M',
    tagline: 'Fashion & Quality at the best price',
    desc: 'Thương hiệu thời trang Thụy Điển với triết lý mang đến thời trang chất lượng tốt tại mức giá hợp lý cho tất cả mọi người.',
    story: 'Được thành lập năm 1947 bởi Erling Persson, H&M hiện là một trong những thương hiệu thời trang lớn nhất thế giới với hơn 5.000 cửa hàng tại 74 thị trường.',
    color: '#CC0000',
    darkColor: '#990000',
    icon: 'bi-person',
    founded: '1947',
    country: 'Thụy Điển',
    products: 0,
    rating: 4.1,
    isLocal: false,
    tags: ['Affordable', 'Sustainable', 'Basics', 'Global'],
  },
  {
    id: 'local',
    name: 'Local Brand VN',
    tagline: 'Tự hào hàng Việt',
    desc: 'Tập hợp các thương hiệu thời trang Việt Nam nổi bật, từ streetwear đến high fashion, mang đậm bản sắc và câu chuyện Việt.',
    story: 'Phong trào Local Brand Việt Nam đang ngày càng phát triển mạnh mẽ, với nhiều nhà thiết kế trẻ tài năng tạo ra những sản phẩm mang đậm văn hóa và tinh thần Việt Nam hiện đại.',
    color: '#DA6B4A',
    darkColor: '#B85234',
    icon: 'bi-star',
    founded: '2015+',
    country: 'Việt Nam',
    products: 0,
    rating: 4.5,
    isLocal: true,
    tags: ['Handmade', 'Độc đáo', 'Câu chuyện Việt', 'Artisan'],
  },
];

export default function BrandsPage() {
  const { navigate } = useApp();
  const { showToast } = useCart();
  const [selectedBrand, setSelectedBrand] = useState(BRANDS[0]);
  const [showStory, setShowStory] = useState(false);

  const brandProducts = PRODUCTS.filter(p => p.brand.toLowerCase() === selectedBrand.id);

  return (
    <div>
      {/* ── HERO ── */}
      <section style={{
        background: 'var(--ink)', color: 'var(--cream)',
        padding: '64px 0 56px',
      }}>
        <div className="container">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ width: 28, height: 1, background: 'var(--warm)', display: 'block' }} />
              Curated Selection
              <span style={{ width: 28, height: 1, background: 'var(--warm)', display: 'block' }} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(44px,5vw,72px)', fontWeight: 300, lineHeight: 1.1, marginBottom: 16 }}>
              Thương hiệu<br /><em style={{ fontStyle: 'italic', color: 'var(--warm)' }}>tuyển chọn</em>
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(247,244,239,.5)', maxWidth: 480, margin: '0 auto' }}>
              Khám phá câu chuyện và sản phẩm của những thương hiệu thời trang chúng tôi tin tưởng lựa chọn cho bạn.
            </p>
          </div>
        </div>
      </section>

      {/* ── BRAND GRID SELECTOR ── */}
      <section style={{ padding: '56px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 4 }}>
            {BRANDS.map(brand => (
              <div
                key={brand.id}
                onClick={() => { setSelectedBrand(brand); setShowStory(false); }}
                style={{
                  padding: '32px 24px',
                  background: selectedBrand.id === brand.id ? brand.color : 'var(--cream-dark)',
                  border: `2px solid ${selectedBrand.id === brand.id ? brand.color : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all .3s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                }}
                onMouseEnter={e => { if (selectedBrand.id !== brand.id) e.currentTarget.style.borderColor = 'var(--ink)'; }}
                onMouseLeave={e => { if (selectedBrand.id !== brand.id) e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div style={{
                  width: 56, height: 56,
                  background: selectedBrand.id === brand.id ? 'rgba(255,255,255,.2)' : brand.color + '33',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: selectedBrand.id === brand.id ? '#fff' : brand.color,
                }}>
                  <i className={`bi ${brand.icon}`} style={{ fontSize: 24 }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 300, letterSpacing: '.08em',
                    color: selectedBrand.id === brand.id ? '#fff' : 'var(--ink)',
                    marginBottom: 4,
                  }}>
                    {brand.name}
                  </div>
                  <div style={{
                    fontSize: 11, letterSpacing: '.05em',
                    color: selectedBrand.id === brand.id ? 'rgba(255,255,255,.65)' : 'var(--muted)',
                  }}>
                    {brand.country}
                  </div>
                </div>
                {brand.isLocal && (
                  <span style={{
                    fontSize: 9.5, padding: '2px 8px',
                    background: selectedBrand.id === brand.id ? 'rgba(255,255,255,.2)' : 'var(--warm-pale)',
                    color: selectedBrand.id === brand.id ? '#fff' : 'var(--warm)',
                    letterSpacing: '.08em', textTransform: 'uppercase',
                  }}>
                    Local Brand
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRAND DETAIL ── */}
      <section style={{ padding: '64px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div className="row g-5 align-items-start">
            {/* Left: visual */}
            <div className="col-lg-5">
              <div style={{
                background: selectedBrand.color,
                aspectRatio: '4/3',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 20, position: 'relative', overflow: 'hidden',
              }}>
                <i className={`bi ${selectedBrand.icon}`} style={{ fontSize: 96, color: 'rgba(255,255,255,.2)' }} />
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 300, color: '#fff', letterSpacing: '.12em', position: 'relative', zIndex: 1 }}>
                  {selectedBrand.name}
                </div>
                <div style={{ fontSize: 12, letterSpacing: '.14em', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', position: 'relative', zIndex: 1 }}>
                  Est. {selectedBrand.founded}
                </div>
                {/* Pattern overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,.04) 0,rgba(255,255,255,.04) 1px,transparent 0,transparent 50%)',
                  backgroundSize: '16px 16px',
                }} />
              </div>

              {/* Brand stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, marginTop: 14 }}>
                {[
                  { val: selectedBrand.founded,  label: 'Năm thành lập' },
                  { val: selectedBrand.country,  label: 'Xuất xứ' },
                  { val: `${selectedBrand.rating}★`, label: 'Đánh giá' },
                ].map(({ val, label }, i) => (
                  <div key={label} style={{
                    padding: '16px 18px',
                    background: 'var(--cream-dark)',
                    borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                    borderTop: '1px solid var(--border)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 300, marginBottom: 3 }}>{val}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '.06em' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: info */}
            <div className="col-lg-6 offset-lg-1">
              <div style={{ fontSize: 10.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 24, height: 1, background: 'var(--warm)', display: 'block' }} />
                Thương hiệu
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px,4vw,54px)', fontWeight: 300, lineHeight: 1.1, marginBottom: 14 }}>
                {selectedBrand.name}
              </h2>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontStyle: 'italic', color: 'var(--warm)', marginBottom: 24 }}>
                "{selectedBrand.tagline}"
              </div>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.85, marginBottom: 28 }}>
                {selectedBrand.desc}
              </p>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
                {selectedBrand.tags.map(tag => (
                  <span key={tag} style={{
                    padding: '5px 14px', fontSize: 11.5,
                    border: '1px solid var(--border)',
                    color: 'var(--muted)',
                    letterSpacing: '.05em',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>

              {/* Story toggle */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginBottom: 24 }}>
                <button
                  onClick={() => setShowStory(v => !v)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    font: 'inherit', padding: 0,
                    fontSize: 12.5, color: 'var(--ink)',
                    letterSpacing: '.06em',
                  }}
                >
                  <i className={`bi bi-chevron-${showStory ? 'up' : 'down'}`} style={{ fontSize: 14 }} />
                  {showStory ? 'Ẩn câu chuyện' : 'Đọc câu chuyện thương hiệu'}
                </button>
                {showStory && (
                  <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.85, marginTop: 16 }}>
                    {selectedBrand.story}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn-maison" onClick={() => navigate('shop')}>
                  <i className={`bi ${selectedBrand.icon}`} /> Xem sản phẩm
                </button>
                <button className="btn-outline-maison"
                  onClick={() => showToast(`Đã theo dõi ${selectedBrand.name}`, 'bi-heart-fill')}>
                  <i className="bi bi-heart" /> Theo dõi
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BRAND PRODUCTS ── */}
      {brandProducts.length > 0 && (
        <section style={{ padding: '56px 0', borderBottom: '1px solid var(--border)' }}>
          <div className="container-fluid px-4 px-lg-5">
            <div className="section-header">
              <h2 className="section-title">
                Sản phẩm của<br /><em>{selectedBrand.name}</em>
              </h2>
              <a className="section-link" onClick={() => navigate('shop')}>
                Xem tất cả <i className="bi bi-arrow-right" />
              </a>
            </div>
            <div className="products-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {brandProducts.slice(0, 8).map((p, i) => (
                <ProductCard key={p.id} product={p} delay={i % 4} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Khi chọn brand khác không có sản phẩm */}
      {brandProducts.length === 0 && (
        <section style={{ padding: '56px 0', borderBottom: '1px solid var(--border)' }}>
          <div className="container-fluid px-4 px-lg-5">
            <div className="section-header">
              <h2 className="section-title">Sản phẩm của <em>{selectedBrand.name}</em></h2>
            </div>
            <div style={{
              background: 'var(--cream-dark)', padding: '56px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center',
            }}>
              <i className="bi bi-bag" style={{ fontSize: 48, color: 'var(--muted-light)' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 300 }}>Sắp có hàng</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 340, lineHeight: 1.7 }}>
                Chúng tôi đang trong quá trình hợp tác với {selectedBrand.name}. Đăng ký để nhận thông báo khi có sản phẩm.
              </p>
              <button className="btn-maison"
                onClick={() => showToast(`Đã đăng ký nhận thông báo ${selectedBrand.name}`, 'bi-bell')}>
                Nhận thông báo
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── ALL BRANDS LIST ── */}
      <section style={{ padding: '56px 0' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{ marginBottom: 40 }}>
            <h2 className="section-title">Tất cả <em>thương hiệu</em></h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
            {BRANDS.map(brand => (
              <div key={brand.id}
                onClick={() => { setSelectedBrand(brand); setShowStory(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 20,
                  padding: '20px 24px',
                  border: `1.5px solid ${selectedBrand.id === brand.id ? 'var(--ink)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all .2s',
                  background: selectedBrand.id === brand.id ? 'rgba(14,14,14,.03)' : 'transparent',
                }}
                onMouseEnter={e => { if (selectedBrand.id !== brand.id) { e.currentTarget.style.borderColor = 'var(--muted)'; } }}
                onMouseLeave={e => { if (selectedBrand.id !== brand.id) { e.currentTarget.style.borderColor = 'var(--border)'; } }}
              >
                <div style={{
                  width: 52, height: 52, background: brand.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <i className={`bi ${brand.icon}`} style={{ fontSize: 22, color: 'rgba(255,255,255,.7)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 300 }}>{brand.name}</span>
                    {brand.isLocal && (
                      <span style={{ fontSize: 9.5, padding: '2px 7px', background: 'var(--warm-pale)', color: 'var(--warm)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                        VN
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{brand.tagline}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{brand.country}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Est. {brand.founded}</div>
                </div>
                <i className="bi bi-chevron-right" style={{ fontSize: 14, color: 'var(--muted-light)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BECOME A PARTNER ── */}
      <section style={{ padding: '0 0 72px' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{
            background: 'var(--ink)', color: 'var(--cream)',
            padding: '56px 64px',
            display: 'grid', gridTemplateColumns: '1fr auto',
            gap: 40, alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: 12 }}>
                Dành cho thương hiệu
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 300, marginBottom: 12, lineHeight: 1.2 }}>
                Hợp tác với <em style={{ fontStyle: 'italic', color: 'var(--warm)' }}>MAISON</em>
              </h3>
              <p style={{ fontSize: 13.5, color: 'rgba(247,244,239,.55)', lineHeight: 1.75, maxWidth: 500 }}>
                Bạn là thương hiệu thời trang muốn tiếp cận hàng chục nghìn khách hàng cao cấp? Hãy kết nối với chúng tôi để đưa sản phẩm của bạn lên MAISON.
              </p>
            </div>
            <div>
              <button className="btn-maison" style={{ background: 'var(--warm)', borderColor: 'var(--warm)' }}
                onClick={() => showToast('Đã gửi yêu cầu hợp tác!', 'bi-handshake')}>
                Liên hệ hợp tác <i className="bi bi-arrow-right" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer navigate={navigate} />
    </div>
  );
}