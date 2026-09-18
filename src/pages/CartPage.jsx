// src/pages/CartPage.jsx
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt } from '../data/products';
import { normalizeOrder } from '../data/orders';
import { addressApi, extractErrorMessage, orderApi, paymentApi, voucherApi } from '../services/api';
import { isEmail, isPhone, normPhone } from '../utils/validate';
import { Footer } from '../components/index.jsx';
import '../styles/cart.css';

export default function CartPage({ initialView = 'cart' }) {
  const { navigate, isLoggedIn } = useApp();
  const { cart, cartCount, subtotal, discount: promotionDiscount, shipping: cartShipping,
    removeFromCart, updateQty, showToast } = useCart();
  const [view, setView] = useState(initialView); // 'cart' | 'checkout' | 'success'
  const [createdOrder, setCreatedOrder] = useState(null);

  // Cart customization: Gift wrap
  const [giftWrapEnabled, setGiftWrapEnabled] = useState(false);
  const [giftNote, setGiftNote]               = useState('');

  // Voucher state
  const [voucherCode, setVoucherCode]         = useState('');
  const [appliedVoucher, setAppliedVoucher]   = useState(null);
  const [availableVouchers, setAvailableVouchers] = useState([]);

  const giftWrapFee = giftWrapEnabled ? 30000 : 0;
  let shippingFee = cartShipping;

  // Calculate voucher discount
  let voucherDiscount = 0;
  if (appliedVoucher) {
    shippingFee = Number(appliedVoucher.shippingFee ?? shippingFee);
    voucherDiscount = Number(appliedVoucher.discountAmount ?? 0);
  }

  const finalTotal = Math.max(0, subtotal - promotionDiscount + shippingFee + giftWrapFee - voucherDiscount);

  useEffect(() => {
    if (!isLoggedIn || cart.length === 0) return;
    voucherApi.list()
      .then(({ data }) => setAvailableVouchers(Array.isArray(data) ? data : []))
      .catch(() => setAvailableVouchers([]));
  }, [isLoggedIn, cart.length, subtotal]);

  useEffect(() => {
    if (!isLoggedIn || !appliedVoucher?.code) return;
    voucherApi.quote(appliedVoucher.code)
      .then(({ data }) => setAppliedVoucher(data))
      .catch(() => {
        setAppliedVoucher(null);
        setVoucherCode('');
        showToast('Mã ưu đãi không còn đủ điều kiện sau khi cập nhật giỏ hàng.', 'error');
      });
  }, [isLoggedIn, subtotal, appliedVoucher?.code, showToast]);

  const handleApplyVoucher = async (code) => {
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập để sử dụng mã ưu đãi.', 'error');
      return;
    }
    try {
      const { data } = await voucherApi.quote(code.trim());
      setAppliedVoucher(data);
      setVoucherCode(data.code);
      showToast(`Đã áp dụng mã ưu đãi ${data.code} thành công!`, 'success');
    } catch (error) {
      setAppliedVoucher(null);
      showToast(extractErrorMessage(error, 'Mã ưu đãi không hợp lệ hoặc chưa đủ điều kiện.'), 'error');
    }
  };

  if (view === 'success') {
    return <OrderSuccess navigate={navigate} order={createdOrder} />;
  }

  if (view === 'checkout') {
    return (
      <CheckoutView
        navigate={navigate}
        setView={setView}
        setCreatedOrder={setCreatedOrder}
        finalTotal={finalTotal}
        shippingFee={shippingFee}
        giftWrapFee={giftWrapFee}
        voucherDiscount={voucherDiscount}
        promotionDiscount={promotionDiscount}
        appliedVoucher={appliedVoucher}
        giftNote={giftNote}
        giftWrapEnabled={giftWrapEnabled}
      />
    );
  }

  return (
    <div className="cart-page-wrap">
      <div className="container-fluid px-4 px-lg-5">
        <div className="cart-layout-grid">
          {/* Left Column: Cart Items Table */}
          <div className="cart-main-panel">
            <div className="cart-headline-row">
              <h1 className="cart-headline">Giỏ Hàng Của Bạn</h1>
              <span style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: '.08em' }}>
                {cartCount} thiết kế
              </span>
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 20px' }}>
                <i className="bi bi-bag" style={{ fontSize: 44, color: 'var(--muted)', marginBottom: 16, display: 'block' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: 8 }}>Giỏ hàng của bạn đang trống</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.6 }}>
                  Hãy khám phá bộ sưu tập lụa và linen cao cấp để chọn cho mình những món đồ ưng ý nhất.
                </p>
                <button className="btn-hero-primary" onClick={() => navigate('shop')}>
                  Khám phá Cửa Hàng
                </button>
              </div>
            ) : (
              <>
                <div className="cart-table-head-row">
                  <span>Sản phẩm</span>
                  <span>Đơn giá</span>
                  <span style={{ textAlign: 'center' }}>Số lượng</span>
                  <span style={{ textAlign: 'right' }}>Thành tiền</span>
                  <span></span>
                </div>

                {cart.map(item => (
                  <div key={item.key} className="cart-table-row">
                    <div className="cart-product-info-cell">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=200&auto=format&fit=crop'}
                        alt={item.name}
                        className="cart-product-thumb"
                      />
                      <div>
                        <h4 className="cart-product-name">{item.name}</h4>
                        <div className="cart-product-meta-tags">
                          Size: <strong>{item.size || 'F'}</strong> {item.colorName || item.variantColor ? `· Màu: ${item.colorName || item.variantColor}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                      {fmt(item.price)}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div className="pdp-qty-stepper" style={{ height: 36 }}>
                        <button
                          className="pdp-qty-btn"
                          style={{ width: 30 }}
                          onClick={() => updateQty(item.key, -1)}
                          disabled={item.qty <= 1}
                        >
                          −
                        </button>
                        <span className="pdp-qty-val" style={{ width: 30, fontSize: 13 }}>{item.qty}</span>
                        <button
                          className="pdp-qty-btn"
                          style={{ width: 30 }}
                          onClick={() => updateQty(item.key, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>
                      {fmt(item.price * item.qty)}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                        onClick={() => removeFromCart(item.key)}
                        title="Xóa sản phẩm"
                      >
                        <i className="bi bi-x-lg" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Gift Wrap Box Card */}
                <div className="gift-wrap-option-card">
                  <div
                    className="gift-wrap-header"
                    onClick={() => setGiftWrapEnabled(v => !v)}
                  >
                    <div className="gift-wrap-title">
                      <i className="bi bi-gift" />
                      <span>Đóng gói Hộp Quà Signature Box & Thiệp viết tay (+30.000₫)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={giftWrapEnabled}
                      onChange={e => setGiftWrapEnabled(e.target.checked)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: 18, height: 18, accentColor: 'var(--warm)' }}
                    />
                  </div>
                  {giftWrapEnabled && (
                    <textarea
                      className="gift-note-textarea"
                      placeholder="Nhập lời chúc viết tay gửi tặng người nhận..."
                      value={giftNote}
                      onChange={e => setGiftNote(e.target.value)}
                    />
                  )}
                </div>

                <div style={{ marginTop: 32 }}>
                  <button className="btn-hero-secondary" onClick={() => navigate('shop')}>
                    <i className="bi bi-arrow-left" /> Tiếp tục chọn đồ
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right Column: Order Summary */}
          {cart.length > 0 && (
            <aside className="cart-summary-panel">
              <h2 className="summary-headline">Tóm Tắt Đơn Hàng</h2>

              <div className="summary-data-row">
                <span>Tạm tính</span>
                <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{fmt(subtotal)}</span>
              </div>

              {promotionDiscount > 0 && (
                <div className="summary-data-row" style={{ color: 'var(--warm)' }}>
                  <span>Khuyến mãi sản phẩm</span>
                  <span>−{fmt(promotionDiscount)}</span>
                </div>
              )}

              <div className="summary-data-row">
                <span>Phí vận chuyển</span>
                <span style={{ color: shippingFee === 0 ? 'var(--warm)' : 'var(--ink)' }}>
                  {shippingFee === 0 ? 'Miễn phí' : fmt(shippingFee)}
                </span>
              </div>

              {giftWrapEnabled && (
                <div className="summary-data-row">
                  <span>Hộp quà Signature Box</span>
                  <span>+{fmt(giftWrapFee)}</span>
                </div>
              )}

              {voucherDiscount > 0 && (
                <div className="summary-data-row" style={{ color: 'var(--warm)' }}>
                  <span>Ưu đãi ({appliedVoucher.code})</span>
                  <span>−{fmt(voucherDiscount)}</span>
                </div>
              )}

              {/* Voucher Box */}
              <div className="voucher-box-wrap">
                <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
                  Mã Giảm Giá / Voucher:
                </div>
                <div className="voucher-input-row">
                  <input
                    className="voucher-field"
                    placeholder="Nhập mã ưu đãi..."
                    value={voucherCode}
                    onChange={e => setVoucherCode(e.target.value)}
                  />
                  <button
                    className="btn-apply-voucher"
                    onClick={() => handleApplyVoucher(voucherCode)}
                  >
                    Áp dụng
                  </button>
                </div>

                {/* Quick Voucher Presets */}
                <div className="voucher-chips-list">
                  {availableVouchers.map(v => {
                    const active = appliedVoucher?.code === v.code;
                    return (
                      <button
                        key={v.code}
                        className={`voucher-chip-btn ${active ? 'active' : ''}`}
                        onClick={() => handleApplyVoucher(v.code)}
                      >
                        <i className={`bi ${active ? 'bi-check-circle-fill' : 'bi-tag'}`} />
                        <span>{v.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total Row */}
              <div className="summary-total-row">
                <span className="summary-total-label">Tổng thanh toán</span>
                <span className="summary-total-amount">{fmt(finalTotal)}</span>
              </div>

              <button
                className="btn-hero-primary w-100 justify-content-center"
                style={{ height: 50, fontSize: 13 }}
                onClick={() => setView('checkout')}
              >
                Tiến hành thanh toán <i className="bi bi-arrow-right" />
              </button>

              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                <i className="bi bi-shield-check" style={{ color: 'var(--warm)', marginRight: 6 }} />
                Bảo mật thanh toán SSL 256-bit & Đổi trả 30 ngày
              </div>
            </aside>
          )}
        </div>
      </div>

      <Footer navigate={navigate} />
    </div>
  );
}

/* ── CHECKOUT VIEW ───────────────────────────── */
function CheckoutView({
  navigate,
  setView,
  setCreatedOrder,
  finalTotal,
  shippingFee,
  giftWrapFee,
  voucherDiscount,
  promotionDiscount,
  appliedVoucher,
  giftNote,
  giftWrapEnabled,
}) {
  const { user, isLoggedIn } = useApp();
  const { cart, subtotal, refreshCart, showToast } = useCart();

  const [activePayment, setActivePayment]       = useState('cod');
  const [submitting, setSubmitting]             = useState(false);
  const [savedAddresses, setSavedAddresses]     = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [vnpayEnabled, setVnpayEnabled]         = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: '',
    district: '',
    address: '',
    note: giftNote || '',
  });

  const payOptions = [
    { id: 'cod',   label: 'Thanh toán khi nhận hàng (COD)', desc: 'Thanh toán tiền mặt cho shipper khi nhận kiện hàng.', icon: 'bi-cash-coin' },
    ...(vnpayEnabled ? [
      { id: 'vnpay', label: 'Quét mã VNPay QR', desc: 'Hỗ trợ quét mã qua 40+ ứng dụng ngân hàng & ví VNPay.', icon: 'bi-qr-code' },
    ] : []),
  ];

  useEffect(() => {
    let cancelled = false;
    paymentApi.vnpayStatus()
      .then(({ data }) => { if (!cancelled) setVnpayEnabled(Boolean(data?.enabled)); })
      .catch(() => { if (!cancelled) setVnpayEnabled(false); });
    return () => { cancelled = true; };
  }, []);

  // Load saved addresses
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    addressApi.list()
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.items || [];
        setSavedAddresses(list);
        const def = list.find(item => item.isDefault ?? item.default) || list[0];
        if (def) {
          setSelectedAddressId(String(def.id));
          setForm(prev => ({
            ...prev,
            name: def.recipientName || prev.name,
            phone: def.phoneNumber || prev.phone,
            address: def.addressLine || def.detail || prev.address,
            city: def.city || prev.city,
            district: def.district || prev.district,
          }));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(String(addr.id));
    setForm(prev => ({
      ...prev,
      name: addr.recipientName || prev.name,
      phone: addr.phoneNumber || prev.phone,
      address: addr.addressLine || addr.detail || prev.address,
      city: addr.city || prev.city,
      district: addr.district || prev.district,
    }));
  };

  const handlePlaceOrder = async () => {
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập trước khi hoàn tất đặt hàng', 'error');
      navigate('auth');
      return;
    }
    if (!form.name || !form.phone || !form.address) {
      showToast('Vui lòng điền đầy đủ thông tin người nhận và địa chỉ giao hàng', 'error');
      return;
    }
    if (!isPhone(form.phone)) {
      showToast('Số điện thoại không đúng định dạng', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const shippingAddress = [form.address, form.district, form.city].filter(Boolean).join(', ');
      const response = await orderApi.create({
        shippingAddress,
        shippingPhone: normPhone(form.phone),
        note: form.note || null,
        paymentMethod: activePayment.toUpperCase(),
        voucherCode: appliedVoucher?.code || null,
        giftWrap: giftWrapEnabled,
        giftMessage: giftWrapEnabled ? (giftNote || null) : null,
      });
      const newOrder = normalizeOrder(response.data, {
        ...user,
        name: form.name,
      });
      setCreatedOrder(newOrder);
      await refreshCart();
      if (newOrder.paymentUrl) {
        window.location.assign(newOrder.paymentUrl);
        return;
      }
      setView('success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Không thể tạo đơn hàng. Vui lòng thử lại.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout-wrapper">
      <div className="container-fluid px-4 px-lg-5">
        {/* Step Indicator */}
        <div className="checkout-steps-bar">
          <div className="checkout-step-item done">
            <div className="checkout-step-num"><i className="bi bi-check" /></div>
            <span>Giỏ hàng</span>
          </div>
          <div className="checkout-step-divider" />
          <div className="checkout-step-item active">
            <div className="checkout-step-num">2</div>
            <span>Giao hàng & Thanh toán</span>
          </div>
          <div className="checkout-step-divider" />
          <div className="checkout-step-item">
            <div className="checkout-step-num">3</div>
            <span>Xác nhận</span>
          </div>
        </div>

        <div className="cart-layout-grid">
          {/* Left Form */}
          <div className="cart-main-panel">
            <h2 className="summary-headline" style={{ marginBottom: 24 }}>1. Địa Chỉ Nhận Hàng</h2>

            {/* Saved Addresses Picker */}
            {savedAddresses.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, fontWeight: 600 }}>
                  Chọn từ sổ địa chỉ đã lưu:
                </div>
                <div className="saved-addresses-grid">
                  {savedAddresses.map(addr => {
                    const isSelected = selectedAddressId === String(addr.id);
                    return (
                      <div
                        key={addr.id}
                        className={`saved-addr-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectSavedAddress(addr)}
                      >
                        <div className="saved-addr-badge">{addr.label || 'Địa chỉ'}</div>
                        <div className="saved-addr-name">{addr.recipientName || user?.name}</div>
                        <div className="saved-addr-phone">{addr.phoneNumber}</div>
                        <div className="saved-addr-text">
                          {[addr.addressLine || addr.detail, addr.district, addr.city].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Address Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 36 }}>
              <div>
                <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Họ và tên người nhận *
                </label>
                <input
                  className="custom-price-field"
                  style={{ height: 44 }}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Số điện thoại *
                </label>
                <input
                  className="custom-price-field"
                  style={{ height: 44 }}
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="0912 345 678"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Địa chỉ chi tiết (Số nhà, đường/phố) *
                </label>
                <input
                  className="custom-price-field"
                  style={{ height: 44 }}
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Số 123 Đường Lê Lợi, Phường Bến Thành"
                />
              </div>

              <div>
                <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Quận / Huyện *
                </label>
                <input
                  className="custom-price-field"
                  style={{ height: 44 }}
                  value={form.district}
                  onChange={e => setForm({ ...form, district: e.target.value })}
                  placeholder="Quận 1"
                />
              </div>

              <div>
                <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Tỉnh / Thành phố *
                </label>
                <input
                  className="custom-price-field"
                  style={{ height: 44 }}
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  placeholder="TP. Hồ Chí Minh"
                />
              </div>
            </div>

            {/* Payment Method */}
            <h2 className="summary-headline" style={{ marginBottom: 20 }}>2. Phương Thức Thanh Toán</h2>
            <div className="payment-methods-grid">
              {payOptions.map(p => {
                const active = activePayment === p.id;
                return (
                  <div
                    key={p.id}
                    className={`payment-method-card ${active ? 'active' : ''}`}
                    onClick={() => setActivePayment(p.id)}
                  >
                    <div className="payment-icon-wrap">
                      <i className={`bi ${p.icon}`} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{p.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{p.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note */}
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Ghi chú cho shipper & đóng gói:
              </label>
              <textarea
                className="gift-note-textarea"
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                placeholder="Giao hàng giờ hành chính, gọi trước khi đến..."
              />
            </div>
          </div>

          {/* Right Summary */}
          <aside className="cart-summary-panel">
            <h2 className="summary-headline">Kiểm Tra Đơn Hàng</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
              {cart.map(item => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=100&auto=format&fit=crop'}
                    alt={item.name}
                    style={{ width: 42, height: 56, objectFit: 'cover', border: '1px solid var(--border)' }}
                  />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{item.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>SL: {item.qty} · Size: {item.size}</div>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmt(item.price * item.qty)}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="summary-data-row">
                <span>Tạm tính</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {promotionDiscount > 0 && (
                <div className="summary-data-row" style={{ color: 'var(--warm)' }}>
                  <span>Khuyến mãi sản phẩm</span>
                  <span>−{fmt(promotionDiscount)}</span>
                </div>
              )}
              <div className="summary-data-row">
                <span>Vận chuyển</span>
                <span>{shippingFee === 0 ? 'Miễn phí' : fmt(shippingFee)}</span>
              </div>
              {giftWrapFee > 0 && (
                <div className="summary-data-row">
                  <span>Hộp quà Signature</span>
                  <span>+{fmt(giftWrapFee)}</span>
                </div>
              )}
              {voucherDiscount > 0 && (
                <div className="summary-data-row" style={{ color: 'var(--warm)' }}>
                  <span>Ưu đãi</span>
                  <span>−{fmt(voucherDiscount)}</span>
                </div>
              )}
              <div className="summary-total-row">
                <span className="summary-total-label">Tổng thanh toán</span>
                <span className="summary-total-amount">{fmt(finalTotal)}</span>
              </div>
            </div>

            <button
              className="btn-hero-primary w-100 justify-content-center"
              style={{ height: 50 }}
              onClick={handlePlaceOrder}
              disabled={submitting}
            >
              {submitting ? 'Đang xử lý...' : 'Xác nhận Đặt Hàng'}
            </button>

            <button
              className="btn-hero-secondary w-100 justify-content-center"
              style={{ height: 40, fontSize: 12 }}
              onClick={() => setView('cart')}
            >
              Quay lại giỏ hàng
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ── ORDER SUCCESS ───────────────────────────── */
function OrderSuccess({ navigate, order }) {
  return (
    <div className="container px-4">
      <div className="order-success-wrap">
        <div className="success-icon-badge">
          <i className="bi bi-check2" />
        </div>

        <h1 className="success-title">Đặt Hàng Thành Công!</h1>
        <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
          Cảm ơn quý khách đã tin tưởng và lựa chọn thiết kế của Lyra. Đơn hàng của bạn đã được tiếp nhận và chuyển đến bộ phận đóng gói Signature Box.
        </p>

        <div className="success-order-id-box">
          MÃ ĐƠN HÀNG: <strong>#{order?.code || order?.id || 'LY-2026'}</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <button
            className="btn-hero-primary"
            onClick={() => navigate('profile')}
          >
            Xem hành trình đơn hàng
          </button>
          <button
            className="btn-hero-secondary"
            onClick={() => navigate('shop')}
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    </div>
  );
}
