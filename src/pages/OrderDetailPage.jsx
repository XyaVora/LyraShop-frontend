// src/pages/OrderDetailPage.jsx — Chi tiết một đơn hàng LYRA.
// Nguồn dữ liệu duy nhất: getOrder(selectedOrder) từ CartContext (đơn đã đặt + đơn mock
// đều cùng shape). Trang KHÔNG tự tính lại tổng tiền — mọi con số lấy từ đơn.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { BRAND } from '../data/brand';
import { findProduct, fmt } from '../data/products';
import { buildUrl } from '../router.js';
import { EmptyState, Footer, Pic, Reveal, isModifiedClick } from '../components/index.jsx';
import Modal from '../components/Modal.jsx';
import '../styles/order.css';

/* ── Nhãn trạng thái ─────────────────────────────────────────────────── */
const STATUS = {
  processing: { label: 'Đang xử lý', icon: 'bi-hourglass-split', cls: 'processing' },
  confirmed: { label: 'Đã xác nhận', icon: 'bi-bag-check', cls: 'processing' },
  packing: { label: 'Đang đóng gói', icon: 'bi-box-seam', cls: 'processing' },
  shipping: { label: 'Đang giao hàng', icon: 'bi-truck', cls: 'shipping' },
  delivered: { label: 'Đã giao hàng', icon: 'bi-house-check', cls: 'delivered' },
  cancelled: { label: 'Đã huỷ', icon: 'bi-x-circle', cls: 'cancelled' },
};
const statusOf = (s) => STATUS[s] || STATUS.processing;

/* ── Nhãn phương thức thanh toán ─────────────────────────────────────── */
const PAYMENTS = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  banking: 'Chuyển khoản ngân hàng',
  momo: 'Ví MoMo',
  vnpay: 'VNPay QR',
  card: 'Thẻ tín dụng / ghi nợ',
};
const payLabel = (p) => PAYMENTS[String(p || '').toLowerCase()] || p || 'Chưa xác định';

const STEP_ICONS = ['bi-receipt', 'bi-bag-check', 'bi-box-seam', 'bi-truck', 'bi-house-check'];

const TABS = [
  { id: 'detail', label: 'Chi tiết đơn', icon: 'bi-list-ul' },
  { id: 'track', label: 'Theo dõi vận chuyển', icon: 'bi-truck' },
  { id: 'invoice', label: 'Hoá đơn', icon: 'bi-receipt-cutoff' },
];

/* ── Định dạng ngày (dữ liệu chỉ có createdAt dạng ISO) ──────────────── */
const pad2 = (n) => String(n).padStart(2, '0');

