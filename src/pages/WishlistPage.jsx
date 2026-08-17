// src/pages/WishlistPage.jsx
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt } from '../data/products';
import { Stars, Footer } from '../components/index.jsx';

export default function WishlistPage() {
  const { navigate } = useApp();
  const { wishlist, toggleWishlist, addToCart, showToast } = useCart();
  const [sortBy, setSortBy] = useState('added');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected]     = useState(new Set());

  const sorted = [...wishlist].sort((a, b) => {
    if (sortBy === 'price-asc')  return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'rating')     return b.rating - a.rating;
    return 0; // added — keep original order
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addAllToCart = () => {
    wishlist.forEach(p => addToCart(p));
    showToast(`Đã thêm ${wishlist.length} sản phẩm vào giỏ hàng`, 'bi-bag-check');
  };

  const addSelectedToCart = () => {
    const items = wishlist.filter(p => selected.has(p.id));
    items.forEach(p => addToCart(p));
    showToast(`Đã thêm ${items.size} sản phẩm vào giỏ hàng`, 'bi-bag-check');
    setSelected(new Set());
    setSelectMode(false);
  };

  const removeSelected = () => {
    wishlist.filter(p => selected.has(p.id)).forEach(p => toggleWishlist(p));
    setSelected(new Set());
    setSelectMode(false);
  };

  const shareWishlist = () => {
    const text = `Danh sách yêu thích của tôi tại LYRA:\n${wishlist.map(p => `• ${p.name} — ${fmt(p.price)}`).join('\n')}`;
    if (navigator.share) {
      navigator.share({ title: 'LYRA Wishlist', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      showToast('Đã sao chép danh sách yêu thích!', 'bi-share');
    }
  };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ padding: '52px 0 36px', borderBottom: '1px solid var(--border)' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--warm)', marginBottom: 10 }}>
                Bộ sưu tập cá nhân
              </div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px,4vw,56px)', fontWeight: 300, marginBottom: 6 }}>
                Danh sách<br /><em style={{ fontStyle: 'italic', color: 'var(--warm)' }}>yêu thích</em>
              </h1>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                {wishlist.length > 0
                  ? `${wishlist.length} sản phẩm đã lưu`
                  : 'Chưa có sản phẩm nào'}
              </p>
            </div>
            {wishlist.length > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn-outline-lyra" onClick={shareWishlist} style={{ padding: '10px 20px', fontSize: 12 }}>
                  <i className="bi bi-share" /> Chia sẻ
                </button>
                <button
                  className="btn-outline-lyra"
                  onClick={() => { setSelectMode(v => !v); setSelected(new Set()); }}
                  style={{ padding: '10px 20px', fontSize: 12 }}
                >
                  <i className={`bi bi-${selectMode ? 'x' : 'check2-square'}`} />
                  {selectMode ? 'Hủy chọn' : 'Chọn nhiều'}
                </button>
                <button className="btn-lyra" onClick={addAllToCart} style={{ padding: '10px 22px', fontSize: 12 }}>
                  <i className="bi bi-bag-plus" /> Thêm tất cả vào giỏ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '40px 0 72px' }}>
        <div className="container-fluid px-4 px-lg-5">

          {wishlist.length === 0 ? (
            /* Empty state */
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'var(--cream-dark)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="bi bi-heart" style={{ fontSize: 44, color: 'var(--warm-light)' }} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 300 }}>
                Danh sách trống
              </h2>
              <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 340, lineHeight: 1.7 }}>
                Bạn chưa lưu sản phẩm nào. Nhấn vào biểu tượng ♡ trên sản phẩm để thêm vào đây.
              </p>
              <button className="btn-lyra" onClick={() => navigate('shop')}>
                Khám phá sản phẩm
              </button>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                {selectMode && selected.size > 0 ? (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Đã chọn {selected.size} sản phẩm</span>
                    <button className="btn-lyra" style={{ padding: '8px 18px', fontSize: 11.5 }} onClick={addSelectedToCart}>
                      <i className="bi bi-bag-plus" /> Thêm vào giỏ
                    </button>
                    <button className="btn-outline-lyra" style={{ padding: '8px 18px', fontSize: 11.5, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={removeSelected}>
                      <i className="bi bi-trash" /> Xóa
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{sorted.length} sản phẩm</span>
                )}
                <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="added">Mới lưu nhất</option>
                  <option value="price-asc">Giá: Thấp → Cao</option>
                  <option value="price-desc">Giá: Cao → Thấp</option>
                  <option value="rating">Đánh giá cao nhất</option>
                </select>
              </div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 22 }}>
                {sorted.map((p, i) => (
                  <WishlistCard
                    key={p.id}
                    product={p}
                    selectMode={selectMode}
                    isSelected={selected.has(p.id)}
                    onToggleSelect={() => toggleSelect(p.id)}
                    onRemove={() => toggleWishlist(p)}
                    onAddToCart={() => addToCart(p)}
                    onOpen={() => navigate('detail', { product: p })}
                  />
                ))}
              </div>

              {/* Summary bar */}
              <div style={{
                marginTop: 48, padding: '24px 32px',
                background: 'var(--cream-dark)', border: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
              }}>
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 4 }}>Tổng giá trị wishlist</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 300 }}>
                    {fmt(wishlist.reduce((a, p) => a + p.price, 0))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-outline-lyra" onClick={() => navigate('shop')}>
                    Tiếp tục mua sắm
                  </button>
                  <button className="btn-lyra" onClick={addAllToCart}>
                    <i className="bi bi-bag-plus" /> Thêm tất cả ({wishlist.length}) vào giỏ
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer navigate={navigate} />
    </div>
  );
}

