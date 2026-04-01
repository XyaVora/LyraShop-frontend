// src/pages/ProfilePage.jsx
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { ORDERS_MOCK, fmt, PRODUCTS } from '../data/products';
import { Footer, Stars } from '../components/index.jsx';

const NAV_ITEMS = [
  { id: 'orders',   label: 'Đơn hàng của tôi', icon: 'bi-bag' },
  { id: 'wishlist', label: 'Yêu thích',          icon: 'bi-heart' },
  { id: 'address',  label: 'Địa chỉ',            icon: 'bi-geo-alt' },
  { id: 'profile',  label: 'Thông tin cá nhân',  icon: 'bi-person' },
  { id: 'password', label: 'Đổi mật khẩu',       icon: 'bi-lock' },
];

export default function ProfilePage() {
  const { navigate, user, logout } = useApp();
  const { showToast, wishlist, toggleWishlist, addToCart } = useCart();
  const [activeTab, setActiveTab] = useState('orders');

  const handleLogout = () => {
    logout();
    showToast('Đã đăng xuất thành công', 'bi-door-open');
    navigate('home');
  };

  return (
    <div>
      <div className="profile-layout">
        {/* Sidebar */}
        <aside className="profile-sidebar">
          <div className="profile-avatar">{user?.avatar || 'N'}</div>
          <div className="profile-name">{user?.name || 'Nguyễn Văn A'}</div>
          <div className="profile-email">{user?.email || 'user@example.com'}</div>
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
          {activeTab === 'password' && <PasswordTab showToast={showToast} />}
        </main>
      </div>
      <Footer navigate={navigate} />
    </div>
  );
}

