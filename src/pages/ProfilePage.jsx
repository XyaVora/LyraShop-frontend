// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt } from '../data/products';
import { normalizeOrder } from '../data/orders';
import { addressApi, extractErrorMessage, orderApi } from '../services/api';
import { isPhone, normPhone } from '../utils/validate';
import { Footer, Stars } from '../components/index.jsx';

const NAV_ITEMS = [
  { id: 'orders',   label: 'Đơn hàng của tôi', icon: 'bi-bag' },
  { id: 'wishlist', label: 'Yêu thích',        icon: 'bi-heart' },
  { id: 'address',  label: 'Địa chỉ',          icon: 'bi-geo-alt' },
  { id: 'profile',  label: 'Thông tin cá nhân',icon: 'bi-person' },
];

export default function ProfilePage() {
  const { navigate, user, logout, updateProfile, profileTab } = useApp();
  const {
    showToast, wishlist, wishlistLoading, wishlistError, refreshWishlist,
    toggleWishlist, addToCart,
  } = useCart();
  const [activeTab, setActiveTab] = useState(profileTab || 'orders');

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
                onClick={() => {
                  setActiveTab(item.id);
                  navigate('profile', { profileTab: item.id });
                }}
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
          {activeTab === 'orders' && <OrdersTab navigate={navigate} user={user} />}
          {activeTab === 'wishlist' && <WishlistTab
            wishlist={wishlist}
            loading={wishlistLoading}
            error={wishlistError}
            refreshWishlist={refreshWishlist}
            toggleWishlist={toggleWishlist}
            addToCart={addToCart}
            navigate={navigate}
          />}
          {activeTab === 'address' && <AddressTab showToast={showToast} />}
          {activeTab === 'profile' && <ProfileInfoTab user={user} updateProfile={updateProfile} showToast={showToast} />}
        </main>
      </div>
      <Footer navigate={navigate} />
    </div>
  );
}