function fmtDate(iso) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '—';
  return `${fmtDate(iso)} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Địa chỉ đầy đủ: { fullName, phone, email, street, district, city }. */
const addressLine = (a) => [a?.street, a?.district, a?.city].filter(Boolean).join(', ');

export default function OrderDetailPage() {
  const { navigate, selectedOrder } = useApp();
  const { getOrder, loadOrder, cancelOrder, addToCart, openCart, showToast } = useCart();

  const [tab, setTab] = useState('detail');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewFor, setReviewFor] = useState(null);   // { productId, name }
  const [reviewed, setReviewed] = useState([]);       // productId đã đánh giá (state cục bộ)
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const tabRefs = useRef({});

  const [remoteOrder, setRemoteOrder] = useState(null);
  const order = getOrder(selectedOrder) || remoteOrder;

  useEffect(() => {
    if (getOrder(selectedOrder) || !selectedOrder || !loadOrder) return undefined;
    let cancelled = false;
    loadOrder(selectedOrder).then((mapped) => {
      if (!cancelled) setRemoteOrder(mapped);
    });
    return () => { cancelled = true; };
  }, [selectedOrder, getOrder, loadOrder]);

  /* Gộp item của đơn với catalog để lấy ảnh/màu/slug (đơn chỉ lưu productId). */
  const lines = useMemo(() => {
    if (!order) return [];
    return order.items.map((it, i) => {
      const p = findProduct(it.productId);
      return {
        key: `${it.productId}-${it.size}-${it.variantColor}-${i}`,
        productId: it.productId,
        variantId: it.variantId,
        name: it.name || p?.name || 'Sản phẩm LYRA',
        price: Number(it.price) || Number(p?.price) || 0,
        qty: Math.max(1, Number(it.qty) || 1),
        size: it.size,
        variantColor: it.variantColor,
        image: Array.isArray(p?.images) ? p.images[0] : undefined,
        tint: p?.color,
        icon: p?.icon,
        slug: p?.slug,
        brand: p?.brand || 'LYRA',
        product: p || null,
      };
    });
  }, [order]);

  const itemCount = useMemo(() => lines.reduce((a, l) => a + l.qty, 0), [lines]);

  /* Mã vận đơn ổn định, năm khớp ngày đặt (chỉ có khi đơn đã rời kho). */
  const tracking = useMemo(() => {
    if (!order) return '';
    const d = new Date(order.createdAt);
    const yy = Number.isNaN(d.getTime()) ? '26' : String(d.getFullYear()).slice(-2);
    return `VN${yy}${String(order.id).replace(/\D/g, '')}`;
  }, [order]);

  /* ── Điều hướng bằng phím ←/→ trong dải tab ───────────────────────── */
  const onTabKeyDown = useCallback((e) => {
    const idx = TABS.findIndex((t) => t.id === tab);
    let next = null;
    if (e.key === 'ArrowRight') next = TABS[(idx + 1) % TABS.length];
    else if (e.key === 'ArrowLeft') next = TABS[(idx - 1 + TABS.length) % TABS.length];
    else if (e.key === 'Home') next = TABS[0];
    else if (e.key === 'End') next = TABS[TABS.length - 1];
    if (!next) return;
    e.preventDefault();
    setTab(next.id);
    tabRefs.current[next.id]?.focus();
  }, [tab]);

  /* ── Hành động ────────────────────────────────────────────────────── */
  const goDetail = (e, slug) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    navigate('detail', { product: slug });
  };

  const reorder = () => {
    let added = 0;
    lines.forEach((l) => {
      const product = l.product || (l.variantId
        ? {
          id: l.productId || l.variantId,
          name: l.name,
          variants: [{ id: l.variantId, size: l.size, color: l.variantColor }],
        }
        : null);
      if (!product) return;
      addToCart(product, l.qty, l.size, l.variantColor, { openDrawer: false });
      added += 1;
    });
    if (!added) {
      showToast('Các sản phẩm trong đơn này hiện không còn kinh doanh.', 'bi-exclamation-circle');
      return;
    }
    openCart();
    showToast(`Đã thêm ${added} sản phẩm vào giỏ hàng`, 'bi-bag-check');
  };

  const confirmCancel = async () => {
    const ok = await cancelOrder(order.id);
    setCancelOpen(false);
    showToast(
      ok ? `Đã huỷ đơn hàng ${order.id}` : 'Không thể huỷ đơn hàng này',
      ok ? 'bi-x-circle' : 'bi-exclamation-circle',
    );
  };

  const openReview = (line) => {
    setReviewFor({ productId: line.productId, name: line.name });
    setRating(5);
    setReviewText('');
  };

  const submitReview = (e) => {
    e.preventDefault();
    if (!reviewFor) return;
    setReviewed((prev) => (prev.includes(reviewFor.productId) ? prev : [...prev, reviewFor.productId]));
    showToast(`Cảm ơn bạn đã đánh giá "${reviewFor.name}"`, 'bi-star-fill');
    setReviewFor(null);
  };

  /* ── Không tìm thấy đơn ───────────────────────────────────────────── */
  if (!order) {
    return (
      <div className="order-page">
        <div className="wrap section">
          <EmptyState
            icon="bi-receipt"
            title="Không tìm thấy đơn hàng"
            sub={
              selectedOrder
                ? `Đơn hàng ${selectedOrder} không tồn tại hoặc đã được xoá khỏi lịch sử mua hàng.`
                : 'Vui lòng chọn một đơn hàng từ mục Đơn hàng của tôi.'
            }
            action={{ label: 'Đơn hàng của tôi', onClick: () => navigate('profile', { tab: 'orders' }) }}
          >
            <button type="button" className="btn-outline-lyra" onClick={() => navigate('shop')}>
              Tiếp tục mua sắm
            </button>
          </EmptyState>
        </div>
        <Footer navigate={navigate} />
      </div>
    );
  }

  const st = statusOf(order.status);
  const cancelled = order.status === 'cancelled';
  const canCancel = order.status === 'processing';
  const paid = order.status === 'delivered'
    || (String(order.payment).toLowerCase() !== 'cod' && !cancelled && order.status !== 'processing');

  const steps = Array.isArray(order.timeline) ? order.timeline : [];
  const doneCount = steps.filter((s) => s.done).length;
  const progress = steps.length > 1
    ? Math.min(100, Math.max(0, ((doneCount - 1) / (steps.length - 1)) * 100))
    : 0;

  const facts = [
    { label: 'Ngày đặt', value: fmtDate(order.createdAt) },
    { label: 'Sản phẩm', value: `${itemCount} món` },
    { label: 'Thanh toán', value: payLabel(order.payment) },
    { label: 'Tổng cộng', value: fmt(order.total), strong: true },
  ];

  return (
    <div className="order-page">
      {/* ── Đầu trang ───────────────────────────────────────────────── */}
      <header className="order-head no-print">
        <div className="wrap">
          <nav className="order-crumbs" aria-label="Đường dẫn">
            <a
              href={buildUrl('home')}
              onClick={(e) => { if (!isModifiedClick(e)) { e.preventDefault(); navigate('home'); } }}
            >
              Trang chủ
            </a>
            <i className="bi bi-chevron-right" aria-hidden="true" />
            <a
              href={buildUrl('profile', { tab: 'orders' })}
              onClick={(e) => { if (!isModifiedClick(e)) { e.preventDefault(); navigate('profile', { tab: 'orders' }); } }}
            >
              Đơn hàng của tôi
            </a>
            <i className="bi bi-chevron-right" aria-hidden="true" />
            <span aria-current="page">{order.id}</span>
          </nav>

          <div className="order-head-top">
            <div className="order-head-main">
              <div className="eyebrow">Chi tiết đơn hàng</div>
              <h1 className="t-h1 order-title">
                Đơn hàng <em>{order.id}</em>
              </h1>
              <p className="order-head-meta">Đặt lúc {fmtDateTime(order.createdAt)}</p>
            </div>

            <div className={`order-status-badge ${st.cls} order-status-lg`}>
              <i className={`bi ${st.icon}`} aria-hidden="true" />
              {st.label}
            </div>
          </div>

          <dl className="order-facts">
            {facts.map((f) => (
              <div key={f.label} className="order-fact">
                <dt>{f.label}</dt>
                <dd className={f.strong ? 'is-strong' : undefined}>{f.value}</dd>
              </div>
            ))}
          </dl>

          <div className="order-actions">
            <button type="button" className="btn-lyra btn-sm" onClick={reorder}>
              <i className="bi bi-arrow-repeat" aria-hidden="true" /> Mua lại đơn này
            </button>
            <button type="button" className="btn-outline-lyra btn-sm" onClick={() => navigate('shop')}>
              <i className="bi bi-bag" aria-hidden="true" /> Tiếp tục mua sắm
            </button>
            {canCancel && (
              <button type="button" className="btn-outline-lyra btn-sm is-danger" onClick={() => setCancelOpen(true)}>
                <i className="bi bi-x-circle" aria-hidden="true" /> Huỷ đơn hàng
              </button>
            )}
          </div>

          {cancelled && (
            <p className="order-cancel-note" role="status">
              <i className="bi bi-info-circle" aria-hidden="true" />
              Đơn hàng đã được huỷ. Nếu bạn đã thanh toán trước, LYRA sẽ hoàn tiền trong 3–5 ngày làm việc.
            </p>
          )}
        </div>
      </header>

      {/* ── Dải tab ────────────────────────────────────────────────── */}
      <div className="order-tabs-bar no-print">
        <div className="wrap">
          <div className="order-tabs" role="tablist" aria-label="Nội dung đơn hàng" onKeyDown={onTabKeyDown}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`order-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`order-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                ref={(el) => { tabRefs.current[t.id] = el; }}
                className={`order-tab${tab === t.id ? ' is-active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <i className={`bi ${t.icon}`} aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Nội dung ───────────────────────────────────────────────── */}
      <div className="order-body">
        <div className="wrap">

          {/* TAB 1 — Chi tiết đơn */}
          {tab === 'detail' && (
            <section
              id="order-panel-detail"
              role="tabpanel"
              aria-labelledby="order-tab-detail"
              tabIndex={0}
              className="order-panel order-layout"
            >
              <Reveal className="order-col-main">
                <div className="eyebrow order-block-label">Sản phẩm đã đặt</div>
                <ul className="order-lines">
                  {lines.map((l) => {
                    const href = l.slug ? buildUrl('detail', { product: l.slug }) : null;
                    const done = reviewed.includes(l.productId);
                    return (
                      <li key={l.key} className="order-line">
                        {href ? (
                          <a className="order-line-thumb" href={href} onClick={(e) => goDetail(e, l.slug)} tabIndex={-1} aria-hidden="true">
                            <Pic as="span" src={l.image} alt="" tint={l.tint} icon={l.icon} ratio="3/4" />
                          </a>
                        ) : (
                          <span className="order-line-thumb" aria-hidden="true">
                            <Pic as="span" src={l.image} alt="" tint={l.tint} icon={l.icon} ratio="3/4" />
                          </span>
                        )}

                        <div className="order-line-info">
                          {href ? (
                            <a className="order-line-name" href={href} onClick={(e) => goDetail(e, l.slug)}>
                              {l.name}
                            </a>
                          ) : (
                            <span className="order-line-name">{l.name}</span>
                          )}
                          <p className="order-line-meta">
                            {l.brand} · Size {l.size} · Màu {l.variantColor}
                          </p>
                          <p className="order-line-meta">
                            {fmt(l.price)} × {l.qty}
                          </p>
                        </div>

                        <div className="order-line-side">
                          <div className="order-line-total">{fmt(l.price * l.qty)}</div>
                          {order.status === 'delivered' && (
                            <button
                              type="button"
                              className="order-review-btn"
                              onClick={() => openReview(l)}
                              disabled={done}
                            >
                              <i className={`bi ${done ? 'bi-star-fill' : 'bi-star'}`} aria-hidden="true" />
                              {done ? 'Đã đánh giá' : 'Đánh giá'}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {order.note && (
                  <div className="order-note-card">
                    <div className="eyebrow bare">Ghi chú của bạn</div>
                    <p>{order.note}</p>
                  </div>
                )}
              </Reveal>

              <Reveal className="order-col-side" delay={1}>
                <div className="order-card-box">
                  <div className="eyebrow bare">Tóm tắt thanh toán</div>
                  <div className="order-sum-row">
                    <span>Tạm tính</span>
                    <span>{fmt(order.subtotal)}</span>
                  </div>
                  <div className="order-sum-row">
                    <span>Phí vận chuyển</span>
                    <span>{order.shipping > 0 ? fmt(order.shipping) : 'Miễn phí'}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="order-sum-row">
                      <span>Giảm giá{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                      <span className="is-warm">−{fmt(order.discount)}</span>
                    </div>
                  )}
                  <div className="order-sum-total">
                    <span>Tổng cộng</span>
                    <strong>{fmt(order.total)}</strong>
                  </div>
                </div>

                <div className="order-card-box">
                  <div className="eyebrow bare">Địa chỉ giao hàng</div>
                  {order.address ? (
                    <address className="order-address">
                      <span className="order-address-name">{order.address.fullName}</span>
                      <span>{order.address.phone}</span>
                      {order.address.email && <span>{order.address.email}</span>}
                      <span>{addressLine(order.address)}</span>
                    </address>
                  ) : (
                    <p className="order-muted">Chưa có thông tin địa chỉ.</p>
                  )}
                </div>

                <div className="order-card-box">
                  <div className="eyebrow bare">Phương thức thanh toán</div>
                  <p className="order-pay">
                    <i className="bi bi-credit-card" aria-hidden="true" />
                    {payLabel(order.payment)}
                  </p>
                  <p className={`order-pay-state${paid ? ' is-paid' : ''}`}>
                    {paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                  </p>
                </div>
              </Reveal>
            </section>
          )}

          {/* TAB 2 — Theo dõi vận chuyển */}
          {tab === 'track' && (
            <section
              id="order-panel-track"
              role="tabpanel"
              aria-labelledby="order-tab-track"
              tabIndex={0}
              className="order-panel order-track"
            >
              <div className="eyebrow order-block-label">Hành trình đơn hàng</div>

              <div
                className="order-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-valuenow={doneCount}
                aria-label={`Hoàn thành ${doneCount} trên ${steps.length} bước`}
              >
                <span className="order-progress-track" aria-hidden="true" />
                <span className="order-progress-fill" style={{ '--p': progress / 100 }} aria-hidden="true" />
                <div className="order-progress-dots" aria-hidden="true">
                  {steps.map((s, i) => (
                    <span key={s.label || i} className={`order-progress-dot${s.done ? ' is-done' : ''}`}>
                      <i className={`bi ${STEP_ICONS[i] || 'bi-circle'}`} />
                    </span>
                  ))}
                </div>
              </div>

              <ol className="order-timeline">
                {steps.map((s, i) => {
                  const current = s.done && i === doneCount - 1 && !cancelled;
                  return (
                    <li key={s.label || i} className={`timeline-step${s.done ? ' done' : ''}`}>
                      <span className="timeline-dot" aria-hidden="true">
                        <i className={`bi ${s.done ? 'bi-check-lg' : STEP_ICONS[i] || 'bi-circle'}`} />
                      </span>
                      <div>
                        <div className="timeline-label">
                          {s.label}
                          {current && <span className="timeline-now">Hiện tại</span>}
                        </div>
                        {s.note && <div className="timeline-note">{s.note}</div>}
                        <div className="timeline-time">{s.date ? fmtDateTime(s.date) : 'Chưa cập nhật'}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <dl className="order-ship-facts">
                <div className="order-fact">
                  <dt>Đơn vị vận chuyển</dt>
                  <dd>LYRA Express</dd>
                </div>
                <div className="order-fact">
                  <dt>Mã vận đơn</dt>
                  <dd>{['shipping', 'delivered'].includes(order.status) ? tracking : 'Chưa phát sinh'}</dd>
                </div>
                <div className="order-fact">
                  <dt>Giao tới</dt>
                  <dd>{order.address ? `${order.address.district}, ${order.address.city}` : '—'}</dd>
                </div>
              </dl>

              <p className="order-muted order-track-help">
                Cần hỗ trợ về đơn hàng? Gọi {BRAND.hotline} hoặc gửi thư tới {BRAND.email}.
              </p>
            </section>
          )}

          {/* TAB 3 — Hoá đơn */}
          {tab === 'invoice' && (
            <section
              id="order-panel-invoice"
              role="tabpanel"
              aria-labelledby="order-tab-invoice"
              tabIndex={0}
              className="order-panel order-invoice-wrap"
            >
              <article className="invoice print-area">
                <header className="invoice-head">
                  <div>
                    <div className="invoice-brand">LYRA</div>
                    <p className="invoice-brand-sub">
                      {BRAND.address}
                      <br />
                      {BRAND.email} · {BRAND.hotline}
                    </p>
                  </div>
                  <div className="invoice-meta">
                    <div className="eyebrow bare">Hoá đơn điện tử</div>
                    <div className="invoice-id">{order.id}</div>
                    <div className="order-muted">{fmtDateTime(order.createdAt)}</div>
                  </div>
                </header>

                <div className="invoice-parties">
                  <div>
                    <div className="eyebrow bare">Khách hàng</div>
                    {order.address ? (
                      <address className="order-address">
                        <span className="order-address-name">{order.address.fullName}</span>
                        <span>{order.address.phone}</span>
                        <span>{addressLine(order.address)}</span>
                      </address>
                    ) : (
                      <p className="order-muted">—</p>
                    )}
                  </div>
                  <div>
                    <div className="eyebrow bare">Thanh toán</div>
                    <p className="order-muted invoice-pay">
                      {payLabel(order.payment)}
                      <br />
                      Ngày đặt: {fmtDate(order.createdAt)}
                      <br />
                      Trạng thái:{' '}
                      <span className={paid ? 'is-paid' : 'is-unpaid'}>
                        {paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="table-scroll">
                  <table className="invoice-table">
                    <thead>
                      <tr>
                        <th scope="col">Sản phẩm</th>
                        <th scope="col">Size</th>
                        <th scope="col">Màu</th>
                        <th scope="col" className="ta-r">SL</th>
                        <th scope="col" className="ta-r">Đơn giá</th>
                        <th scope="col" className="ta-r">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.key}>
                          <td>{l.name}</td>
                          <td>{l.size}</td>
                          <td>{l.variantColor}</td>
                          <td className="ta-r">{l.qty}</td>
                          <td className="ta-r">{fmt(l.price)}</td>
                          <td className="ta-r">{fmt(l.price * l.qty)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="invoice-totals">
                  <div className="order-sum-row">
                    <span>Tạm tính</span>
                    <span>{fmt(order.subtotal)}</span>
                  </div>
                  <div className="order-sum-row">
                    <span>Phí vận chuyển</span>
                    <span>{order.shipping > 0 ? fmt(order.shipping) : 'Miễn phí'}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="order-sum-row">
                      <span>Giảm giá{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                      <span className="is-warm">−{fmt(order.discount)}</span>
                    </div>
                  )}
                  <div className="order-sum-total">
                    <span>Tổng cộng</span>
                    <strong>{fmt(order.total)}</strong>
                  </div>
                </div>

                <p className="invoice-foot">
                  Cảm ơn bạn đã mua sắm tại LYRA. Hoá đơn điện tử này có giá trị tương đương hoá đơn giấy.
                  © 2026 LYRA.
                </p>
              </article>

              <div className="order-actions no-print">
                <button type="button" className="btn-outline-lyra btn-sm" onClick={() => window.print()}>
                  <i className="bi bi-printer" aria-hidden="true" /> In hoá đơn
                </button>
                <button
                  type="button"
                  className="btn-outline-lyra btn-sm"
                  onClick={() => showToast(
                    'Xuất PDF đang được phát triển — bạn có thể dùng "In hoá đơn" rồi chọn Lưu thành PDF.',
                    'bi-tools',
                  )}
                >
                  <i className="bi bi-filetype-pdf" aria-hidden="true" /> Tải PDF
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── Modal xác nhận huỷ đơn ─────────────────────────────────── */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Huỷ đơn hàng?"
        size="sm"
        footer={(
          <>
            <button type="button" className="btn-outline-lyra" onClick={() => setCancelOpen(false)}>
              Giữ đơn hàng
            </button>
            <button type="button" className="btn-lyra is-danger" onClick={confirmCancel}>
              Xác nhận huỷ
            </button>
          </>
        )}
      >
        <p>
          Bạn chắc chắn muốn huỷ đơn <strong>{order.id}</strong> trị giá {fmt(order.total)}? Hành động này
          không thể hoàn tác — bạn sẽ cần đặt lại nếu đổi ý.
        </p>
      </Modal>

      {/* ── Modal viết đánh giá ────────────────────────────────────── */}
      <Modal
        open={Boolean(reviewFor)}
        onClose={() => setReviewFor(null)}
        title="Viết đánh giá"
        size="sm"
      >
        <form className="order-review-form" onSubmit={submitReview}>
          <p className="order-review-product">{reviewFor?.name}</p>

          <div className="order-rating" role="radiogroup" aria-label="Chấm điểm sản phẩm">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} sao`}
                className={`order-rating-star${n <= rating ? ' is-on' : ''}`}
                onClick={() => setRating(n)}
              >
                <i className={`bi ${n <= rating ? 'bi-star-fill' : 'bi-star'}`} aria-hidden="true" />
              </button>
            ))}
            <span className="order-rating-value">{rating}/5</span>
          </div>

          <label className="order-review-label" htmlFor="order-review-text">
            Cảm nhận của bạn
          </label>
          <textarea
            id="order-review-text"
            className="order-review-text"
            rows={4}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Chất liệu, form dáng, dịch vụ giao hàng…"
          />

          <div className="order-review-actions">
            <button type="button" className="btn-outline-lyra" onClick={() => setReviewFor(null)}>
              Để sau
            </button>
            <button type="submit" className="btn-lyra">Gửi đánh giá</button>
          </div>
        </form>
      </Modal>

      <Footer navigate={navigate} />
    </div>
  );
}