/* ── Wishlist Product Card ── */
function WishlistCard({ product: p, selectMode, isSelected, onToggleSelect, onRemove, onAddToCart, onOpen }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        border: `1.5px solid ${isSelected ? 'var(--ink)' : hovered ? 'var(--border-dark)' : 'var(--border)'}`,
        transition: 'border-color .2s',
        position: 'relative',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Select checkbox */}
      {selectMode && (
        <div
          onClick={onToggleSelect}
          style={{
            position: 'absolute', top: 10, left: 10, zIndex: 5,
            width: 22, height: 22,
            background: isSelected ? 'var(--ink)' : 'rgba(247,244,239,.9)',
            border: `1.5px solid ${isSelected ? 'var(--ink)' : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {isSelected && <i className="bi bi-check" style={{ fontSize: 13, color: 'var(--cream)' }} />}
        </div>
      )}

      {/* Image */}
      <div
        onClick={onOpen}
        style={{
          background: p.color, aspectRatio: '3/4',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, color: 'rgba(14,14,14,.18)',
          overflow: 'hidden',
        }}
      >
        <i className={`bi ${p.icon}`} style={{ fontSize: 52, transition: 'transform .5s', transform: hovered ? 'scale(1.08)' : 'scale(1)' }} />
        <span style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>Xem chi tiết</span>
      </div>

      {/* Badge */}
      {p.badge && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: p.badge === 'Sale' ? 'var(--warm)' : 'var(--ink)',
          color: '#fff', fontSize: 9.5, letterSpacing: '.08em',
          padding: '3px 9px', textTransform: 'uppercase',
        }}>
          {p.badge}
        </div>
      )}

      {/* Info */}
      <div style={{ padding: '14px 16px 16px' }}>
        <Stars rating={p.rating} size={10} />
        <div style={{ fontSize: 13.5, fontWeight: 400, margin: '5px 0 3px', cursor: 'pointer' }} onClick={onOpen}>{p.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 10 }}>{p.brand} · {p.cat}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{fmt(p.price)}</span>
          {p.oldPrice && (
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--muted-light)', textDecoration: 'line-through' }}>
              {fmt(p.oldPrice)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onAddToCart}
            style={{
              flex: 1, padding: '10px 0',
              background: 'var(--ink)', color: 'var(--cream)',
              border: '1.5px solid var(--ink)',
              fontSize: 11.5, letterSpacing: '.08em', textTransform: 'uppercase',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--warm)'; e.currentTarget.style.borderColor = 'var(--warm)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.borderColor = 'var(--ink)'; }}
          >
            <i className="bi bi-bag-plus" /> Thêm giỏ
          </button>
          <button
            onClick={onRemove}
            title="Xóa khỏi yêu thích"
            style={{
              width: 40, height: 40, border: '1.5px solid var(--border)',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: 'var(--warm)',
              transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FFF0EE'; e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--warm)'; }}
          >
            <i className="bi bi-heart-fill" />
          </button>
        </div>
      </div>
    </div>
  );
}