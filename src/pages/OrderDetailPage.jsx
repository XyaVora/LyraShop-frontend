// src/pages/OrderDetailPage.jsx
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS, ORDERS_MOCK, fmt } from '../data/products';
import { Stars, Footer } from '../components/index.jsx';

// Bổ sung chi tiết cho mock orders
const ORDER_DETAIL_MAP = {
  '#MSN240001': {
    id: '#MSN240001',
    date: '15/01/2025', createdAt: '15/01/2025 09:32',
    status: 'delivered',
    items: [
      { ...PRODUCTS[0], qty: 1, size: 'M', color: 'Trắng ngà' },
      { ...PRODUCTS[2], qty: 1, size: '38', color: 'Đen' },
      { ...PRODUCTS[3], qty: 1, size: 'Free', color: 'Camel' },
    ],
    address: { name: 'Nguyễn Văn A', phone: '0912 345 678', address: '123 Phố Huế, Bùi Thị Xuân, Hai Bà Trưng, Hà Nội' },
    payment: 'COD', shipping: 0, discount: 0,
    timeline: [
      { status: 'Đặt hàng thành công', time: '15/01 09:32', done: true, icon: 'bi-check-circle' },
      { status: 'Xác nhận đơn hàng',  time: '15/01 10:15', done: true, icon: 'bi-bag-check' },
      { status: 'Đang đóng gói',       time: '15/01 14:00', done: true, icon: 'bi-box-seam' },
      { status: 'Đang vận chuyển',     time: '16/01 08:20', done: true, icon: 'bi-truck' },
      { status: 'Giao hàng thành công', time: '17/01 15:45', done: true, icon: 'bi-house-check' },
    ],
  },
  '#MSN240002': {
    id: '#MSN240002',
    date: '22/01/2025', createdAt: '22/01/2025 14:18',
    status: 'shipping',
    items: [
      { ...PRODUCTS[4], qty: 1, size: 'L', color: 'Đen' },
      { ...PRODUCTS[7], qty: 2, size: 'XL', color: 'Trắng' },
    ],
    address: { name: 'Nguyễn Văn A', phone: '0912 345 678', address: '123 Phố Huế, Bùi Thị Xuân, Hai Bà Trưng, Hà Nội' },
    payment: 'Banking', shipping: 0, discount: 0,
    timeline: [
      { status: 'Đặt hàng thành công', time: '22/01 14:18', done: true,  icon: 'bi-check-circle' },
      { status: 'Xác nhận đơn hàng',  time: '22/01 15:00', done: true,  icon: 'bi-bag-check' },
      { status: 'Đang đóng gói',       time: '22/01 17:30', done: true,  icon: 'bi-box-seam' },
      { status: 'Đang vận chuyển',     time: '23/01 09:00', done: true,  icon: 'bi-truck' },
      { status: 'Giao hàng thành công', time: 'Dự kiến 24/01', done: false, icon: 'bi-house-check' },
    ],
  },
  '#MSN240003': {
    id: '#MSN240003',
    date: '28/01/2025', createdAt: '28/01/2025 20:05',
    status: 'processing',
    items: [
      { ...PRODUCTS[8], qty: 1, size: '32', color: 'Xanh' },
    ],
    address: { name: 'Nguyễn Văn A', phone: '0912 345 678', address: '123 Phố Huế, Bùi Thị Xuân, Hai Bà Trưng, Hà Nội' },
    payment: 'MoMo', shipping: 30000, discount: 0,
    timeline: [
      { status: 'Đặt hàng thành công', time: '28/01 20:05', done: true,  icon: 'bi-check-circle' },
      { status: 'Xác nhận đơn hàng',  time: 'Đang xử lý',  done: false, icon: 'bi-bag-check' },
      { status: 'Đang đóng gói',       time: '—',           done: false, icon: 'bi-box-seam' },
      { status: 'Đang vận chuyển',     time: '—',           done: false, icon: 'bi-truck' },
      { status: 'Giao hàng thành công', time: '—',          done: false, icon: 'bi-house-check' },
    ],
  },
};

const STATUS_CONFIG = {
  delivered:  { label: 'Đã giao thành công', color: 'var(--success)',  bg: 'rgba(90,138,90,.1)',  icon: 'bi-house-check' },
  shipping:   { label: 'Đang vận chuyển',    color: '#8B6840',         bg: 'rgba(200,169,126,.15)', icon: 'bi-truck' },
  processing: { label: 'Đang xử lý',         color: 'var(--ink)',      bg: 'rgba(14,14,14,.06)',  icon: 'bi-arrow-repeat' },
  cancelled:  { label: 'Đã hủy',             color: 'var(--danger)',   bg: 'rgba(168,68,68,.1)',  icon: 'bi-x-circle' },
};

