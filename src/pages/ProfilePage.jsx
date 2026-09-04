// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt } from '../data/products';
import { Footer, Stars } from '../components/index.jsx';

const NAV_ITEMS = [
  { id: 'orders',   label: 'Đơn hàng của tôi', icon: 'bi-bag' },
  { id: 'wishlist', label: 'Yêu thích',        icon: 'bi-heart' },
  { id: 'address',  label: 'Địa chỉ',          icon: 'bi-geo-alt' },
  { id: 'profile',  label: 'Thông tin cá nhân',icon: 'bi-person' },
];

export default function ProfilePage() {
  const { navigate, user, logout } = useApp();
  const { showToast, wishlist, toggleWishlist, addToCart } = useCart();
  const [activeTab, setActiveTab] = useState('orders');

  const handleLogout = async () => {
    await logout();
    showToast('Đã đăng xuất thành công', 'bi-door-open');
    navigate('home');
  };

  return (
    <div>
      <div className="profile-layout">
        {/* Sidebar */}
        <aside className="profile-sidebar">
          <div className="profile-avatar">{user?.avatar || (user?.email ? user.email[0].toUpperCase() : 'U')}</div>
          <div className="profile-name">{user?.name || 'Thành viên'}</div>
          <div className="profile-email">{user?.email || ''}</div>
          <nav className="profile-nav">
            {NAV_ITEMS.map(item => (
              <a key={item.id}
                className={`profile-nav-item${activeTab === item.id ? ' active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <i className={`bi ${item.icon}`} />
                {item.label}
              </a>
            ))}
            <a className="profile-nav-item" style={{ marginTop: 12, color: 'var(--danger)' }} onClick={handleLogout}>
              <i className="bi bi-box-arrow-right" style={{ color: 'var(--danger)' }} />
              Đăng xuất
            </a>
          </nav>
        </aside>

        {/* Content */}
        <main className="profile-content">
          {activeTab === 'orders' && <OrdersTab navigate={navigate} />}
          {activeTab === 'wishlist' && <WishlistTab wishlist={wishlist} toggleWishlist={toggleWishlist} addToCart={addToCart} navigate={navigate} />}
          {activeTab === 'address' && <AddressTab showToast={showToast} />}
          {activeTab === 'profile' && <ProfileInfoTab user={user} showToast={showToast} />}
        </main>
      </div>
      <Footer navigate={navigate} />
    </div>
  );
}

/* ── Orders Tab ── */
function OrdersTab({ navigate }) {
  const [orders, setOrders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lyra_orders') || '[]'); }
    catch { return []; }
  });

  const statusLabel = { delivered: 'Đã giao', shipping: 'Đang giao', processing: 'Đang xử lý', cancelled: 'Đã hủy' };

  return (
    <>
      <h2 className="profile-section-title">Đơn hàng của tôi</h2>
      <p className="profile-section-sub">Theo dõi và quản lý các đơn hàng gần đây của bạn</p>
      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
          <i className="bi bi-bag" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: .4 }} />
          <div style={{ fontSize: 16 }}>Bạn chưa có đơn hàng nào</div>
          <button className="btn-lyra mt-3" onClick={() => navigate('shop')}>
            Mua sắm ngay
          </button>
        </div>
      ) : (
        orders.map(order => (
          <div key={order.id} className="order-card">
            <div className="order-card-header">
              <div>
                <div className="order-id">{order.id}</div>
                <div className="order-date">{order.date}</div>
              </div>
              <span className={`order-status-badge ${order.status || 'processing'}`}>
                {statusLabel[order.status] || 'Đang xử lý'}
              </span>
            </div>
            <div className="d-flex align-items-center justify-content-between">
              <div className="order-items-preview">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="order-item-thumb" style={{ background: (item.color || '#E4DAD0') + '88' }}>
                    <i className={`bi ${item.icon || 'bi-bag'}`} />
                  </div>
                ))}
              </div>
              <div className="order-total-text">{fmt(order.total)}</div>
            </div>
            <div className="d-flex gap-2 mt-3">
              <button
                className="btn-outline-lyra"
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => navigate('order-detail', { order })}
              >
                Xem chi tiết
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}

/* ── Wishlist Tab ── */
function WishlistTab({ wishlist, toggleWishlist, addToCart, navigate }) {
  return (
    <>
      <h2 className="profile-section-title">Danh sách yêu thích ({wishlist.length})</h2>
      <p className="profile-section-sub">Các sản phẩm bạn đã lưu</p>
      {wishlist.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
          Chưa có sản phẩm nào trong danh sách yêu thích
        </div>
      ) : (
        <div className="row g-3">
          {wishlist.map(p => (
            <div key={p.id} className="col-sm-6">
              <div style={{
                border: '1px solid var(--border)', padding: 16,
                display: 'flex', gap: 14, alignItems: 'center',
              }}>
                <div style={{
                  width: 54, height: 64, background: p.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, cursor: 'pointer',
                }} onClick={() => navigate('detail', { product: p })}>
                  <i className={`bi ${p.icon}`} style={{ fontSize: 22, opacity: .3 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, margin: '4px 0' }}>
                    {fmt(p.price)}
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn-lyra"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => addToCart(p)}
                    >
                      + Giỏ hàng
                    </button>
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}
                      onClick={() => toggleWishlist(p)}
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Address Tab ── */
function AddressTab({ showToast }) {
  return (
    <>
      <h2 className="profile-section-title">Sổ địa chỉ</h2>
      <p className="profile-section-sub">Quản lý địa chỉ giao nhận hàng</p>
      <div style={{ border: '1px solid var(--border)', padding: 24, maxWidth: 520, background: '#fff' }}>
        <div style={{ fontWeight: 500, marginBottom: 6 }}>Nguyễn Văn A · 0912 345 678</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          123 Phố Huế, Phường Bùi Thị Xuân, Quận Hai Bà Trưng, Hà Nội
        </div>
        <span style={{ display: 'inline-block', marginTop: 10, fontSize: 11, padding: '2px 8px', background: 'var(--cream)', border: '1px solid var(--border)' }}>
          Mặc định
        </span>
      </div>
    </>
  );
}

/* ── Profile Info Tab ── */
function ProfileInfoTab({ user, showToast }) {
  const [name, setName] = useState(user?.name || '');
  const [email]         = useState(user?.email || '');

  return (
    <>
      <h2 className="profile-section-title">Thông tin tài khoản</h2>
      <p className="profile-section-sub">Xem và cập nhật thông tin cá nhân</p>
      <div style={{ maxWidth: 480 }}>
        <label className="form-field-label">Họ và tên</label>
        <input className="form-field-input" value={name} onChange={e => setName(e.target.value)} />
        <label className="form-field-label">Email</label>
        <input className="form-field-input" value={email} disabled style={{ opacity: .6 }} />
        <button
          className="btn-lyra mt-3"
          onClick={() => showToast('Đã lưu thông tin tài khoản', 'bi-check-circle')}
        >
          Lưu thay đổi
        </button>
      </div>
    </>
  );
}