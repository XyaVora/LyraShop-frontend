// src/pages/OrderDetailPage.jsx
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt } from '../data/products';
import { normalizeOrder } from '../data/orders';
import { extractErrorMessage, orderApi } from '../services/api';
import { Footer } from '../components/index.jsx';

export default function OrderDetailPage() {
  const { navigate, selectedOrder, user } = useApp();
  const { showToast } = useCart();
  const [order, setOrder] = useState(selectedOrder || null);
  const [loading, setLoading] = useState(Boolean(selectedOrder?.id));
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!selectedOrder?.id) {
      setError('Không tìm thấy mã đơn hàng.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    orderApi.get(selectedOrder.id)
      .then(({ data }) => { if (!cancelled) setOrder(normalizeOrder(data, user)); })
      .catch(() => { if (!cancelled) setError('Không thể tải chi tiết đơn hàng.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedOrder?.id, user]);

  const statusLabel = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    delivered: 'Đã giao thành công',
    shipping: 'Đang vận chuyển',
    processing: 'Đang chuẩn bị hàng',
    cancelled: 'Đã hủy',
  };

  const handleCancel = async () => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
    setCancelling(true);
    try {
      const { data } = await orderApi.cancel(order.id);
      setOrder(normalizeOrder(data, user));
      showToast('Đã hủy đơn hàng', 'bi-check-circle');
    } catch (cancelError) {
      showToast(extractErrorMessage(cancelError, 'Không thể hủy đơn hàng'), 'bi-x-circle');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="not-found"><div className="not-found-title">Đang tải đơn hàng...</div></div>;
  if (error || !order) return (
    <div className="not-found">
      <h2 className="not-found-title">{error || 'Không tìm thấy đơn hàng'}</h2>
      <button className="btn-outline-lyra" onClick={() => navigate('profile')}>Quay lại hồ sơ</button>
    </div>
  );

  return (
    <div>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 20px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
              Chi tiết đơn hàng
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, margin: 0 }}>
              {order.displayId || order.id}
            </h1>
          </div>
          <div className="d-flex gap-2">
            {order.status === 'pending' && (
              <button
                className="btn-outline-lyra"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleCancel}
                disabled={cancelling}
              >
                <i className="bi bi-x-circle" /> {cancelling ? 'Đang hủy...' : 'Hủy đơn'}
              </button>
            )}
            <button className="btn-outline-lyra" onClick={() => navigate('profile')}>
              <i className="bi bi-arrow-left" /> Quay lại hồ sơ
            </button>
          </div>
        </div>

        <div className="row g-4">
          {/* Left: Products list */}
          <div className="col-lg-8">
            <div style={{ border: '1px solid var(--border)', background: '#fff', padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, marginBottom: 16 }}>Sản phẩm ({order.items?.length || 0})</h3>
              {order.items?.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex', gap: 16, alignItems: 'center',
                  padding: '12px 0', borderBottom: idx < order.items.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    width: 48, height: 56, background: (item.color || '#E4DAD0') + '88',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <i className={`bi ${item.icon || 'bi-bag'}`} style={{ fontSize: 18 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13.5 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Size: {item.size} · Số lượng: {item.qty}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15 }}>
                    {fmt(item.price * item.qty)}
                  </div>
                </div>
              ))}
            </div>

            {/* Address */}
            <div style={{ border: '1px solid var(--border)', background: '#fff', padding: 24 }}>
              <h3 style={{ fontSize: 16, marginBottom: 14 }}>Địa chỉ nhận hàng</h3>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                {order.address?.name} · {order.address?.phone}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {order.address?.address}
              </div>
            </div>
          </div>

          {/* Right: Payment summary */}
          <div className="col-lg-4">
            <div style={{ border: '1px solid var(--border)', background: '#fff', padding: 24 }}>
              <h3 style={{ fontSize: 16, marginBottom: 16 }}>Tóm tắt đơn hàng</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Trạng thái</span>
                <span className={`order-status-badge ${order.status || 'processing'}`}>
                  {statusLabel[order.status] || 'Đang xử lý'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Phương thức</span>
                <span>{order.payment}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Tạm tính</span>
                <span>{fmt(order.subtotal || order.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Phí giao hàng</span>
                <span>{order.shipping ? fmt(order.shipping) : 'Miễn phí'}</span>
              </div>
              {order.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--warm)' }}>
                  <span>Giảm giá</span>
                  <span>−{fmt(order.discount)}</span>
                </div>
              )}
              <hr style={{ borderColor: 'var(--border)', margin: '14px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 500 }}>
                <span>Tổng tiền</span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>{fmt(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer navigate={navigate} />
    </div>
  );
}