/* ── Orders Tab ── */
function OrdersTab({ navigate }) {
  const statusLabel = { delivered: 'Đã giao', shipping: 'Đang giao', processing: 'Đang xử lý', cancelled: 'Đã hủy' };
  return (
    <>
      <h2 className="profile-section-title">Đơn hàng của tôi</h2>
      <p className="profile-section-sub">Theo dõi và quản lý tất cả đơn hàng của bạn</p>
      {ORDERS_MOCK.map(order => (
        <div key={order.id} className="order-card">
          <div className="order-card-header">
            <div>
              <div className="order-id">{order.id}</div>
              <div className="order-date">{order.date}</div>
            </div>
            <span className={`order-status-badge ${order.status}`}>{statusLabel[order.status]}</span>
          </div>
          <div className="d-flex align-items-center">
            <div className="order-items-preview">
              {order.items.map(id => {
                const p = PRODUCTS.find(x => x.id === id);
                return p ? (
                  <div key={id} className="order-item-thumb" style={{ background: p.color + '88' }}>
                    <i className={`bi ${p.icon}`} />
                  </div>
                ) : null;
              })}
            </div>
            <div className="order-total-text">{fmt(order.total)}</div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button className="btn-outline-maison" style={{ padding: '8px 18px', fontSize: 11 }}
              onClick={() => navigate('order-detail', { order: order.id })}>
              Xem chi tiết
            </button>
            {order.status === 'processing' && (
              <button className="btn-outline-maison" style={{ padding: '8px 18px', fontSize: 11, color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                Hủy đơn
              </button>
            )}
          </div>
        </div>
      ))}
      {ORDERS_MOCK.length === 0 && (
        <div className="cart-empty-state">
          <i className="bi bi-bag" />
          <div className="cart-empty-title">Chưa có đơn hàng</div>
          <button className="btn-maison mt-3" onClick={() => navigate('shop')}>Mua sắm ngay</button>
        </div>
      )}
    </>
  );
}

/* ── Wishlist Tab ── */
function WishlistTab({ wishlist, toggleWishlist, addToCart, navigate }) {
  return (
    <>
      <h2 className="profile-section-title">Sản phẩm yêu thích</h2>
      <p className="profile-section-sub">{wishlist.length} sản phẩm đã lưu</p>
      {wishlist.length === 0 ? (
        <div className="cart-empty-state">
          <i className="bi bi-heart" />
          <div className="cart-empty-title">Chưa có sản phẩm yêu thích</div>
          <button className="btn-maison mt-3" onClick={() => navigate('shop')}>Khám phá ngay</button>
        </div>
      ) : (
        <div className="row g-3">
          {wishlist.map(p => (
            <div key={p.id} className="col-md-4">
              <div style={{ border: '1.5px solid var(--border)', padding: 16, cursor: 'pointer' }}>
                <div style={{ height: 160, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
                  onClick={() => navigate('detail', { product: p })}>
                  <i className={`bi ${p.icon}`} style={{ fontSize: 44, color: 'rgba(14,14,14,.18)' }} />
                </div>
                <div style={{ fontSize: 13.5, marginBottom: 4 }}>{p.name}</div>
                <Stars rating={p.rating} />
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, margin: '6px 0 12px' }}>{fmt(p.price)}</div>
                <div className="d-flex gap-2">
                  <button className="btn-maison flex-grow-1 justify-content-center" style={{ padding: '9px' }}
                    onClick={() => addToCart(p)}>
                    Thêm vào giỏ
                  </button>
                  <button className="btn-icon" onClick={() => toggleWishlist(p)} title="Xóa khỏi yêu thích">
                    <i className="bi bi-heart-fill" style={{ color: 'var(--warm)' }} />
                  </button>
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
      <h2 className="profile-section-title">Địa chỉ của tôi</h2>
      <p className="profile-section-sub">Quản lý địa chỉ giao hàng</p>
      <div style={{ border: '1.5px solid var(--border)', padding: 20, marginBottom: 14 }}>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 4 }}>Nguyễn Văn A</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7 }}>
              0912 345 678<br />
              123 Phố Huế, Phường Bùi Thị Xuân, Quận Hai Bà Trưng, Hà Nội
            </div>
          </div>
          <span style={{ fontSize: 10, background: 'var(--warm-pale)', color: 'var(--warm)', padding: '3px 9px', border: '1px solid var(--warm-light)' }}>
            Mặc định
          </span>
        </div>
        <div className="d-flex gap-2 mt-3">
          <button className="btn-outline-maison" style={{ padding: '7px 16px', fontSize: 11 }}>Chỉnh sửa</button>
          <button className="btn-outline-maison" style={{ padding: '7px 16px', fontSize: 11, color: 'var(--danger)', borderColor: 'var(--danger)' }}>Xóa</button>
        </div>
      </div>
      <button className="btn-outline-maison" onClick={() => showToast('Tính năng đang phát triển', 'bi-info-circle')}>
        <i className="bi bi-plus" /> Thêm địa chỉ mới
      </button>
    </>
  );
}

/* ── Profile Info Tab ── */
function ProfileInfoTab({ user, showToast }) {
  return (
    <>
      <h2 className="profile-section-title">Thông tin cá nhân</h2>
      <p className="profile-section-sub">Cập nhật thông tin tài khoản của bạn</p>
      <div className="row g-3" style={{ maxWidth: 520 }}>
        <div className="col-6">
          <label className="form-field-label">Họ</label>
          <input className="form-field-input" defaultValue="Nguyễn" />
        </div>
        <div className="col-6">
          <label className="form-field-label">Tên</label>
          <input className="form-field-input" defaultValue="Văn A" />
        </div>
        <div className="col-12">
          <label className="form-field-label">Email</label>
          <input className="form-field-input" type="email" defaultValue={user?.email || 'user@example.com'} />
        </div>
        <div className="col-12">
          <label className="form-field-label">Số điện thoại</label>
          <input className="form-field-input" type="tel" defaultValue="0912 345 678" />
        </div>
        <div className="col-12">
          <label className="form-field-label">Ngày sinh</label>
          <input className="form-field-input" type="date" defaultValue="1995-06-15" />
        </div>
        <div className="col-12">
          <button className="btn-maison" onClick={() => showToast('Đã lưu thông tin thành công!', 'bi-check-circle')}>
            Lưu thay đổi
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Password Tab ── */
function PasswordTab({ showToast }) {
  return (
    <>
      <h2 className="profile-section-title">Đổi mật khẩu</h2>
      <p className="profile-section-sub">Bảo mật tài khoản của bạn</p>
      <div style={{ maxWidth: 400 }}>
        <label className="form-field-label">Mật khẩu hiện tại</label>
        <input className="form-field-input" type="password" placeholder="••••••••" />
        <label className="form-field-label">Mật khẩu mới</label>
        <input className="form-field-input" type="password" placeholder="••••••••" />
        <label className="form-field-label">Xác nhận mật khẩu mới</label>
        <input className="form-field-input" type="password" placeholder="••••••••" />
        <button className="btn-maison" onClick={() => showToast('Đổi mật khẩu thành công!', 'bi-shield-check')}>
          Cập nhật mật khẩu
        </button>
      </div>
    </>
  );
}