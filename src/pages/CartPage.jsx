// src/pages/CartPage.jsx
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt } from '../data/products';
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
            {['COD','MoMo','VNPay','Banking'].map(m => (
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
  const { cart, subtotal, shipping, total, clearCart, showToast } = useCart();
  const [activePayment, setActivePayment] = useState('cod');
  const [step, setStep]   = useState(2);
  const [form, setForm]   = useState({
    lastName: '', firstName: '', email: '', phone: '',
    city: 'Hà Nội', district: 'Hoàn Kiếm', address: '', note: '',
  });

  const payOptions = [
    { id: 'cod',     label: 'Thanh toán khi nhận hàng (COD)', icon: 'bi-cash' },
    { id: 'banking', label: 'Chuyển khoản ngân hàng',         icon: 'bi-bank' },
    { id: 'momo',    label: 'Ví MoMo',                        icon: 'bi-phone' },
    { id: 'vnpay',   label: 'VNPay QR',                       icon: 'bi-qr-code' },
  ];

  const handleInputChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handlePlaceOrder = () => {
    if (!form.lastName || !form.firstName || !form.email || !form.phone || !form.address) {
      showToast('Vui lòng điền đầy đủ thông tin giao hàng', 'bi-exclamation-circle');
      return;
    }

    const orderId = `#LYRA${Date.now().toString().slice(-6)}`;
    const newOrder = {
      id: orderId,
      date: new Date().toLocaleDateString('vi-VN'),
      createdAt: new Date().toLocaleString('vi-VN'),
      status: 'processing',
      total,
      subtotal,
      shipping,
      discount: 0,
      payment: activePayment.toUpperCase(),
      items: [...cart],
      address: {
        name: `${form.lastName} ${form.firstName}`,
        phone: form.phone,
        address: `${form.address}, ${form.district}, ${form.city}`,
      },
    };

    // Save order into localStorage for history tracking
    try {
      const existing = JSON.parse(localStorage.getItem('lyra_orders') || '[]');
      localStorage.setItem('lyra_orders', JSON.stringify([newOrder, ...existing]));
    } catch {}

    setCreatedOrder(newOrder);
    setStep(4);
    clearCart();
    setView('success');
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
          <input className="form-field-input" type="email" placeholder="email@example.com" value={form.email} onChange={handleInputChange('email')} />
          <label className="form-field-label">Số điện thoại</label>
          <input className="form-field-input" type="tel" placeholder="0912 345 678" value={form.phone} onChange={handleInputChange('phone')} />

          <div className="row g-3 mb-1">
            <div className="col-6">
              <label className="form-field-label">Tỉnh / Thành phố</label>
              <select className="form-field-input" value={form.city} onChange={handleInputChange('city')}>
                <option>Hà Nội</option>
                <option>TP. Hồ Chí Minh</option>
                <option>Đà Nẵng</option>
                <option>Cần Thơ</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-field-label">Quận / Huyện</label>
              <select className="form-field-input" value={form.district} onChange={handleInputChange('district')}>
                <option>Hoàn Kiếm</option>
                <option>Ba Đình</option>
                <option>Đống Đa</option>
                <option>Cầu Giấy</option>
              </select>
            </div>
          </div>
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
            <button className="btn-lyra w-100 justify-content-center" onClick={handlePlaceOrder}>
              Đặt hàng ngay <i className="bi bi-check2" />
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

/* ── Order Success ───────────────────────── */
function OrderSuccess({ navigate, order }) {
  const orderId = order?.id || `#LYRA${Date.now().toString().slice(-6)}`;
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
