// src/pages/CartPage.jsx
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt } from '../data/products';
import { normalizeOrder } from '../data/orders';
import { addressApi, extractErrorMessage, orderApi } from '../services/api';
import { isEmail, isPhone, normPhone } from '../utils/validate';
import { Footer } from '../components/index.jsx';

export default function CartPage() {
  const { navigate } = useApp();
  const { cart, cartCount, subtotal, shipping, total, removeFromCart, updateQty } = useCart();
  const [view, setView] = useState('cart'); // cart | checkout | success
  const [createdOrder, setCreatedOrder] = useState(null);

  if (view === 'success') return <OrderSuccess navigate={navigate} order={createdOrder} />;
  if (view === 'checkout') return <CheckoutView navigate={navigate} setView={setView} setCreatedOrder={setCreatedOrder} />;

  return (
    <div>
      <div className="cart-layout">
        {/* Left */}
        <div className="cart-main-col">
          <h1 className="cart-page-title">Giỏ hàng</h1>
          <p className="cart-items-count">{cartCount} sản phẩm</p>

          {cart.length === 0 ? (
            <div className="cart-empty-state">
              <i className="bi bi-bag" />
              <div className="cart-empty-title">Giỏ hàng trống</div>
              <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 280, lineHeight: 1.6 }}>
                Bạn chưa thêm sản phẩm nào vào giỏ hàng.
              </p>
              <button className="btn-outline-lyra cart-continue-shopping mt-3" onClick={() => navigate('shop')}>
                <span className="cart-continue-arrow" aria-hidden="true">←</span>
                <span className="cart-continue-label">Tiếp tục mua sắm</span>
              </button>
            </div>
          ) : (
            <>
              <div className="cart-table-head">
                <span>Sản phẩm</span>
                <span>Đơn giá</span>
                <span>Số lượng</span>
                <span>Thành tiền</span>
                <span></span>
              </div>
              {cart.map(item => (
                <div key={item.key} className="cart-row">
                  {/* Product info */}
                  <div className="d-flex gap-3 align-items-center">
                    <div className="cart-item-img-box" style={{ background: (item.color || '#E4DAD0') + '88' }}>
                      <i className={`bi ${item.icon || 'bi-bag'}`} />
                    </div>
                    <div>
                      <div className="cart-item-product-name">{item.name}</div>
                      <div className="cart-item-meta">
                        {item.brand || 'LYRA'} · Size: {item.size} · Màu: {item.colorName || item.color}
                      </div>
                    </div>
                  </div>
                  {/* Price */}
                  <div className="item-price">{fmt(item.price)}</div>
                  {/* Qty */}
                  <div className="cart-qty-ctrl">
                    <button className="cart-qty-btn" onClick={() => updateQty(item.key, -1)}>−</button>
                    <div className="cart-qty-val">{item.qty}</div>
                    <button className="cart-qty-btn" onClick={() => updateQty(item.key, 1)}>+</button>
                  </div>
                  {/* Total */}
                  <div className="item-total">{fmt(item.price * item.qty)}</div>
                  {/* Remove */}
                  <button className="cart-remove-btn" onClick={() => removeFromCart(item.key)}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              ))}

              <div className="d-flex justify-content-between align-items-center mt-4">
                <button className="btn-outline-lyra cart-continue-shopping" onClick={() => navigate('shop')}>
                  <span className="cart-continue-arrow" aria-hidden="true">←</span>
                  <span className="cart-continue-label">Tiếp tục mua sắm</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Summary */}
        <aside className="cart-summary-col">
          <h2 className="summary-title">Tóm tắt đơn</h2>

          <div className="summary-line">
            <span className="s-label">Tạm tính</span>
            <span>{fmt(subtotal)}</span>
          </div>
          <div className="summary-line">
            <span className="s-label">Phí vận chuyển</span>
            <span>{shipping === 0 ? 'Miễn phí' : fmt(shipping)}</span>
          </div>
          <div className="summary-total-line">
            <span className="t-label">Tổng cộng</span>
            <span className="summary-total-val">{fmt(total)}</span>
          </div>

          <button className="btn-warm mt-3" onClick={() => cart.length > 0 && setView('checkout')}>
            Tiến hành thanh toán <i className="bi bi-arrow-right" />
          </button>
          <div className="payment-methods-row">
            {['COD','VNPay'].map(m => (
              <div key={m} className="pay-method-tag">{m}</div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', marginTop: 12 }}>
            <i className="bi bi-shield-lock" style={{ marginRight: 5 }} />
            Thanh toán an toàn, mã hóa SSL
          </div>
        </aside>
      </div>
      <Footer navigate={navigate} />
    </div>
  );
}

/* ── Checkout ───────────────────────────── */
function CheckoutView({ navigate, setView, setCreatedOrder }) {
  const { user, isLoggedIn } = useApp();
  const { cart, subtotal, shipping, total, refreshCart, showToast } = useCart();
  const [activePayment, setActivePayment] = useState('cod');
  const [step, setStep]   = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [form, setForm] = useState(() => {
    const name = splitFullName(user?.name);
    return {
      ...name,
      email: user?.email || '', phone: user?.phone || '',
      city: '', district: '', ward: '', address: '', note: '',
    };
  });

  const payOptions = [
    { id: 'cod',     label: 'Thanh toán khi nhận hàng (COD)', icon: 'bi-cash' },
    { id: 'vnpay',   label: 'VNPay QR',                       icon: 'bi-qr-code' },
  ];

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    addressApi.list()
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.items || [];
        setSavedAddresses(list);
        const preferred = list.find(item => item.isDefault ?? item.default) || list[0];
        if (preferred) applySavedAddress(preferred, setForm, setSelectedAddressId);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const handleInputChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handlePlaceOrder = async () => {
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập trước khi đặt hàng', 'bi-person');
      navigate('auth');
      return;
    }
    const recipientName = `${form.lastName} ${form.firstName}`.trim();
    if (!recipientName || !form.email || !form.phone || !form.address || !form.district || !form.city) {
      showToast('Vui lòng điền đầy đủ thông tin giao hàng', 'bi-exclamation-circle');
      return;
    }
    if (!isEmail(form.email)) {
      showToast('Địa chỉ email không đúng định dạng', 'bi-exclamation-circle');
      return;
    }
    if (!isPhone(form.phone)) {
      showToast('Số điện thoại không đúng định dạng', 'bi-exclamation-circle');
      return;
    }

    setSubmitting(true);
    try {
      const response = await orderApi.create({
        shippingAddress: [form.address, form.ward, form.district, form.city].filter(Boolean).join(', '),
        shippingPhone: normPhone(form.phone),
        note: form.note || null,
        paymentMethod: activePayment.toUpperCase(),
      });
      const newOrder = normalizeOrder(response.data, {
        ...user,
        name: recipientName,
      });
      setCreatedOrder(newOrder);
      setStep(4);
      await refreshCart();
      if (newOrder.paymentUrl) {
        window.location.assign(newOrder.paymentUrl);
        return;
      }
      setView('success');
    } catch (error) {
      showToast(extractErrorMessage(error, 'Không thể tạo đơn hàng'), 'bi-x-circle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout-wrapper">
      <h1 className="checkout-title">Thanh toán</h1>

      {/* Steps */}
      <div className="checkout-steps">
        {[
          { n: 1, label: 'Giỏ hàng', state: 'done' },
          { n: 2, label: 'Giao hàng', state: step >= 2 ? 'active' : '' },
          { n: 3, label: 'Thanh toán', state: step >= 3 ? 'active' : '' },
          { n: 4, label: 'Xác nhận', state: step >= 4 ? 'active' : '' },
        ].map((s, i, arr) => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 'none' }}>
            <div className={`c-step ${s.state}`}>
              <div className="c-step-num">
                {s.state === 'done' ? <i className="bi bi-check" /> : s.n}
              </div>
              <span className="c-step-label">{s.label}</span>
            </div>
            {i < arr.length - 1 && <div className="c-step-line" />}
          </div>
        ))}
      </div>

      <div className="checkout-grid">
        {/* Form */}
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 20, color: 'var(--muted)' }}>
            Thông tin giao hàng
          </div>

          {savedAddresses.length > 0 && (
            <>
              <label className="form-field-label">Địa chỉ đã lưu</label>
              <select
                className="form-field-input"
                value={selectedAddressId}
                onChange={event => {
                  const address = savedAddresses.find(item => String(item.id) === event.target.value);
                  if (address) applySavedAddress(address, setForm, setSelectedAddressId);
                }}
              >
                {savedAddresses.map(address => (
                  <option key={address.id} value={address.id}>
                    {address.recipientName || address.fullName} — {address.addressLine || address.address}
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="row g-3 mb-1">
            <div className="col-6">
              <label className="form-field-label">Họ</label>
              <input className="form-field-input" placeholder="Nguyễn" value={form.lastName} onChange={handleInputChange('lastName')} />
            </div>
            <div className="col-6">
              <label className="form-field-label">Tên</label>
              <input className="form-field-input" placeholder="Văn An" value={form.firstName} onChange={handleInputChange('firstName')} />
            </div>
          </div>
          <label className="form-field-label">Email</label>
          <input className="form-field-input" type="email" value={form.email} disabled style={{ opacity: .6 }} />
          <label className="form-field-label">Số điện thoại</label>
          <input className="form-field-input" type="tel" placeholder="0912 345 678" value={form.phone} onChange={handleInputChange('phone')} />

          <div className="row g-3 mb-1">
            <div className="col-md-6">
              <label className="form-field-label">Tỉnh / Thành phố</label>
              <input className="form-field-input" value={form.city} onChange={handleInputChange('city')} />
            </div>
            <div className="col-md-6">
              <label className="form-field-label">Quận / Huyện</label>
              <input className="form-field-input" value={form.district} onChange={handleInputChange('district')} />
            </div>
          </div>
          <label className="form-field-label">Phường / Xã</label>
          <input className="form-field-input" value={form.ward} onChange={handleInputChange('ward')} />
          <label className="form-field-label">Địa chỉ cụ thể</label>
          <input className="form-field-input" placeholder="Số nhà, tên đường, phường/xã" value={form.address} onChange={handleInputChange('address')} />
          <label className="form-field-label">Ghi chú đơn hàng</label>
          <textarea className="form-field-input" rows={3} placeholder="Ghi chú về đơn hàng..." style={{ resize: 'none' }} value={form.note} onChange={handleInputChange('note')} />

          {/* Payment */}
          <div style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', margin: '28px 0 14px', color: 'var(--muted)' }}>
            Phương thức thanh toán
          </div>
          {payOptions.map(opt => (
            <div key={opt.id}
              className={`payment-option${activePayment === opt.id ? ' active' : ''}`}
              onClick={() => setActivePayment(opt.id)}
            >
              <div className="pay-radio-outer">
                <div className="pay-radio-inner" />
              </div>
              <span className="pay-method-label">{opt.label}</span>
              <i className={`bi ${opt.icon} pay-method-icon`} />
            </div>
          ))}

          <div className="d-flex gap-3 mt-4">
            <button className="btn-outline-lyra flex-shrink-0" onClick={() => setView('cart')}>
              <i className="bi bi-arrow-left" /> Giỏ hàng
            </button>
            <button className="btn-lyra w-100 justify-content-center" onClick={handlePlaceOrder} disabled={submitting}>
              {submitting ? 'Đang tạo đơn...' : 'Đặt hàng ngay'} <i className="bi bi-check2" />
            </button>
          </div>
        </div>

        {/* Order mini */}
        <div>
          <div className="order-mini-card">
            <div className="order-mini-heading">Sản phẩm trong đơn</div>
            {cart.map(item => (
              <div key={item.key} className="order-mini-row">
                <div className="mini-img" style={{ background: (item.color || '#E4DAD0') + '88' }}>
                  <i className={`bi ${item.icon || 'bi-bag'}`} />
                </div>
                <div>
                  <div className="mini-name">{item.name}</div>
                  <div className="mini-meta">Size {item.size} · ×{item.qty}</div>
                </div>
                <div className="mini-price">{fmt(item.price * item.qty)}</div>
              </div>
            ))}
            <hr className="order-divider" />
            <div className="summary-line" style={{ fontSize: 13 }}><span className="s-label">Tạm tính</span><span>{fmt(subtotal)}</span></div>
            <div className="summary-line" style={{ fontSize: 13 }}><span className="s-label">Vận chuyển</span><span>{shipping === 0 ? 'Miễn phí' : fmt(shipping)}</span></div>
            <div className="summary-total-line" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <span style={{ fontSize: 14 }}>Tổng cộng</span>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function applySavedAddress(address, setForm, setSelectedAddressId) {
  const name = splitFullName(address.recipientName || address.fullName);
  setSelectedAddressId(String(address.id));
  setForm(previous => ({
    ...previous,
    ...name,
    phone: address.phone || '',
    address: address.addressLine || address.address || '',
    district: address.district || '',
    ward: address.ward || '',
    city: address.city || address.province || '',
  }));
}

function splitFullName(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  return {
    lastName: parts.shift() || '',
    firstName: parts.join(' '),
  };
}

/* ── Order Success ───────────────────────── */
function OrderSuccess({ navigate, order }) {
  const orderId = order?.displayId || order?.id || '#LYRA';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 68px)', textAlign: 'center', padding: 40 }}>
      <div style={{ width: 80, height: 80, background: 'var(--warm)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <i className="bi bi-check-lg" style={{ fontSize: 36, color: '#fff' }} />
      </div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 42, fontWeight: 300, marginBottom: 12 }}>Đặt hàng thành công!</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 400, lineHeight: 1.7, marginBottom: 10 }}>
        Cảm ơn bạn đã mua sắm tại LYRA. Chúng tôi sẽ xử lý và giao hàng trong 2–3 ngày làm việc.
      </p>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>
        Mã đơn hàng: <strong style={{ color: 'var(--ink)' }}>{orderId}</strong>
      </p>
      <div className="d-flex gap-3">
        <button className="btn-lyra" onClick={() => navigate('home')}>Về trang chủ</button>
        <button className="btn-outline-lyra" onClick={() => navigate('profile')}>Xem đơn hàng</button>
      </div>
    </div>
  );
}