/* ── Orders Tab ── */
function OrdersTab({ navigate, user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    orderApi.list()
      .then(({ data }) => {
        if (!cancelled) setOrders((data || []).map(order => normalizeOrder(order, user)));
      })
      .catch(err => {
        if (!cancelled) setError(extractErrorMessage(err, 'Không thể tải danh sách đơn hàng'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const statusLabel = {
    pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang xử lý',
    shipping: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy',
  };

  return (
    <>
      <h2 className="profile-section-title">Đơn hàng của tôi</h2>
      <p className="profile-section-sub">Theo dõi và quản lý các đơn hàng gần đây của bạn</p>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>Đang tải đơn hàng...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--danger)' }}>{error}</div>
      ) : orders.length === 0 ? (
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
                <div className="order-id">{order.displayId}</div>
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
function WishlistTab({ wishlist, loading, error, refreshWishlist, toggleWishlist, addToCart, navigate }) {
  return (
    <>
      <h2 className="profile-section-title">Danh sách yêu thích ({wishlist.length})</h2>
      <p className="profile-section-sub">Các sản phẩm bạn đã lưu</p>
      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Đang tải danh sách yêu thích...</p>
      ) : error ? (
        <div><p style={{ color: 'var(--danger)' }}>{error}</p><button className="btn-outline-lyra" onClick={() => refreshWishlist()}>Thử lại</button></div>
      ) : wishlist.length === 0 ? (
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
                  flexShrink: 0, cursor: 'pointer', overflow: 'hidden',
                }} onClick={() => navigate('detail', { product: p })}>
                  {p.image
                    ? <img src={p.image} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <i className={`bi ${p.icon}`} style={{ fontSize: 22, opacity: .3 }} />
                  }
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
const EMPTY_ADDRESS = {
  recipientName: '', phone: '', addressLine: '', ward: '', district: '', city: '', isDefault: false,
};

function AddressTab({ showToast }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [saving, setSaving] = useState(false);

  const loadAddresses = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await addressApi.list();
      setAddresses((Array.isArray(data) ? data : data?.items || []).map(normalizeAddress));
    } catch (loadError) {
      setError(extractErrorMessage(loadError, 'Không thể tải sổ địa chỉ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAddresses(); }, []);

  const change = field => event => setForm(previous => ({ ...previous, [field]: event.target.value }));
  const startCreate = () => { setEditingId('new'); setForm(EMPTY_ADDRESS); };
  const startEdit = address => { setEditingId(address.id); setForm(address); };

  const saveAddress = async () => {
    if (!form.recipientName.trim() || !form.phone.trim() || !form.addressLine.trim() || !form.district.trim() || !form.city.trim()) {
      showToast('Vui lòng điền đủ thông tin địa chỉ', 'bi-exclamation-circle');
      return;
    }
    if (!isPhone(form.phone)) {
      showToast('Số điện thoại không đúng định dạng', 'bi-exclamation-circle');
      return;
    }
    const payload = {
      recipientName: form.recipientName.trim(),
      phone: normPhone(form.phone),
      addressLine: form.addressLine.trim(),
      ward: form.ward.trim() || null,
      district: form.district.trim(),
      city: form.city.trim(),
      isDefault: Boolean(form.isDefault),
    };
    setSaving(true);
    try {
      if (editingId === 'new') await addressApi.create(payload);
      else await addressApi.update(editingId, payload);
      await loadAddresses();
      setEditingId(null);
      showToast('Đã lưu địa chỉ', 'bi-check-circle');
    } catch (saveError) {
      showToast(extractErrorMessage(saveError, 'Không thể lưu địa chỉ'), 'bi-x-circle');
    } finally {
      setSaving(false);
    }
  };

  const removeAddress = async id => {
    if (!window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) return;
    try {
      await addressApi.remove(id);
      await loadAddresses();
      showToast('Đã xóa địa chỉ', 'bi-trash');
    } catch (removeError) {
      showToast(extractErrorMessage(removeError, 'Không thể xóa địa chỉ'), 'bi-x-circle');
    }
  };

  const makeDefault = async id => {
    try {
      await addressApi.setDefault(id);
      await loadAddresses();
      showToast('Đã đặt làm địa chỉ mặc định', 'bi-check-circle');
    } catch (defaultError) {
      showToast(extractErrorMessage(defaultError, 'Không thể cập nhật địa chỉ mặc định'), 'bi-x-circle');
    }
  };

  return (
    <>
      <h2 className="profile-section-title">Sổ địa chỉ</h2>
      <p className="profile-section-sub">Quản lý địa chỉ giao nhận hàng</p>
      <button className="btn-lyra mb-4" onClick={startCreate}><i className="bi bi-plus" /> Thêm địa chỉ</button>

      {editingId && (
        <div className="address-form" style={{ border: '1px solid var(--border)', padding: 20, marginBottom: 24 }}>
          <div className="row g-3">
            <div className="col-md-6"><label className="form-field-label">Người nhận</label><input className="form-field-input" value={form.recipientName} onChange={change('recipientName')} /></div>
            <div className="col-md-6"><label className="form-field-label">Số điện thoại</label><input className="form-field-input" value={form.phone} onChange={change('phone')} /></div>
            <div className="col-12"><label className="form-field-label">Số nhà, tên đường</label><input className="form-field-input" value={form.addressLine} onChange={change('addressLine')} /></div>
            <div className="col-md-4"><label className="form-field-label">Phường/Xã</label><input className="form-field-input" value={form.ward} onChange={change('ward')} /></div>
            <div className="col-md-4"><label className="form-field-label">Quận/Huyện</label><input className="form-field-input" value={form.district} onChange={change('district')} /></div>
            <div className="col-md-4"><label className="form-field-label">Tỉnh/Thành phố</label><input className="form-field-input" value={form.city} onChange={change('city')} /></div>
          </div>
          <label className="d-flex align-items-center gap-2 mb-3" style={{ fontSize: 13 }}>
            <input type="checkbox" checked={form.isDefault} onChange={event => setForm(previous => ({ ...previous, isDefault: event.target.checked }))} /> Đặt làm mặc định
          </label>
          <div className="d-flex gap-2">
            <button className="btn-lyra" disabled={saving} onClick={saveAddress}>{saving ? 'Đang lưu...' : 'Lưu địa chỉ'}</button>
            <button className="btn-outline-lyra" onClick={() => setEditingId(null)}>Hủy</button>
          </div>
        </div>
      )}

      {loading ? <p>Đang tải địa chỉ...</p> : error ? (
        <div><p style={{ color: 'var(--danger)' }}>{error}</p><button className="btn-outline-lyra" onClick={loadAddresses}>Thử lại</button></div>
      ) : addresses.length === 0 ? <p style={{ color: 'var(--muted)' }}>Bạn chưa lưu địa chỉ nào.</p> : (
        <div className="address-grid">
          {addresses.map(address => (
            <article key={address.id} className={`address-card${address.isDefault ? ' is-default' : ''}`}>
              <div className="address-card-top">
                <h3 className="address-name">{address.recipientName} · {address.phone}</h3>
                {address.isDefault && <span className="address-badge">Mặc định</span>}
              </div>
              <p className="address-lines">{[address.addressLine, address.ward, address.district, address.city].filter(Boolean).join(', ')}</p>
              <div className="address-actions">
                <button className="btn-outline-lyra" onClick={() => startEdit(address)}>Sửa</button>
                {!address.isDefault && <button className="btn-outline-lyra" onClick={() => makeDefault(address.id)}>Đặt mặc định</button>}
                <button className="btn-outline-lyra" onClick={() => removeAddress(address.id)}>Xóa</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function normalizeAddress(raw) {
  return {
    id: raw.id,
    recipientName: raw.recipientName || raw.fullName || '',
    phone: raw.phone || '',
    addressLine: raw.addressLine || raw.address || '',
    ward: raw.ward || '',
    district: raw.district || '',
    city: raw.city || raw.province || '',
    isDefault: Boolean(raw.isDefault ?? raw.default),
  };
}

/* ── Profile Info Tab ── */
function ProfileInfoTab({ user, updateProfile, showToast }) {
  const [name, setName] = useState(user?.name || '');
  const [email]         = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Họ và tên không được để trống', 'bi-exclamation-circle');
      return;
    }
    if (phone.trim() && !isPhone(phone)) {
      showToast('Số điện thoại không đúng định dạng', 'bi-exclamation-circle');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(name.trim(), phone.trim() ? normPhone(phone) : '');
      showToast('Đã lưu thông tin tài khoản', 'bi-check-circle');
    } catch (error) {
      showToast(error.message || 'Không thể lưu thông tin', 'bi-x-circle');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h2 className="profile-section-title">Thông tin tài khoản</h2>
      <p className="profile-section-sub">Xem và cập nhật thông tin cá nhân</p>
      <div style={{ maxWidth: 480 }}>
        <label className="form-field-label">Họ và tên</label>
        <input className="form-field-input" value={name} onChange={e => setName(e.target.value)} />
        <label className="form-field-label">Email</label>
        <input className="form-field-input" value={email} disabled style={{ opacity: .6 }} />
        <label className="form-field-label">Số điện thoại</label>
        <input className="form-field-input" value={phone} onChange={e => setPhone(e.target.value)} />
        <button
          className="btn-lyra mt-3"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </>
  );
}
