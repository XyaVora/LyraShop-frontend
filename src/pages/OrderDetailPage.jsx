// src/pages/OrderDetailPage.jsx
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt } from '../data/products';
import { normalizeOrder } from '../data/orders';
import { extractErrorMessage, orderApi } from '../services/api';
import { Footer } from '../components/index.jsx';
import '../styles/order-detail.css';

export default function OrderDetailPage() {
  const { navigate, selectedOrder, user } = useApp();
  const { showToast, addToCart } = useCart();
  const [order, setOrder] = useState(selectedOrder || null);
  const [loading, setLoading] = useState(Boolean(selectedOrder?.id));
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [repurchasing, setRepurchasing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [trackingEvents, setTrackingEvents] = useState([]);

  useEffect(() => {
    if (!selectedOrder?.id) {
      setError('Không tìm thấy mã đơn hàng.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.allSettled([orderApi.get(selectedOrder.id), orderApi.trackingEvents(selectedOrder.id)])
      .then(([orderResult, trackingResult]) => {
        if (cancelled) return;
        if (orderResult.status === 'rejected') {
          setError('Không thể tải chi tiết đơn hàng.');
          return;
        }
        setOrder(normalizeOrder(orderResult.value.data, user));
        setTrackingEvents(trackingResult.status === 'fulfilled' ? (trackingResult.value.data || []) : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedOrder?.id, user]);

  const statusLabel = {
    pending: 'Chờ xác nhận',
    confirmed: 'Chờ lấy hàng',
    processing: 'Chờ lấy hàng',
    shipping: 'Đang vận chuyển',
    delivered: 'Đã giao thành công',
    cancelled: 'Đã hủy',
  };
  const isOnlinePaymentPending = order?.payment === 'VNPAY'
    && order?.paymentStatus !== 'PAID'
    && order?.status !== 'cancelled';

  const statusSteps = [
    { key: 'pending', title: isOnlinePaymentPending ? 'Chờ thanh toán' : 'Chờ xác nhận', icon: isOnlinePaymentPending ? 'bi-credit-card' : 'bi-clock-history' },
    { key: 'to_ship', title: 'Chờ lấy hàng', icon: 'bi-box-seam' },
    { key: 'shipping', title: 'Đang vận chuyển', icon: 'bi-truck' },
    { key: 'delivered', title: 'Giao thành công', icon: 'bi-house-check' },
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'pending': return 0;
      case 'confirmed':
      case 'processing': return 1;
      case 'shipping': return 2;
      case 'delivered': return 3;
      case 'cancelled': return -1;
      default: return 1;
    }
  };

  const activeStepIdx = getStepIndex(order?.status);
  const refreshTracking = async () => {
    if (!order?.id) return;
    try {
      const { data } = await orderApi.trackingEvents(order.id);
      setTrackingEvents(data || []);
    } catch {}
  };
  const eventForStep = (step) => trackingEvents.find(event => {
    const status = String(event.status || '').toUpperCase();
    if (step === 'pending') return status === 'ORDER_PLACED' || status === 'PENDING';
    if (step === 'to_ship') return status === 'PROCESSING' || status === 'CONFIRMED';
    return status === step.toUpperCase();
  });

  const handleCancel = async () => {
    if (!window.confirm('Quý khách có chắc chắn muốn hủy đơn hàng này?')) return;
    const reason = window.prompt('Vui lòng nhập lý do hủy đơn:', 'Tôi muốn thay đổi sản phẩm');
    if (!reason?.trim()) return;
    setCancelling(true);
    try {
      const { data } = await orderApi.cancel(order.id, reason.trim());
      setOrder(normalizeOrder(data, user));
      await refreshTracking();
      showToast('Đã hủy đơn hàng thành công', 'bi-check-circle');
    } catch (cancelError) {
      showToast(extractErrorMessage(cancelError, 'Không thể hủy đơn hàng'), 'bi-x-circle');
    } finally {
      setCancelling(false);
    }
  };

  const handleRetryPayment = async () => {
    setRetryingPayment(true);
    try {
      const { data } = await orderApi.retryPayment(order.id);
      if (!data?.paymentUrl) throw new Error('Không nhận được liên kết thanh toán');
      window.location.assign(data.paymentUrl);
    } catch (retryError) {
      showToast(extractErrorMessage(retryError, 'Không thể tạo lại giao dịch VNPay'), 'bi-x-circle');
      setRetryingPayment(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!window.confirm('Xác nhận bạn đã nhận đầy đủ đơn hàng?')) return;
    try {
      const { data } = await orderApi.confirmReceived(order.id);
      setOrder(normalizeOrder(data, user));
      await refreshTracking();
      showToast('Đã xác nhận nhận hàng thành công', 'bi-check-circle');
    } catch (confirmError) {
      showToast(extractErrorMessage(confirmError, 'Không thể xác nhận nhận hàng'), 'bi-x-circle');
    }
  };

  const handleRepurchase = async () => {
    if (!order?.items?.length) return;
    setRepurchasing(true);
    try {
      let count = 0;
      for (const item of order.items) {
        const ok = await addToCart(
          { id: item.productId || item.id, name: item.name },
          item.qty || 1,
          item.size,
          item.colorName,
          item.variantId
        );
        if (ok) count++;
      }
      if (count > 0) {
        showToast(`Đã thêm ${count} sản phẩm vào giỏ hàng`, 'bi-bag-check');
        navigate('cart');
      } else {
        showToast('Không thể thêm sản phẩm vào giỏ hàng', 'bi-exclamation-circle');
      }
    } catch {
      showToast('Có lỗi xảy ra khi mua lại sản phẩm', 'bi-x-circle');
    } finally {
      setRepurchasing(false);
    }
  };

  const handleCopyTracking = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopied(true);
    showToast('Đã sao chép mã vận đơn', 'bi-clipboard-check');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="not-found" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-secondary mb-3" role="status" style={{ width: '2.5rem', height: '2.5rem' }} />
        <div className="not-found-title">Đang tải thông tin đơn hàng...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="not-found" style={{ minHeight: '60vh' }}>
        <h2 className="not-found-title">{error || 'Không tìm thấy đơn hàng'}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 14 }}>
          Mã đơn hàng không hợp lệ hoặc đã bị thay đổi.
        </p>
        <button className="btn-hero-primary" onClick={() => navigate('profile', { profileTab: 'orders' })}>
          Quay lại danh sách đơn hàng
        </button>
      </div>
    );
  }

  const trackingCode = order.trackingCode;
  const isCancelled = order.status === 'cancelled';
  const loyaltyDiscount = Number(order.loyaltyDiscount || 0);
  const voucherAndPromotionDiscount = Math.max(0, Number(order.discount || 0) - loyaltyDiscount);

  return (
    <div className="order-detail-root">
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>
        
        {/* Top Header Card */}
        <div className="order-detail-header-card">
          <div>
            <div className="order-detail-id-label">Mã Đơn Hàng</div>
            <h1 className="order-detail-title">
              {order.displayId || `#LY-${String(order.id).slice(0, 8).toUpperCase()}`}
              <span className={`order-status-pill ${order.status || 'processing'}`}>
                {order.status === 'pending' && <i className="bi bi-clock-history" />}
                {order.status === 'confirmed' && <i className="bi bi-check2" />}
                {order.status === 'processing' && <i className="bi bi-box" />}
                {order.status === 'shipping' && <i className="bi bi-truck" />}
                {order.status === 'delivered' && <i className="bi bi-patch-check" />}
                {order.status === 'cancelled' && <i className="bi bi-x-circle" />}
                {isOnlinePaymentPending ? 'Chờ thanh toán online' : statusLabel[order.status] || 'Đang xử lý'}
              </span>
            </h1>
            <div className="order-detail-meta-text">
              Ngày tạo: <strong>{order.date || 'Gần đây'}</strong> · Phương thức: <strong>{order.payment}</strong>
            </div>
          </div>

          {/* Action buttons */}
          <div className="order-header-actions">
            <button className="btn-copy-tracking" onClick={handlePrint} title="In phiếu giao nhận & hóa đơn">
              <i className="bi bi-printer" /> In hóa đơn
            </button>
            <button
              className="btn-copy-tracking"
              onClick={handleRepurchase}
              disabled={repurchasing}
              title="Thêm lại tất cả sản phẩm của đơn này vào giỏ"
            >
              <i className="bi bi-arrow-repeat" /> {repurchasing ? 'Đang thêm...' : 'Mua lại toàn bộ'}
            </button>
            {order.status === 'pending' && (
              <button
                className="btn-copy-tracking"
                style={{ color: '#C53030', borderColor: '#F8B4B4' }}
                onClick={handleCancel}
                disabled={cancelling}
              >
                <i className="bi bi-x-circle" /> {cancelling ? 'Đang hủy...' : 'Hủy đơn'}
              </button>
            )}
            {order.status === 'shipping' && (
              <button className="btn-copy-tracking" onClick={handleConfirmReceived}>
                <i className="bi bi-check2-circle" /> Đã nhận hàng
              </button>
            )}
            {order.payment === 'VNPAY' && order.paymentStatus !== 'PAID' && !isCancelled && (
              <button className="btn-copy-tracking" onClick={handleRetryPayment} disabled={retryingPayment}>
                <i className="bi bi-credit-card" /> {retryingPayment ? 'Đang tạo...' : 'Thanh toán lại'}
              </button>
            )}
            <button
              className="btn-copy-tracking"
              style={{ background: 'var(--ink)', color: '#FFFFFF', borderColor: 'var(--ink)' }}
              onClick={() => navigate('profile', { profileTab: 'orders' })}
            >
              <i className="bi bi-arrow-left" /> Danh sách đơn
            </button>
          </div>
        </div>

        {/* Stepper Timeline */}
        <div className="order-stepper-card">
          <div className="order-stepper-title">
            {isCancelled ? 'Đơn hàng đã được hủy' : 'Tiến trình thực hiện & Vận chuyển'}
          </div>

          {!isCancelled ? (
            <div className="order-stepper-track">
              {/* Connector line */}
              <div className="stepper-connector-line">
                <div
                  className="stepper-connector-progress"
                  style={{ width: `${(Math.max(0, activeStepIdx) / (statusSteps.length - 1)) * 100}%` }}
                />
              </div>

              {statusSteps.map((st, idx) => {
                const isDone = idx < activeStepIdx;
                const isActive = idx === activeStepIdx;
                return (
                  <div
                    key={st.key}
                    className={`stepper-node ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
                  >
                    <div className="stepper-icon-circle">
                      <i className={`bi ${isDone ? 'bi-check' : st.icon}`} />
                    </div>
                    <div className="stepper-node-title">{st.title}</div>
                    <div className="stepper-node-time">
                      {eventForStep(st.key)?.occurredAt
                        ? new Date(eventForStep(st.key).occurredAt).toLocaleString('vi-VN')
                        : isDone ? 'Hoàn thành' : isActive ? 'Hiện tại' : 'Chờ xử lý'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 0', color: '#C53030' }}>
              <i className="bi bi-info-circle me-2" />
              Đơn hàng này đã kết thúc ở trạng thái hủy. Nếu cần hỗ trợ hoàn tiền hoặc tư vấn lại, vui lòng liên hệ bộ phận CSKH của LyraShop.
            </div>
          )}
        </div>

        {!isCancelled && trackingEvents.length > 0 && (
          <div className="order-logistics-card" style={{ display: 'block' }}>
            <h2 className="order-card-title"><span>Lịch sử vận chuyển</span></h2>
            {trackingEvents.map((event, index) => (
              <div key={event.id || index} style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 18, padding: '12px 0', borderBottom: index < trackingEvents.length - 1 ? '1px solid var(--border)' : 0 }}>
                <time style={{ fontSize: 12, color: 'var(--muted)' }}>{event.occurredAt ? new Date(event.occurredAt).toLocaleString('vi-VN') : ''}</time>
                <div>
                  <strong style={{ fontSize: 13 }}>{event.description || event.status}</strong>
                  {event.location && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{event.location}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Logistics & Tracking Card */}
        {!isCancelled && order.shippingCarrier && order.trackingCode && (
          <div className="order-logistics-card">
            <div className="logistics-partner-box">
              <div className="logistics-partner-icon">
                <i className="bi bi-box2-heart" />
              </div>
              <div>
                <div className="logistics-partner-name">
                  Đơn vị vận chuyển: {order.shippingCarrier}
                </div>
                <div className="logistics-partner-status" style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Mã vận đơn: <span className="logistics-tracking-code">{trackingCode}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="btn-copy-tracking"
                onClick={() => handleCopyTracking(trackingCode)}
              >
                <i className={`bi ${copied ? 'bi-check-lg text-success' : 'bi-clipboard'}`} />
                {copied ? 'Đã sao chép' : 'Sao chép mã'}
              </button>
              <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
                Dự kiến giao: <strong>{order.estimatedDeliveryAt ? new Date(order.estimatedDeliveryAt).toLocaleDateString('vi-VN') : 'Đang cập nhật'}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Order 2-Column Content Grid */}
        <div className="order-detail-grid">
          
          {/* Left Column: Products + Recipient Info */}
          <div>
            {/* Products list card */}
            <div className="order-items-card">
              <h2 className="order-card-title">
                <span>Kiện hàng ({order.items?.length || 0} sản phẩm)</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>
                  Đóng gói tiêu chuẩn Lyra Luxury Box
                </span>
              </h2>

              <div>
                {order.items?.map((item, idx) => (
                  <div key={item.key || idx} className="order-product-row">
                    <div className="order-product-info">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="order-product-thumb" />
                      ) : (
                        <div
                          className="order-product-thumb"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#F0EAE1',
                            color: 'var(--warm)',
                            fontSize: 22,
                          }}
                        >
                          <i className={`bi ${item.icon || 'bi-bag'}`} />
                        </div>
                      )}
                      <div>
                        <h3 className="order-product-name">{item.name}</h3>
                        <div className="order-product-meta">
                          Phân loại: <strong>{item.colorName || 'Màu Tiêu Chuẩn'}</strong> · Size: <strong>{item.size || 'Freesize'}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                          Số lượng: × {item.qty}
                        </div>
                      </div>
                    </div>

                    <div className="order-product-price">
                      {fmt(item.price * item.qty)}
                      {item.qty > 1 && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>
                          ({fmt(item.price)}/sp)
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery address & buyer note */}
            <div className="order-address-card">
              <h2 className="order-card-title">
                <span>Thông tin giao nhận</span>
                <i className="bi bi-geo-alt" style={{ fontSize: 16, color: 'var(--warm)' }} />
              </h2>
              <div className="address-recipient-name">
                {order.address?.name || 'Quý khách'}
              </div>
              <div className="address-recipient-phone">
                <i className="bi bi-telephone me-1" /> {order.address?.phone || 'Chưa cung cấp'}
              </div>
              <div className="address-recipient-full">
                <i className="bi bi-pin-map me-1" /> {order.address?.address || 'Địa chỉ tiêu chuẩn'}
              </div>

              {order.note && (
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--warm)', fontWeight: 600, marginBottom: 4 }}>
                    Ghi chú từ khách hàng
                  </div>
                  <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--muted)' }}>
                    "{order.note}"
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Payment & Order Summary */}
          <div>
            <div className="order-summary-card">
              <h2 className="order-card-title">
                <span>Tóm tắt thanh toán</span>
              </h2>

              <div className="order-summary-row">
                <span>Tạm tính sản phẩm</span>
                <span>{fmt(order.subtotal || order.total)}</span>
              </div>

              <div className="order-summary-row">
                <span>Phí vận chuyển</span>
                <span>{order.shipping ? fmt(order.shipping) : 'Miễn phí'}</span>
              </div>

              {voucherAndPromotionDiscount > 0 && (
                <div className="order-summary-row" style={{ color: 'var(--warm)' }}>
                  <span>Ưu đãi sản phẩm / voucher</span>
                  <span>−{fmt(voucherAndPromotionDiscount)}</span>
                </div>
              )}

              {loyaltyDiscount > 0 && (
                <div className="order-summary-row" style={{ color: 'var(--warm)' }}>
                  <span>Đã dùng {order.loyaltyCoinsUsed.toLocaleString('vi-VN')} Lyra Xu</span>
                  <span>−{fmt(loyaltyDiscount)}</span>
                </div>
              )}

              <div className="order-summary-row">
                <span>Hình thức thanh toán</span>
                <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{order.payment}</span>
              </div>

              <div className="order-summary-row">
                <span>Trạng thái thanh toán</span>
                <span style={{
                  color: order.paymentStatus === 'PAID' ? '#2E7D32' : '#B28900',
                  fontWeight: 600,
                  fontSize: 12
                }}>
                  {order.paymentStatus === 'PAID'
                    ? '● Đã thanh toán'
                    : order.payment === 'COD'
                      ? '○ Thanh toán khi nhận hàng'
                      : '○ Chưa thanh toán'}
                </span>
              </div>

              <div className="order-summary-total-row">
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Tổng thanh toán</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Đã bao gồm VAT & phụ phí</div>
                </div>
                <div className="order-summary-total-val">
                  {fmt(order.total)}
                </div>
              </div>

              {/* Service guarantee perks */}
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, fontSize: 12.5, color: 'var(--muted)' }}>
                  <i className="bi bi-shield-check text-success" style={{ fontSize: 16 }} />
                  <span>Sản phẩm chính hãng thiết kế bởi Lyra Atelier</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, fontSize: 12.5, color: 'var(--muted)' }}>
                  <i className="bi bi-arrow-repeat text-primary" style={{ fontSize: 16 }} />
                  <span>Hỗ trợ yêu cầu đổi trả trong vòng 30 ngày</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
                  <i className="bi bi-telephone text-secondary" style={{ fontSize: 16 }} />
                  <span>Thông tin liên hệ CSKH được cập nhật tại cuối trang.</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      <Footer navigate={navigate} />
    </div>
  );
}