const PAY_LABEL = { COD: 'Thanh toán khi nhận hàng', Banking: 'Chuyển khoản ngân hàng', MoMo: 'Ví MoMo', VNPay: 'VNPay QR' };

export default function OrderDetailPage() {
  const { navigate, selectedOrder } = useApp();
  const { addToCart, showToast } = useCart();
  const [activeTab, setActiveTab] = useState('detail');
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Dùng selectedOrder nếu có, fallback về đơn đầu tiên
  const order = ORDER_DETAIL_MAP[selectedOrder] || ORDER_DETAIL_MAP['#MSN240001'];
  const statusCfg = STATUS_CONFIG[order.status];
  const subtotal = order.items.reduce((a, item) => a + item.price * item.qty, 0);
  const total = subtotal + order.shipping - order.discount;

  const reorder = () => {
    order.items.forEach(item => addToCart(item, item.qty, item.size, item.color));
    navigate('cart');
  };

  const activeTimelineIdx = order.timeline.filter(t => t.done).length - 1;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ padding: '48px 0 32px', borderBottom: '1px solid var(--border)', background: 'var(--cream-dark)' }}>
        <div className="container-fluid px-4 px-lg-5">
          {/* Breadcrumb */}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('home')}>Trang chủ</span>
            <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('profile')}>Tài khoản</span>
            <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
            <span style={{ color: 'var(--ink)' }}>Chi tiết đơn hàng</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: 300, marginBottom: 8 }}>
                Đơn hàng <em style={{ fontStyle: 'italic', color: 'var(--warm)' }}>{order.id}</em>
              </h1>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                <i className="bi bi-clock me-2" />Đặt lúc {order.createdAt}
              </div>
            </div>
            {/* Status badge */}
            <div style={{
              padding: '12px 22px',
              background: statusCfg.bg, color: statusCfg.color,
              border: `1px solid ${statusCfg.color}22`,
              display: 'flex', alignItems: 'center', gap: 9,
            }}>
              <i className={`bi ${statusCfg.icon}`} style={{ fontSize: 18 }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{statusCfg.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="container-fluid px-4 px-lg-5">
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { id: 'detail',  label: 'Chi tiết đơn' },
              { id: 'track',   label: 'Theo dõi vận chuyển' },
              { id: 'invoice', label: 'Hóa đơn' },
            ].map(tab => (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '14px 24px', background: 'none', border: 'none',
                  borderBottom: `2px solid ${activeTab === tab.id ? 'var(--ink)' : 'transparent'}`,
                  fontSize: 13, letterSpacing: '.06em', cursor: 'pointer',
                  color: activeTab === tab.id ? 'var(--ink)' : 'var(--muted)',
                  fontFamily: 'var(--font-sans)', transition: 'all .2s',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div style={{ padding: '40px 0 72px' }}>
        <div className="container-fluid px-4 px-lg-5">

          {/* ─── TAB: Chi tiết đơn ─── */}
          {activeTab === 'detail' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40 }}>
              <div>
                {/* Items */}
                <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 18 }}>
                  Sản phẩm đã đặt
                </div>
                <div style={{ border: '1px solid var(--border)' }}>
                  {order.items.map((item, i) => (
                    <div key={`${item.id}-${i}`} style={{
                      display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                      gap: 16, padding: '20px 20px',
                      borderBottom: i < order.items.length - 1 ? '1px solid var(--border)' : 'none',
                      alignItems: 'center',
                    }}>
                      {/* Thumb */}
                      <div
                        style={{ width: 76, height: 96, background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                        onClick={() => navigate('detail', { product: item })}
                      >
                        <i className={`bi ${item.icon}`} style={{ fontSize: 28, color: 'rgba(14,14,14,.2)' }} />
                      </div>
                      {/* Info */}
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 400, marginBottom: 4, cursor: 'pointer' }}
                          onClick={() => navigate('detail', { product: item })}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                          {item.brand} · Size: {item.size} · Màu: {item.color}
                        </div>
                        <Stars rating={item.rating} size={10} />
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>x{item.qty}</div>
                      </div>
                      {/* Price */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 4 }}>{fmt(item.price * item.qty)}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{fmt(item.price)} / SP</div>
                        {order.status === 'delivered' && (
                          <button
                            onClick={() => showToast('Cảm ơn bạn đã đánh giá!', 'bi-star-fill')}
                            style={{ marginTop: 8, background: 'none', border: '1px solid var(--border)', padding: '4px 12px', fontSize: 11.5, cursor: 'pointer', fontFamily: 'var(--font-sans)', color: 'var(--muted)', transition: 'all .2s' }}
                          >
                            Đánh giá
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                  <button className="btn-maison" onClick={reorder}>
                    <i className="bi bi-arrow-repeat" /> Mua lại
                  </button>
                  <button className="btn-outline-maison" onClick={() => navigate('shop')}>
                    <i className="bi bi-bag" /> Tiếp tục mua sắm
                  </button>
                  {order.status === 'processing' && (
                    <button
                      className="btn-outline-maison"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => setShowCancelModal(true)}
                    >
                      <i className="bi bi-x-circle" /> Hủy đơn
                    </button>
                  )}
                </div>
              </div>

              {/* Sidebar summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Order summary */}
                <div style={{ border: '1px solid var(--border)', padding: '22px 24px' }}>
                  <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 18, color: 'var(--muted)' }}>
                    Tóm tắt thanh toán
                  </div>
                  {[
                    { label: 'Tạm tính', val: fmt(subtotal) },
                    { label: 'Phí vận chuyển', val: order.shipping === 0 ? 'Miễn phí' : fmt(order.shipping) },
                    ...(order.discount > 0 ? [{ label: 'Giảm giá', val: `-${fmt(order.discount)}`, color: 'var(--warm)' }] : []),
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--muted)' }}>{label}</span>
                      <span style={{ color: color || 'var(--ink)' }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, marginTop: 4 }}>
                    <span style={{ fontSize: 14 }}>Tổng cộng</span>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>{fmt(total)}</span>
                  </div>
                </div>

                {/* Delivery address */}
                <div style={{ border: '1px solid var(--border)', padding: '22px 24px' }}>
                  <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 14, color: 'var(--muted)' }}>
                    Địa chỉ giao hàng
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{order.address.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{order.address.phone}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{order.address.address}</div>
                </div>

                {/* Payment method */}
                <div style={{ border: '1px solid var(--border)', padding: '22px 24px' }}>
                  <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 14, color: 'var(--muted)' }}>
                    Phương thức thanh toán
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <i className="bi bi-credit-card" style={{ fontSize: 18, color: 'var(--warm)' }} />
                    {PAY_LABEL[order.payment] || order.payment}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: Theo dõi vận chuyển ─── */}
          {activeTab === 'track' && (
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 32 }}>
                Trạng thái vận chuyển
              </div>

              {/* Progress bar */}
              <div style={{ position: 'relative', marginBottom: 48, padding: '0 20px' }}>
                <div style={{ height: 2, background: 'var(--border)', position: 'absolute', top: 16, left: 20, right: 20 }} />
                <div style={{
                  height: 2, background: 'var(--warm)', position: 'absolute', top: 16, left: 20,
                  width: `${(activeTimelineIdx / (order.timeline.length - 1)) * 100}%`,
                  transition: 'width .6s ease',
                  right: 'auto',
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                  {order.timeline.map((step, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: step.done ? 'var(--warm)' : 'var(--cream)',
                        border: `2px solid ${step.done ? 'var(--warm)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1, position: 'relative', transition: 'all .3s',
                      }}>
                        <i className={`bi ${step.icon}`} style={{ fontSize: 13, color: step.done ? '#fff' : 'var(--muted)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[...order.timeline].reverse().map((step, i) => {
                  const isActive = [...order.timeline].reverse().findIndex(s => s.done) === i;
                  return (
                    <div key={i} style={{ display: 'flex', gap: 20, padding: '16px 0', borderBottom: i < order.timeline.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      {/* Icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: step.done ? (isActive ? 'var(--warm)' : 'var(--cream-dark)') : 'transparent',
                        border: `1.5px solid ${step.done ? (isActive ? 'var(--warm)' : 'var(--border)') : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <i className={`bi ${step.icon}`} style={{ fontSize: 16, color: step.done ? (isActive ? '#fff' : 'var(--muted)') : 'var(--border)' }} />
                      </div>
                      {/* Text */}
                      <div>
                        <div style={{ fontSize: 14, fontWeight: step.done ? 400 : 300, color: step.done ? 'var(--ink)' : 'var(--muted-light)', marginBottom: 3 }}>
                          {step.status}
                          {isActive && step.done && (
                            <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--warm)', color: '#fff', padding: '2px 8px', verticalAlign: 'middle' }}>
                              Hiện tại
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: step.done ? 'var(--muted)' : 'var(--muted-light)' }}>{step.time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Shipping info */}
              <div style={{ marginTop: 36, padding: '20px 24px', background: 'var(--cream-dark)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Mã vận đơn', val: `VN${order.id.replace('#MSN', '')}24` },
                    { label: 'Đơn vị vận chuyển', val: 'GHTK Express' },
                    { label: 'Ngày đặt', val: order.date },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>{label}</div>
                      <div style={{ fontSize: 14 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: Hóa đơn ─── */}
          {activeTab === 'invoice' && (
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              {/* Invoice card */}
              <div style={{ border: '1px solid var(--border)', padding: '40px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, paddingBottom: 28, borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 300, letterSpacing: '.1em', marginBottom: 6 }}>MAISON</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
                      123 Phố Cổ, Hoàn Kiếm, Hà Nội<br />
                      support@maison.vn · 1900 1234
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>HÓA ĐƠN</div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginBottom: 4 }}>{order.id}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{order.createdAt}</div>
                  </div>
                </div>

                {/* Billing info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 32 }}>
                  <div>
                    <div style={{ fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Khách hàng</div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{order.address.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                      {order.address.phone}<br />{order.address.address}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Thanh toán</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                      {PAY_LABEL[order.payment]}<br />
                      Ngày: {order.date}<br />
                      Trạng thái: <span style={{ color: 'var(--success)' }}>Đã thanh toán</span>
                    </div>
                  </div>
                </div>

                {/* Items table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Sản phẩm', 'Size', 'SL', 'Đơn giá', 'Thành tiền'].map(h => (
                        <th key={h} style={{ padding: '8px 0', textAlign: h === 'Thành tiền' ? 'right' : 'left', fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 0' }}>{item.name}</td>
                        <td style={{ padding: '12px 0', color: 'var(--muted)' }}>{item.size}</td>
                        <td style={{ padding: '12px 0', color: 'var(--muted)' }}>{item.qty}</td>
                        <td style={{ padding: '12px 0', fontFamily: 'var(--font-serif)' }}>{fmt(item.price)}</td>
                        <td style={{ padding: '12px 0', fontFamily: 'var(--font-serif)', textAlign: 'right' }}>{fmt(item.price * item.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div style={{ maxWidth: 260, marginLeft: 'auto' }}>
                  {[
                    { label: 'Tạm tính', val: fmt(subtotal) },
                    { label: 'Vận chuyển', val: order.shipping === 0 ? 'Miễn phí' : fmt(order.shipping) },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '7px 0', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                      <span>{label}</span><span>{val}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', fontSize: 15 }}>
                    <span style={{ fontWeight: 500 }}>Tổng cộng</span>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>{fmt(total)}</span>
                  </div>
                </div>

                {/* Footer note */}
                <div style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.7 }}>
                  Cảm ơn bạn đã mua sắm tại MAISON. Đây là hóa đơn điện tử, có giá trị tương đương hóa đơn giấy.
                </div>
              </div>

              {/* Print button */}
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button className="btn-outline-maison" onClick={() => window.print()}>
                  <i className="bi bi-printer" /> In hóa đơn
                </button>
                <button className="btn-outline-maison" onClick={() => showToast('Đã tải xuống hóa đơn PDF!', 'bi-file-earmark-pdf')}>
                  <i className="bi bi-download" /> Tải PDF
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Cancel modal ── */}
      {showCancelModal && (
        <>
          <div onClick={() => setShowCancelModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,14,.5)', zIndex: 2000 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'var(--cream)', padding: '40px 44px', zIndex: 2001,
            width: 'min(480px, 90vw)', border: '1px solid var(--border)',
          }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 300, marginBottom: 12 }}>Hủy đơn hàng?</h3>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 28 }}>
              Bạn có chắc muốn hủy đơn hàng <strong>{order.id}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-outline-maison flex-grow-1" onClick={() => setShowCancelModal(false)}>Giữ đơn hàng</button>
              <button
                className="btn-maison"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={() => { setShowCancelModal(false); showToast('Đã hủy đơn hàng thành công', 'bi-x-circle'); navigate('profile'); }}
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </>
      )}

      <Footer navigate={navigate} />
    </div>
  );
}