// src/pages/ProfilePage.jsx — Trang cá nhân chuẩn Sàn Thương Mại Điện Tử (Shopee / Lazada)
import { useState, useEffect, useMemo, useId, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt } from '../data/products';
import { normalizeOrder } from '../data/orders';
import { addressApi, extractErrorMessage, orderApi } from '../services/api';
import { isPhone, normPhone } from '../utils/validate';
import { Footer, Stars, ProductCard } from '../components/index.jsx';
import Modal from '../components/Modal.jsx';
import '../styles/profile.css';

/* ══════════════ Hằng số & Menu phân nhóm (Shopee Tree Navigation) ══════════════ */

const NAV_GROUPS = [
  {
    title: 'Tài khoản của tôi',
    items: [
      { id: 'dashboard', label: 'Tổng quan tài khoản', icon: 'bi-grid-1x2' },
      { id: 'profile', label: 'Hồ sơ cá nhân', icon: 'bi-person' },
      { id: 'address', label: 'Sổ địa chỉ', icon: 'bi-geo-alt' },
      { id: 'cards', label: 'Ngân hàng & Thẻ', icon: 'bi-credit-card' },
      { id: 'password', label: 'Đổi mật khẩu', icon: 'bi-shield-lock' },
    ],
  },
  {
    title: 'Quản lý đơn mua',
    items: [
      { id: 'orders', label: 'Đơn mua của tôi', icon: 'bi-bag-check', badgeKey: 'orders' },
    ],
  },
  {
    title: 'Ưu đãi & Tiện ích',
    items: [
      { id: 'vouchers', label: 'Kho Voucher', icon: 'bi-ticket-perforated', badge: 'Hot' },
      { id: 'membership', label: 'Hạng hội viên & Xu', icon: 'bi-award' },
    ],
  },
  {
    title: 'Bộ sưu tập',
    items: [
      { id: 'wishlist', label: 'Sản phẩm yêu thích', icon: 'bi-heart', badgeKey: 'wishlist' },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
const TAB_IDS = ALL_NAV_ITEMS.map((t) => t.id);

const SHOPEE_STATUS_TABS = [
  { id: 'all', label: 'Tất cả', icon: 'bi-grid', match: () => true },
  {
    id: 'unpaid',
    label: 'Chờ thanh toán',
    icon: 'bi-credit-card',
    match: (o) => (o.status === 'pending' || o.paymentStatus !== 'PAID') && o.status !== 'cancelled',
  },
  {
    id: 'to_ship',
    label: 'Vận chuyển',
    icon: 'bi-box-seam',
    match: (o) => (o.status === 'confirmed' || o.status === 'processing' || o.status === 'packing') && o.status !== 'cancelled',
  },
  {
    id: 'shipping',
    label: 'Chờ giao hàng',
    icon: 'bi-truck',
    match: (o) => o.status === 'shipping',
  },
  {
    id: 'delivered',
    label: 'Hoàn thành',
    icon: 'bi-check-circle',
    match: (o) => o.status === 'delivered',
  },
  {
    id: 'cancelled',
    label: 'Đã hủy',
    icon: 'bi-x-circle',
    match: (o) => o.status === 'cancelled',
  },
  {
    id: 'refund',
    label: 'Trả hàng / Hoàn tiền',
    icon: 'bi-arrow-counterclockwise',
    match: (o) => o.status === 'refund' || o.paymentStatus === 'REFUNDED',
  },
];

const CANCEL_REASONS = [
  'Tôi muốn cập nhật lại địa chỉ nhận hàng',
  'Tôi muốn thay đổi sản phẩm trong đơn (kích thước, màu sắc, số lượng)',
  'Tôi muốn thêm hoặc thay đổi mã giảm giá',
  'Tôi tìm thấy sản phẩm có giá tốt hơn ở nơi khác',
  'Thủ tục thanh toán / phương thức nhận hàng không phù hợp',
  'Tôi không còn nhu cầu mua sản phẩm này nữa',
  'Lý do khác',
];

/* ══════════════ Trang Chính: ProfilePage ══════════════ */

export default function ProfilePage() {
  const { navigate, user, logout, updateProfile, profileTab } = useApp();
  const {
    showToast,
    wishlist,
    wishlistLoading,
    wishlistError,
    refreshWishlist,
    toggleWishlist,
    addToCart,
  } = useCart();

  const [activeTab, setActiveTab] = useState(() => {
    return TAB_IDS.includes(profileTab) ? profileTab : 'dashboard';
  });
  const [orderInitialFilter, setOrderInitialFilter] = useState('all');

  // Đơn hàng load từ backend API
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const { data } = await orderApi.list();
      setOrders((data || []).map((order) => normalizeOrder(order, user)));
    } catch (err) {
      setOrdersError(extractErrorMessage(err, 'Không thể tải danh sách đơn hàng'));
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (profileTab && TAB_IDS.includes(profileTab)) {
      setActiveTab(profileTab);
    }
  }, [profileTab]);

  const goTab = (id) => {
    setActiveTab(id);
    navigate('profile', { tab: id });
  };

  const handleSelectStatusFromDashboard = (statusKey) => {
    setOrderInitialFilter(statusKey);
    setActiveTab('orders');
    navigate('profile', { tab: 'orders' });
  };

  const handleLogout = async () => {
    await logout();
    showToast('Đã đăng xuất thành công', 'bi-door-open');
    navigate('home');
  };

  const openOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const activeItem = ALL_NAV_ITEMS.find((t) => t.id === activeTab);

  return (
    <div className="profile-page">
      <header className="profile-head">
        <div className="wrap">
          <p className="eyebrow">Tài khoản LYRA</p>
          <h1 className="t-h1 profile-title">
            Không gian <em>của bạn</em>
          </h1>
          <p className="profile-head-sub">
            Theo dõi đơn mua tức thì, quản lý ưu đãi thành viên và bảo mật hồ sơ cá nhân — tất cả hội tụ tại một nơi.
          </p>
        </div>
      </header>

      <div className="profile-layout">
        {/* ── Sidebar ── */}
        <aside className="profile-sidebar" aria-label="Điều hướng tài khoản">
          <div className="profile-side-inner">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar" aria-hidden="true">
                {user?.avatar || (user?.email ? user.email[0].toUpperCase() : 'U')}
              </div>
              <div className="profile-avatar-info">
                <p className="profile-name">{user?.name || 'Khách hàng LYRA'}</p>
                <div className="profile-vip-mini-tag">
                  <i className="bi bi-gem" /> VIP Gold
                </div>
              </div>
            </div>

            <nav className="profile-nav" aria-label="Mục tài khoản">
              {NAV_GROUPS.map((group) => (
                <div key={group.title} className="profile-nav-group">
                  <div className="profile-nav-group-title">{group.title}</div>
                  <div className="profile-nav-group-items">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.id;
                      let badge = item.badge;
                      if (item.badgeKey === 'orders' && openOrders.length > 0) {
                        badge = openOrders.length;
                      } else if (item.badgeKey === 'wishlist' && wishlist.length > 0) {
                        badge = wishlist.length;
                      }
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`profile-nav-item${isActive ? ' active' : ''}`}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={() => goTab(item.id)}
                        >
                          <i className={`bi ${item.icon}`} aria-hidden="true" />
                          <span className="profile-nav-label">{item.label}</span>
                          {badge && <span className="profile-nav-badge">{badge}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="profile-side-foot">
              <button
                type="button"
                className="profile-nav-item profile-logout"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right" aria-hidden="true" />
                Đăng xuất
              </button>
            </div>
          </div>
        </aside>

        {/* ── Nội dung chính ── */}
        <main className="profile-content" aria-label={activeItem?.label}>
          {activeTab === 'dashboard' && (
            <DashboardTab
              user={user}
              orders={orders}
              ordersLoading={ordersLoading}
              wishlist={wishlist}
              navigate={navigate}
              onSelectStatus={handleSelectStatusFromDashboard}
              goTab={goTab}
              showToast={showToast}
              onRefreshOrders={loadOrders}
            />
          )}
          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              loading={ordersLoading}
              error={ordersError}
              openCount={openOrders.length}
              navigate={navigate}
              addToCart={addToCart}
              showToast={showToast}
              initialFilter={orderInitialFilter}
              onRefreshOrders={loadOrders}
            />
          )}
          {activeTab === 'vouchers' && <VouchersTab navigate={navigate} showToast={showToast} />}
          {activeTab === 'membership' && <MembershipTab user={user} showToast={showToast} />}
          {activeTab === 'cards' && <PaymentCardsTab showToast={showToast} />}
          {activeTab === 'wishlist' && (
            <WishlistTab
              wishlist={wishlist}
              loading={wishlistLoading}
              error={wishlistError}
              refreshWishlist={refreshWishlist}
              toggleWishlist={toggleWishlist}
              addToCart={addToCart}
              navigate={navigate}
            />
          )}
          {activeTab === 'address' && <AddressTab showToast={showToast} user={user} />}
          {activeTab === 'profile' && (
            <ProfileInfoTab user={user} updateProfile={updateProfile} showToast={showToast} />
          )}
          {activeTab === 'password' && <PasswordTab showToast={showToast} />}
        </main>
      </div>

      <Footer navigate={navigate} />
    </div>
  );
}

/* ══════════════ Tiêu đề mỗi tab ══════════════ */
function TabHead({ eyebrow, title, sub }) {
  return (
    <div className="profile-tab-head">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="profile-section-title">{title}</h2>
      {sub && <p className="profile-section-sub">{sub}</p>}
    </div>
  );
}

/* ══════════════ Component Thẻ Voucher ══════════════ */
function VoucherCardItem({ code, discount, title, minSpend, expiry, tag, onCopy, onUse }) {
  return (
    <div className="voucher-card-item">
      <div className="voucher-left-stub">
        <span className="voucher-stub-badge">{tag || 'MÃ GIẢM'}</span>
        <span className="voucher-stub-val">{discount}</span>
      </div>
      <div className="voucher-right-body">
        <h4 className="voucher-title">{title}</h4>
        <p className="voucher-spend">{minSpend}</p>
        <p className="voucher-exp">{expiry}</p>
        <div className="voucher-actions">
          <button type="button" className="btn-voucher-copy" onClick={onCopy}>
            <i className="bi bi-clipboard" /> Sao chép mã
          </button>
          <button type="button" className="btn-voucher-use" onClick={onUse}>
            Dùng ngay
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ Tab 1: Tổng quan tài khoản (DashboardTab) ══════════════ */
function DashboardTab({
  user,
  orders,
  ordersLoading,
  wishlist,
  navigate,
  onSelectStatus,
  goTab,
  showToast,
  onRefreshOrders,
}) {
  // Counts theo trạng thái
  const unpaidCount = orders.filter(
    (o) => (o.status === 'pending' || o.paymentStatus !== 'PAID') && o.status !== 'cancelled'
  ).length;

  const toShipCount = orders.filter(
    (o) =>
      (o.status === 'confirmed' || o.status === 'processing' || o.status === 'packing') &&
      o.status !== 'cancelled'
  ).length;

  const shippingCount = orders.filter((o) => o.status === 'shipping').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const refundCount = orders.filter(
    (o) => o.status === 'refund' || o.paymentStatus === 'REFUNDED'
  ).length;

  // Đơn hàng đang vận chuyển hoặc đơn gần nhất đang xử lý
  const activeOrder =
    orders.find((o) => o.status === 'shipping') ||
    orders.find((o) => o.status !== 'delivered' && o.status !== 'cancelled');

  const QUICK_STATUSES = [
    { key: 'unpaid', label: 'Chờ thanh toán', icon: 'bi-wallet2', count: unpaidCount },
    { key: 'to_ship', label: 'Chờ lấy hàng', icon: 'bi-box-seam', count: toShipCount },
    { key: 'shipping', label: 'Đang giao hàng', icon: 'bi-truck', count: shippingCount },
    { key: 'delivered', label: 'Đã giao / Đánh giá', icon: 'bi-star', count: deliveredCount },
    { key: 'refund', label: 'Trả hàng / Hoàn tiền', icon: 'bi-arrow-repeat', count: refundCount },
  ];

  return (
    <div className="profile-dashboard">
      {/* ── 1. Hero VIP Card ── */}
      <div className="profile-hero-card">
        <div className="profile-hero-top">
          <div className="profile-hero-user">
            <div className="profile-hero-avatar">
              {user?.avatar || (user?.email ? user.email[0].toUpperCase() : 'U')}
            </div>
            <div className="profile-hero-meta">
              <div className="profile-hero-name-row">
                <h2 className="profile-hero-name">{user?.name || 'Khách hàng LYRA'}</h2>
                <span className="profile-vip-tag">
                  <i className="bi bi-gem-fill" /> GOLD MEMBER
                </span>
              </div>
              <p className="profile-hero-email">{user?.email || 'lyra.member@example.com'}</p>
            </div>
          </div>
          <button type="button" className="profile-edit-btn" onClick={() => goTab('profile')}>
            <i className="bi bi-pencil" /> Chỉnh sửa hồ sơ
          </button>
        </div>

        {/* Tiến trình thăng hạng */}
        <div className="profile-tier-progress-card">
          <div className="tier-progress-head">
            <span className="tier-current">
              <i className="bi bi-shield-fill-check" /> Hạng Vàng (Gold)
            </span>
            <span className="tier-target">Hạng Kim Cương (Diamond): 5.000.000₫</span>
          </div>
          <div className="tier-progress-bar">
            <div className="tier-progress-fill" style={{ width: '68%' }} />
          </div>
          <p className="tier-progress-sub">
            Chi tiêu thêm <strong>1.550.000₫</strong> trước 31/12/2026 để nâng hạng Kim Cương với đặc quyền Freeship trọn đời.
          </p>
        </div>

        {/* Chỉ số nhanh */}
        <div className="profile-quick-stats-row">
          <div className="profile-quick-stat-box clickable" onClick={() => goTab('vouchers')}>
            <div className="stat-box-icon"><i className="bi bi-ticket-perforated" /></div>
            <div className="stat-box-info">
              <span className="stat-box-num">5</span>
              <span className="stat-box-title">Voucher của tôi</span>
            </div>
          </div>
          <div className="profile-quick-stat-box clickable" onClick={() => goTab('membership')}>
            <div className="stat-box-icon"><i className="bi bi-coin" /></div>
            <div className="stat-box-info">
              <span className="stat-box-num">24.500</span>
              <span className="stat-box-title">Lyra Xu tích lũy</span>
            </div>
          </div>
          <div className="profile-quick-stat-box clickable" onClick={() => goTab('cards')}>
            <div className="stat-box-icon"><i className="bi bi-credit-card-2-front" /></div>
            <div className="stat-box-info">
              <span className="stat-box-num">3</span>
              <span className="stat-box-title">Thẻ liên kết</span>
            </div>
          </div>
          <div className="profile-quick-stat-box clickable" onClick={() => goTab('wishlist')}>
            <div className="stat-box-icon"><i className="bi bi-heart" /></div>
            <div className="stat-box-info">
              <span className="stat-box-num">{wishlist.length}</span>
              <span className="stat-box-title">Yêu thích</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. DẢI TRẠNG THÁI ĐƠN HÀNG (SHOPEE QUICK HUB) ── */}
      <div className="order-quick-hub">
        <div className="order-quick-head">
          <div className="order-quick-title-wrap">
            <i className="bi bi-receipt-cutoff" />
            <h3>Trạng thái đơn mua</h3>
          </div>
          <button type="button" className="order-quick-all-link" onClick={() => onSelectStatus('all')}>
            Lịch sử đơn mua <i className="bi bi-chevron-right" />
          </button>
        </div>

        <div className="order-quick-grid">
          {QUICK_STATUSES.map((item) => (
            <button
              key={item.key}
              type="button"
              className="order-quick-item"
              onClick={() => onSelectStatus(item.key)}
            >
              <div className="order-quick-icon-wrap">
                <i className={`bi ${item.icon}`} />
                {item.count > 0 && (
                  <span className="order-quick-badge">{item.count}</span>
                )}
              </div>
              <span className="order-quick-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. BANNER THEO DÕI ĐƠN HÀNG ĐANG GIAO (NẾU CÓ) ── */}
      {activeOrder && (
        <div className="active-order-banner">
          <div className="active-order-left">
            <div className="active-order-icon">
              <i className="bi bi-truck" />
            </div>
            <div className="active-order-details">
              <div className="active-order-badge">Đang vận chuyển</div>
              <p className="active-order-title">
                Đơn hàng <strong>{activeOrder.displayId || activeOrder.id}</strong> — {activeOrder.items?.length || 1} sản phẩm
              </p>
              <p className="active-order-sub">
                Đơn vị: <strong>SPX Express</strong> — Kiện hàng đã rời trung tâm khai thác Hà Nội và đang trên đường phát giao.
              </p>
            </div>
          </div>
          <div className="active-order-actions">
            <button
              type="button"
              className="btn-order-track"
              onClick={() => onSelectStatus(activeOrder.status === 'shipping' ? 'shipping' : 'to_ship')}
            >
              Xem chi tiết
            </button>
            <button
              type="button"
              className="btn-order-received"
              onClick={() => {
                showToast(`Đã xác nhận nhận hàng cho đơn ${activeOrder.displayId || activeOrder.id}!`, 'bi-check2-circle');
                if (onRefreshOrders) onRefreshOrders();
              }}
            >
              Đã nhận hàng
            </button>
          </div>
        </div>
      )}

      {/* ── 4. KHO VOUCHER DÀNH RIÊNG ── */}
      <div className="dashboard-vouchers-section">
        <div className="dashboard-section-head">
          <h3>
            <i className="bi bi-ticket-perforated" /> Voucher dành riêng cho bạn
          </h3>
          <button type="button" className="see-all-link" onClick={() => goTab('vouchers')}>
            Xem tất cả (5) <i className="bi bi-chevron-right" />
          </button>
        </div>
        <div className="vouchers-grid">
          <VoucherCardItem
            code="FREESHIP30K"
            discount="30K"
            title="Miễn phí vận chuyển 30.000₫"
            minSpend="Đơn từ 200.000₫"
            expiry="HSD: 30/10/2026"
            tag="Freeship"
            onUse={() => navigate('shop')}
            onCopy={() => {
              navigator.clipboard?.writeText('FREESHIP30K');
              showToast('Đã sao chép mã FREESHIP30K', 'bi-clipboard-check');
            }}
          />
          <VoucherCardItem
            code="LYRA10"
            discount="10%"
            title="Giảm 10% tối đa 100.000₫"
            minSpend="Đơn từ 350.000₫"
            expiry="HSD: 25/10/2026"
            tag="Toàn sàn"
            onUse={() => navigate('shop')}
            onCopy={() => {
              navigator.clipboard?.writeText('LYRA10');
              showToast('Đã sao chép mã LYRA10', 'bi-clipboard-check');
            }}
          />
        </div>
      </div>

      {/* ── 5. BỘ SƯU TẬP YÊU THÍCH GỢI Ý ── */}
      {wishlist && wishlist.length > 0 && (
        <div className="dashboard-recent-section">
          <div className="dashboard-section-head">
            <h3>
              <i className="bi bi-heart" /> Sản phẩm trong danh sách yêu thích
            </h3>
            <button type="button" className="see-all-link" onClick={() => goTab('wishlist')}>
              Xem tất cả ({wishlist.length}) <i className="bi bi-chevron-right" />
            </button>
          </div>
          <div className="row g-3">
            {wishlist.slice(0, 4).map((p) => (
              <div key={p.id} className="col-sm-6 col-md-3">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════ Tab 2: Đơn mua (Shopee Order Management) ══════════════ */
function OrdersTab({
  orders,
  loading,
  error,
  openCount,
  navigate,
  addToCart,
  showToast,
  initialFilter = 'all',
  onRefreshOrders,
}) {
  const [filter, setFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [cancelingOrder, setCancelingOrder] = useState(null);
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [confirmDelivered, setConfirmDelivered] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [reviewingOrder, setReviewingOrder] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  const currentTab = SHOPEE_STATUS_TABS.find((t) => t.id === filter) || SHOPEE_STATUS_TABS[0];

  const counts = useMemo(
    () =>
      SHOPEE_STATUS_TABS.reduce((acc, t) => {
        acc[t.id] = orders.filter(t.match).length;
        return acc;
      }, {}),
    [orders]
  );

  const filteredList = useMemo(() => {
    return orders
      .filter(currentTab.match)
      .filter((o) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const matchId = String(o.id || o.displayId || '').toLowerCase().includes(q);
        const matchItem = (o.items || []).some((item) =>
          String(item.name || '').toLowerCase().includes(q)
        );
        return matchId || matchItem;
      });
  }, [orders, currentTab, searchQuery]);

  const handleConfirmCancel = async () => {
    if (!cancelingOrder) return;
    const target = cancelingOrder;
    setCancelingOrder(null);
    try {
      await orderApi.cancel(target.id);
      showToast(`Đã hủy đơn hàng ${target.displayId || target.id} thành công`, 'bi-check-circle');
      if (onRefreshOrders) onRefreshOrders();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Không thể hủy đơn hàng này'), 'bi-exclamation-circle');
    }
  };

  const handleConfirmReceived = () => {
    if (!confirmDelivered) return;
    const target = confirmDelivered;
    setConfirmDelivered(null);
    showToast(`Đã xác nhận nhận hàng cho đơn ${target.displayId || target.id}. Cảm ơn bạn!`, 'bi-check2-circle');
    setReviewingOrder(target);
    if (onRefreshOrders) onRefreshOrders();
  };

  const handleRepurchase = (order) => {
    if (!order?.items?.length) return;
    order.items.forEach((it) => {
      const p = {
        id: it.id || it.variantId,
        name: it.name,
        price: it.price,
        image: it.image || null,
        color: it.color || '#E4DAD0',
        icon: it.icon || 'bi-bag',
      };
      if (addToCart) addToCart(p);
    });
    showToast(`Đã thêm ${order.items.length} sản phẩm vào giỏ hàng`, 'bi-bag-check');
  };

  const handleSubmitReview = () => {
    showToast('Cảm ơn bạn đã gửi đánh giá cho sản phẩm!', 'bi-star-fill');
    setReviewingOrder(null);
    setReviewComment('');
    setReviewRating(5);
  };

  return (
    <>
      <TabHead
        eyebrow="Quản lý đơn hàng"
        title="Đơn mua của tôi"
        sub="Theo dõi hành trình kiện hàng, tra cứu mã vận đơn và quản lý lịch sử mua sắm."
      />

      {/* Thống kê đơn */}
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-value">{orders.length}</span>
          <span className="profile-stat-label">Tổng đơn hàng</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{openCount}</span>
          <span className="profile-stat-label">Đang thực hiện</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">
            {orders.filter((o) => o.status === 'delivered').length}
          </span>
          <span className="profile-stat-label">Đã hoàn thành</span>
        </div>
      </div>

      {/* Thanh Tabs chuẩn Shopee */}
      <div className="shopee-tabs-wrapper">
        <nav className="shopee-tabs-nav" aria-label="Lọc đơn hàng theo trạng thái Shopee">
          {SHOPEE_STATUS_TABS.map((t) => {
            const isActive = filter === t.id;
            const count = counts[t.id] || 0;
            return (
              <button
                key={t.id}
                type="button"
                className={`shopee-tab-btn${isActive ? ' active' : ''}`}
                onClick={() => setFilter(t.id)}
              >
                <i className={`bi ${t.icon}`} aria-hidden="true" />
                <span>{t.label}</span>
                {count > 0 && <span className="shopee-tab-badge">{count}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Ô tìm kiếm đơn hàng Shopee */}
      <div className="shopee-order-search-box">
        <i className="bi bi-search" />
        <input
          type="text"
          className="shopee-order-search-input"
          placeholder="Tìm kiếm theo Mã đơn hàng hoặc Tên sản phẩm..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="shopee-order-search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Xóa tìm kiếm"
          >
            <i className="bi bi-x-circle-fill" />
          </button>
        )}
      </div>

      {/* Danh sách đơn hàng */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
          <div className="spinner-border spinner-border-sm me-2" role="status" />
          Đang tải danh sách đơn hàng...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--danger)' }}>
          <p>{error}</p>
          <button className="btn-outline-lyra" onClick={onRefreshOrders}>Thử lại</button>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
          <i className="bi bi-bag" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.35 }} />
          <div style={{ fontSize: 16, marginBottom: 14 }}>Bạn chưa có đơn hàng nào tại LYRA</div>
          <button className="btn-lyra" onClick={() => navigate('shop')}>
            Bắt đầu mua sắm ngay
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
          <i className="bi bi-funnel" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.35 }} />
          <p>
            {searchQuery
              ? `Không tìm thấy đơn hàng nào khớp với từ khóa "${searchQuery}".`
              : `Hiện chưa có đơn hàng nào ở mục "${currentTab.label}".`}
          </p>
          <button
            className="btn-outline-lyra"
            onClick={() => {
              setFilter('all');
              setSearchQuery('');
            }}
          >
            Xem tất cả đơn hàng
          </button>
        </div>
      ) : (
        <div className="order-card-list">
          {filteredList.map((order) => (
            <div key={order.id} className="order-card-shopee">
              {/* Header Shop & Trạng thái */}
              <div className="order-shopee-head">
                <div className="order-shop-tag">
                  <span className="shop-mall-badge">LYRA OFFICIAL</span>
                  <span className="order-code">{order.displayId || `#${String(order.id).slice(0, 8).toUpperCase()}`}</span>
                  <span className="order-date-text">· {order.date}</span>
                </div>
                <div className="order-status-highlight">
                  <span className={`order-status-badge ${order.status || 'processing'}`}>
                    {order.status === 'delivered' ? 'Giao hàng thành công' :
                     order.status === 'shipping' ? 'Đang giao hàng' :
                     order.status === 'cancelled' ? 'Đã hủy' :
                     order.status === 'pending' ? 'Chờ thanh toán' : 'Đang xử lý'}
                  </span>
                </div>
              </div>

              {/* Danh sách sản phẩm trong đơn */}
              <div className="order-shopee-items">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="order-shopee-item-row">
                    <div
                      className="order-item-thumb"
                      style={{ background: (item.color || '#E4DAD0') + '88' }}
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <i className={`bi ${item.icon || 'bi-bag'}`} />
                      )}
                    </div>
                    <div className="order-item-desc">
                      <div className="order-item-title">{item.name}</div>
                      <div className="order-item-variant">
                        Phân loại: {item.colorName || 'Mặc định'} · Size: {item.size || 'F'}
                      </div>
                      <div className="order-item-qty">x{item.qty || 1}</div>
                    </div>
                    <div className="order-item-price-col">
                      <span className="order-item-price">{fmt(item.price)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Tổng tiền & Thao tác */}
              <div className="order-shopee-footer">
                <div className="order-total-block">
                  <span className="order-total-lbl">Thành tiền:</span>
                  <span className="order-total-num">{fmt(order.total)}</span>
                </div>
                <div className="order-shopee-btn-group">
                  {order.status === 'shipping' && (
                    <>
                      <button
                        type="button"
                        className="btn-shopee-outline"
                        onClick={() => setTrackingOrder(order)}
                      >
                        <i className="bi bi-truck" /> Tra cứu vận chuyển
                      </button>
                      <button
                        type="button"
                        className="btn-shopee-primary"
                        onClick={() => setConfirmDelivered(order)}
                      >
                        Đã nhận được hàng
                      </button>
                    </>
                  )}

                  {order.status === 'delivered' && (
                    <>
                      <button
                        type="button"
                        className="btn-shopee-primary"
                        onClick={() => setReviewingOrder(order)}
                      >
                        <i className="bi bi-star" /> Đánh giá
                      </button>
                      <button
                        type="button"
                        className="btn-shopee-outline"
                        onClick={() => handleRepurchase(order)}
                      >
                        <i className="bi bi-arrow-repeat" /> Mua lại
                      </button>
                    </>
                  )}

                  {order.status === 'cancelled' && (
                    <button
                      type="button"
                      className="btn-shopee-primary"
                      onClick={() => handleRepurchase(order)}
                    >
                      <i className="bi bi-arrow-repeat" /> Mua lại
                    </button>
                  )}

                  {(order.status === 'pending' || order.status === 'confirmed') && (
                    <button
                      type="button"
                      className="btn-shopee-outline text-danger"
                      onClick={() => {
                        setCancelingOrder(order);
                        setSelectedReason(CANCEL_REASONS[0]);
                      }}
                    >
                      Hủy đơn hàng
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-shopee-outline"
                    onClick={() => navigate('order-detail', { order })}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Hủy đơn hàng */}
      <Modal
        isOpen={Boolean(cancelingOrder)}
        onClose={() => setCancelingOrder(null)}
        title="Lý do hủy đơn hàng"
        width={500}
      >
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          Vui lòng chọn lý do bạn muốn hủy đơn hàng <strong>{cancelingOrder?.displayId}</strong>:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {CANCEL_REASONS.map((r, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="radio"
                name="cancelReason"
                checked={selectedReason === r}
                onChange={() => setSelectedReason(r)}
              />
              {r}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn-outline-lyra" onClick={() => setCancelingOrder(null)}>
            Giữ lại đơn
          </button>
          <button type="button" className="btn-lyra bg-danger text-white" onClick={handleConfirmCancel}>
            Xác nhận hủy
          </button>
        </div>
      </Modal>

      {/* Modal Xác nhận đã nhận hàng */}
      <Modal
        isOpen={Boolean(confirmDelivered)}
        onClose={() => setConfirmDelivered(null)}
        title="Xác nhận đã nhận hàng"
        width={460}
      >
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>
          Bạn xác nhận đã nhận đầy đủ các kiện hàng cho đơn <strong>{confirmDelivered?.displayId}</strong> và sản phẩm không có khiếu nại hư hỏng?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" className="btn-outline-lyra" onClick={() => setConfirmDelivered(null)}>
            Chưa nhận
          </button>
          <button type="button" className="btn-lyra" onClick={handleConfirmReceived}>
            Đã nhận hàng thành công
          </button>
        </div>
      </Modal>

      {/* Modal Tra cứu lộ trình vận chuyển */}
      <Modal
        isOpen={Boolean(trackingOrder)}
        onClose={() => setTrackingOrder(null)}
        title={`Hành trình vận đơn — ${trackingOrder?.displayId}`}
        width={520}
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <i className="bi bi-box-seam" style={{ fontSize: 24, color: 'var(--warm-deep)' }} />
            <div>
              <div style={{ fontWeight: 600 }}>Đơn vị vận chuyển: SPX Express</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Mã vận đơn: SPXVN99283746</div>
            </div>
          </div>
          <div className="tracking-timeline" style={{ borderLeft: '2px solid #e5e7eb', marginLeft: 10, paddingLeft: 16 }}>
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -22, top: 2, width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
              <div style={{ fontWeight: 600, fontSize: 13, color: '#10b981' }}>Bưu tá đang phát hàng</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Hôm nay 08:30 — Bưu tá Nguyễn Văn Hùng (0988***888) đang trên đường giao.</div>
            </div>
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -22, top: 2, width: 10, height: 10, borderRadius: '50%', background: '#9ca3af' }} />
              <div style={{ fontWeight: 500, fontSize: 13 }}>Đã đến kho phân loại Cầu Giấy SOC</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Hôm qua 21:15 — Kiện hàng đã được quét nhập kho.</div>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: -22, top: 2, width: 10, height: 10, borderRadius: '50%', background: '#9ca3af' }} />
              <div style={{ fontWeight: 500, fontSize: 13 }}>Người bán đã gửi kiện hàng</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>2 ngày trước 14:00 — Kiện hàng đã được bàn giao cho bưu cục LYRA HUB.</div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Đánh giá sản phẩm */}
      <Modal
        isOpen={Boolean(reviewingOrder)}
        onClose={() => setReviewingOrder(null)}
        title="Đánh giá sản phẩm"
        width={480}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Chất lượng sản phẩm:</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <i
                key={star}
                className={`bi bi-star${star <= reviewRating ? '-fill' : ''}`}
                style={{ fontSize: 24, color: '#f59e0b', cursor: 'pointer' }}
                onClick={() => setReviewRating(star)}
              />
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Chia sẻ trải nghiệm của bạn:</label>
          <textarea
            className="form-field-input"
            rows={4}
            placeholder="Sản phẩm rất đẹp, đóng gói cẩn thận, giao hàng nhanh..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn-outline-lyra" onClick={() => setReviewingOrder(null)}>
            Để sau
          </button>
          <button type="button" className="btn-lyra" onClick={handleSubmitReview}>
            Gửi đánh giá
          </button>
        </div>
      </Modal>
    </>
  );
}

/* ══════════════ Tab 3: Kho Voucher (VouchersTab) ══════════════ */
function VouchersTab({ navigate, showToast }) {
  const [filter, setFilter] = useState('all');

  const VOUCHERS = [
    {
      code: 'FREESHIP30K',
      discount: '30K',
      title: 'Miễn phí vận chuyển toàn quốc',
      minSpend: 'Đơn từ 200.000₫',
      expiry: 'HSD: 30/10/2026',
      tag: 'Freeship',
      type: 'shipping',
    },
    {
      code: 'LYRA10',
      discount: '10%',
      title: 'Giảm 10% cho mọi đơn hàng thời trang',
      minSpend: 'Đơn từ 350.000₫ • Tối đa 100K',
      expiry: 'HSD: 25/10/2026',
      tag: 'Toàn sàn',
      type: 'discount',
    },
    {
      code: 'VIP50K',
      discount: '50K',
      title: 'Đặc quyền thành viên Gold Member',
      minSpend: 'Đơn từ 499.000₫',
      expiry: 'HSD: 31/12/2026',
      tag: 'VIP Only',
      type: 'vip',
    },
    {
      code: 'WELCOME20',
      discount: '20K',
      title: 'Ưu đãi chào đón thành viên mới',
      minSpend: 'Đơn từ 150.000₫',
      expiry: 'HSD: 15/10/2026',
      tag: 'Thành viên mới',
      type: 'discount',
    },
    {
      code: 'LYRASPRING',
      discount: '15%',
      title: 'Giảm 15% cho BST Thời trang Thu Đông mới',
      minSpend: 'Đơn từ 500.000₫ • Tối đa 150K',
      expiry: 'HSD: 20/11/2026',
      tag: 'BST Mới',
      type: 'discount',
    },
  ];

  const filtered = filter === 'all' ? VOUCHERS : VOUCHERS.filter((v) => v.type === filter);

  return (
    <>
      <TabHead
        eyebrow="Ưu đãi & Khuyến mãi"
        title="Kho Voucher của tôi"
        sub="Lưu và áp dụng mã giảm giá, miễn phí vận chuyển độc quyền dành riêng cho tài khoản của bạn."
      />

      <div className="voucher-filters">
        <button
          type="button"
          className={`chip${filter === 'all' ? ' is-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tất cả ({VOUCHERS.length})
        </button>
        <button
          type="button"
          className={`chip${filter === 'shipping' ? ' is-active' : ''}`}
          onClick={() => setFilter('shipping')}
        >
          Miễn phí vận chuyển
        </button>
        <button
          type="button"
          className={`chip${filter === 'discount' ? ' is-active' : ''}`}
          onClick={() => setFilter('discount')}
        >
          Giảm giá đơn hàng
        </button>
        <button
          type="button"
          className={`chip${filter === 'vip' ? ' is-active' : ''}`}
          onClick={() => setFilter('vip')}
        >
          Đặc quyền VIP
        </button>
      </div>

      <div className="vouchers-grid" style={{ marginTop: '20px' }}>
        {filtered.map((v) => (
          <VoucherCardItem
            key={v.code}
            {...v}
            onUse={() => navigate('shop')}
            onCopy={() => {
              navigator.clipboard?.writeText(v.code);
              showToast(`Đã sao chép mã ${v.code}!`, 'bi-clipboard-check');
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ══════════════ Tab 4: Hạng hội viên & Lyra Xu (MembershipTab) ══════════════ */
function MembershipTab({ user, showToast }) {
  const [checkedIn, setCheckedIn] = useState(false);

  const handleCheckin = () => {
    if (checkedIn) return;
    setCheckedIn(true);
    showToast('Điểm danh thành công! +100 Lyra Xu vào ví.', 'bi-check-circle-fill');
  };

  return (
    <>
      <TabHead
        eyebrow="Khách hàng thân thiết"
        title="Hạng hội viên & Lyra Xu"
        sub="Tích lũy chi tiêu để thăng hạng nhận đặc quyền miễn phí vận chuyển trọn đời và tích lũy Lyra Xu."
      />

      {/* Gold Membership Card */}
      <div className="membership-gold-card">
        <div className="membership-gold-glow" />
        <div className="membership-card-top">
          <div className="membership-brand">LYRA PRIVILEGE</div>
          <div className="membership-chip">
            <i className="bi bi-cpu" />
          </div>
        </div>
        <div className="membership-card-mid">
          <span className="membership-tier-name">GOLD MEMBER</span>
          <p className="membership-card-number">LYRA • 8899 • 2026 • VIP</p>
        </div>
        <div className="membership-card-bot">
          <div>
            <span className="membership-lbl">CHỦ THẺ</span>
            <span className="membership-val">{user?.name || 'KHÁCH HÀNG LYRA'}</span>
          </div>
          <div>
            <span className="membership-lbl">TÍCH LŨY CHI TIÊU</span>
            <span className="membership-val">3.450.000₫</span>
          </div>
        </div>
      </div>

      {/* Lyra Xu Balance & Check-in */}
      <div className="lyra-coin-card">
        <div className="coin-left">
          <div className="coin-icon-circle">
            <i className="bi bi-coin" />
          </div>
          <div>
            <h3 className="coin-balance">{checkedIn ? '24.600' : '24.500'} <span>Xu</span></h3>
            <p className="coin-sub">Tương đương {(checkedIn ? 24600 : 24500).toLocaleString('vi-VN')}₫ có thể trừ trực tiếp khi thanh toán đơn hàng</p>
          </div>
        </div>
        <button
          type="button"
          className={`btn-checkin${checkedIn ? ' disabled' : ''}`}
          onClick={handleCheckin}
          disabled={checkedIn}
        >
          <i className={`bi ${checkedIn ? 'bi-check2' : 'bi-calendar-check'}`} />
          {checkedIn ? 'Đã điểm danh hôm nay' : 'Điểm danh nhận +100 Xu'}
        </button>
      </div>

      {/* Đặc quyền hạng Vàng */}
      <div className="membership-perks-section">
        <h3 className="perks-title">Đặc quyền dành riêng cho Hạng Vàng (Gold Member)</h3>
        <div className="membership-perks-grid">
          <div className="perk-box">
            <i className="bi bi-truck perk-icon" />
            <h4>Miễn phí vận chuyển</h4>
            <p>4 mã Freeship 30K được cộng tự động vào ví mỗi đầu tháng.</p>
          </div>
          <div className="perk-box">
            <i className="bi bi-cake2 perk-icon" />
            <h4>Quà tặng sinh nhật</h4>
            <p>Voucher giảm 200.000₫ áp dụng trong toàn bộ tháng sinh nhật của bạn.</p>
          </div>
          <div className="perk-box">
            <i className="bi bi-arrow-repeat perk-icon" />
            <h4>Đổi trả 30 ngày</h4>
            <p>Đặc quyền đổi trả miễn phí tận nhà trong vòng 30 ngày kể từ khi nhận hàng.</p>
          </div>
          <div className="perk-box">
            <i className="bi bi-lightning perk-icon" />
            <h4>Ưu tiên xử lý đơn</h4>
            <p>Đơn hàng được ưu tiên đóng gói và bàn giao sớm nhất cho bưu tá vận chuyển.</p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════ Tab 5: Ngân hàng & Thẻ liên kết (PaymentCardsTab) ══════════════ */
const INITIAL_CARDS = [
  { id: 'c1', type: 'visa', bank: 'Vietcombank Visa Platinum', number: '•••• •••• •••• 8899', holder: 'NGUYEN VAN A', exp: '12/28', isDefault: true },
  { id: 'c2', type: 'mastercard', bank: 'Techcombank Mastercard', number: '•••• •••• •••• 4512', holder: 'NGUYEN VAN A', exp: '08/27', isDefault: false },
  { id: 'c3', type: 'bank', bank: 'MB Bank (Tài khoản liên kết)', number: '0988776655', holder: 'NGUYEN VAN A', exp: 'Liên kết', isDefault: false },
];

function PaymentCardsTab({ showToast }) {
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCard, setNewCard] = useState({ bank: '', number: '', holder: '', exp: '' });

  const handleSetDefault = (id) => {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
    showToast('Đã đặt làm phương thức thanh toán mặc định!', 'bi-check-circle');
  };

  const handleDeleteCard = (id) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    showToast('Đã xóa phương thức thanh toán.', 'bi-trash');
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!newCard.number || !newCard.holder) {
      showToast('Vui lòng nhập đầy đủ thông tin thẻ!', 'bi-exclamation-circle');
      return;
    }
    const last4 = newCard.number.replace(/\s+/g, '').slice(-4) || '9999';
    const cardItem = {
      id: `c_${Date.now()}`,
      type: 'visa',
      bank: newCard.bank || 'Ngân hàng TMCP',
      number: `•••• •••• •••• ${last4}`,
      holder: newCard.holder.toUpperCase(),
      exp: newCard.exp || '12/29',
      isDefault: cards.length === 0,
    };
    setCards((prev) => [...prev, cardItem]);
    setShowAddModal(false);
    setNewCard({ bank: '', number: '', holder: '', exp: '' });
    showToast('Đã thêm thẻ thanh toán thành công!', 'bi-check2-circle');
  };

  return (
    <>
      <TabHead
        eyebrow="Thanh toán an toàn"
        title="Ngân hàng & Thẻ liên kết"
        sub="Quản lý thẻ thanh toán và tài khoản ngân hàng liên kết để thanh toán đơn mua nhanh chóng, bảo mật cao."
      />

      <div className="payment-cards-grid">
        {cards.map((c) => (
          <div key={c.id} className={`payment-card-box${c.isDefault ? ' is-default' : ''}`}>
            <div className="payment-card-header">
              <span className="payment-bank-name">
                <i className={`bi ${c.type === 'bank' ? 'bi-bank' : 'bi-credit-card-2-front'}`} /> {c.bank}
              </span>
              {c.isDefault && <span className="payment-default-badge">Mặc định</span>}
            </div>
            <div className="payment-card-num">{c.number}</div>
            <div className="payment-card-footer">
              <div className="payment-card-holder">{c.holder}</div>
              <div className="payment-card-exp">{c.exp}</div>
            </div>
            <div className="payment-card-actions">
              {!c.isDefault && (
                <button
                  type="button"
                  className="btn-card-action"
                  onClick={() => handleSetDefault(c.id)}
                >
                  Đặt mặc định
                </button>
              )}
              <button
                type="button"
                className="btn-card-action danger"
                onClick={() => handleDeleteCard(c.id)}
              >
                Xóa
              </button>
            </div>
          </div>
        ))}

        <div className="add-card-placeholder" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-plus-circle" style={{ fontSize: '28px' }} />
          <span>Thêm thẻ hoặc tài khoản mới</span>
        </div>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm phương thức thanh toán mới"
        width={480}
      >
        <form onSubmit={handleAddCard} className="profile-form" style={{ marginTop: '10px' }}>
          <div className="field-block">
            <label className="form-field-label">Tên ngân hàng / Loại thẻ</label>
            <input
              className="form-field-input"
              placeholder="VD: Vietcombank, Techcombank, MB..."
              value={newCard.bank}
              onChange={(e) => setNewCard({ ...newCard, bank: e.target.value })}
              required
            />
          </div>
          <div className="field-block">
            <label className="form-field-label">Số thẻ (16 số)</label>
            <input
              className="form-field-input"
              placeholder="4123 4567 8901 2345"
              maxLength={19}
              value={newCard.number}
              onChange={(e) => setNewCard({ ...newCard, number: e.target.value })}
              required
            />
          </div>
          <div className="form-row-2">
            <div className="field-block">
              <label className="form-field-label">Tên in trên thẻ</label>
              <input
                className="form-field-input"
                placeholder="NGUYEN VAN A"
                value={newCard.holder}
                onChange={(e) => setNewCard({ ...newCard, holder: e.target.value })}
                required
              />
            </div>
            <div className="field-block">
              <label className="form-field-label">Hết hạn (MM/YY)</label>
              <input
                className="form-field-input"
                placeholder="12/28"
                maxLength={5}
                value={newCard.exp}
                onChange={(e) => setNewCard({ ...newCard, exp: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="profile-form-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="btn-secondary-lyra" onClick={() => setShowAddModal(false)}>
              Hủy
            </button>
            <button type="submit" className="btn-lyra">
              Lưu thẻ
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ══════════════ Tab 6: Yêu thích (WishlistTab) ══════════════ */
function WishlistTab({ wishlist, loading, error, refreshWishlist, toggleWishlist, addToCart, navigate }) {
  return (
    <>
      <TabHead
        eyebrow="Đã lưu lại"
        title={`Sản phẩm yêu thích (${wishlist.length})`}
        sub={
          wishlist.length
            ? `${wishlist.length} thiết kế đang chờ bạn quyết định.`
            : 'Những thiết kế bạn lưu lại sẽ xuất hiện ở đây.'
        }
      />
      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Đang tải danh sách yêu thích...</p>
      ) : error ? (
        <div>
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn-outline-lyra" onClick={() => refreshWishlist()}>Thử lại</button>
        </div>
      ) : wishlist.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
          <i className="bi bi-heart" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.35 }} />
          <div>Chưa có sản phẩm nào trong danh sách yêu thích</div>
          <button className="btn-lyra mt-3" onClick={() => navigate('shop')}>
            Khám phá bộ sưu tập ngay
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {wishlist.map((p) => (
            <div key={p.id} className="col-sm-6">
              <div
                style={{
                  border: '1px solid var(--border)',
                  padding: 16,
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 72,
                    background: p.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                  onClick={() => navigate('detail', { product: p })}
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <i className={`bi ${p.icon || 'bi-bag'}`} style={{ fontSize: 22, opacity: 0.3 }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
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
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
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

/* ══════════════ Tab 7: Sổ địa chỉ (AddressTab) ══════════════ */
const EMPTY_ADDRESS = {
  recipientName: '',
  phone: '',
  addressLine: '',
  ward: '',
  district: '',
  city: '',
  isDefault: false,
};

function AddressTab({ showToast, user }) {
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

  useEffect(() => {
    loadAddresses();
  }, []);

  const change = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  const startCreate = () => {
    setEditingId('new');
    setForm({ ...EMPTY_ADDRESS, recipientName: user?.name || '' });
  };

  const startEdit = (address) => {
    setEditingId(address.id);
    setForm(address);
  };

  const saveAddress = async () => {
    if (
      !form.recipientName.trim() ||
      !form.phone.trim() ||
      !form.addressLine.trim() ||
      !form.district.trim() ||
      !form.city.trim()
    ) {
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
      ward: form.ward?.trim() || null,
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
      showToast('Đã lưu địa chỉ thành công', 'bi-check-circle');
    } catch (saveError) {
      showToast(extractErrorMessage(saveError, 'Không thể lưu địa chỉ'), 'bi-x-circle');
    } finally {
      setSaving(false);
    }
  };

  const removeAddress = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) return;
    try {
      await addressApi.remove(id);
      await loadAddresses();
      showToast('Đã xóa địa chỉ', 'bi-trash');
    } catch (removeError) {
      showToast(extractErrorMessage(removeError, 'Không thể xóa địa chỉ'), 'bi-x-circle');
    }
  };

  const makeDefault = async (id) => {
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
      <TabHead
        eyebrow="Giao nhận hàng"
        title="Sổ địa chỉ"
        sub="Quản lý các địa chỉ giao nhận để việc đặt hàng luôn nhanh chóng và thuận tiện."
      />
      <button className="btn-lyra mb-4" onClick={startCreate}>
        <i className="bi bi-plus" /> Thêm địa chỉ mới
      </button>

      {editingId && (
        <div className="address-form" style={{ border: '1px solid var(--border)', padding: 20, marginBottom: 24 }}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-field-label">Tên người nhận</label>
              <input className="form-field-input" value={form.recipientName} onChange={change('recipientName')} />
            </div>
            <div className="col-md-6">
              <label className="form-field-label">Số điện thoại</label>
              <input className="form-field-input" value={form.phone} onChange={change('phone')} />
            </div>
            <div className="col-12">
              <label className="form-field-label">Số nhà, tên đường</label>
              <input className="form-field-input" value={form.addressLine} onChange={change('addressLine')} />
            </div>
            <div className="col-md-4">
              <label className="form-field-label">Phường/Xã</label>
              <input className="form-field-input" value={form.ward} onChange={change('ward')} />
            </div>
            <div className="col-md-4">
              <label className="form-field-label">Quận/Huyện</label>
              <input className="form-field-input" value={form.district} onChange={change('district')} />
            </div>
            <div className="col-md-4">
              <label className="form-field-label">Tỉnh/Thành phố</label>
              <input className="form-field-input" value={form.city} onChange={change('city')} />
            </div>
          </div>
          <label className="d-flex align-items-center gap-2 mb-3 mt-3" style={{ fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => setForm((previous) => ({ ...previous, isDefault: event.target.checked }))}
            />
            Đặt làm địa chỉ mặc định
          </label>
          <div className="d-flex gap-2">
            <button className="btn-lyra" disabled={saving} onClick={saveAddress}>
              {saving ? 'Đang lưu...' : 'Lưu địa chỉ'}
            </button>
            <button className="btn-outline-lyra" onClick={() => setEditingId(null)}>
              Hủy
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p>Đang tải danh sách địa chỉ...</p>
      ) : error ? (
        <div>
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn-outline-lyra" onClick={loadAddresses}>Thử lại</button>
        </div>
      ) : addresses.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>Bạn chưa lưu địa chỉ nào.</p>
      ) : (
        <div className="address-grid">
          {addresses.map((address) => (
            <article key={address.id} className={`address-card${address.isDefault ? ' is-default' : ''}`}>
              <div className="address-card-top">
                <h3 className="address-name">
                  {address.recipientName} · {address.phone}
                </h3>
                {address.isDefault && <span className="address-badge">Mặc định</span>}
              </div>
              <p className="address-lines">
                {[address.addressLine, address.ward, address.district, address.city].filter(Boolean).join(', ')}
              </p>
              <div className="address-actions">
                <button className="btn-outline-lyra" onClick={() => startEdit(address)}>
                  Sửa
                </button>
                {!address.isDefault && (
                  <button className="btn-outline-lyra" onClick={() => makeDefault(address.id)}>
                    Đặt mặc định
                  </button>
                )}
                <button className="btn-outline-lyra" onClick={() => removeAddress(address.id)}>
                  Xóa
                </button>
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

/* ══════════════ Tab 8: Hồ sơ cá nhân (ProfileInfoTab) ══════════════ */
function ProfileInfoTab({ user, updateProfile, showToast }) {
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.phone) setPhone(user.phone);
  }, [user]);

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
      showToast('Đã lưu thông tin tài khoản thành công', 'bi-check-circle');
    } catch (error) {
      showToast(error.message || 'Không thể lưu thông tin', 'bi-x-circle');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TabHead
        eyebrow="Hồ sơ cá nhân"
        title="Thông tin tài khoản"
        sub="Quản lý thông tin hồ sơ của bạn để bảo mật tài khoản và nhận ưu đãi riêng."
      />
      <div style={{ maxWidth: 480 }}>
        <div className="field-block">
          <label className="form-field-label">Họ và tên</label>
          <input className="form-field-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field-block">
          <label className="form-field-label">Email tài khoản</label>
          <input className="form-field-input" value={email} disabled style={{ opacity: 0.6 }} />
        </div>
        <div className="field-block">
          <label className="form-field-label">Số điện thoại</label>
          <input className="form-field-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button className="btn-lyra mt-3" onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </>
  );
}

/* ══════════════ Tab 9: Đổi mật khẩu (PasswordTab) ══════════════ */
const PASSWORD_FIELDS = [
  { key: 'current', label: 'Mật khẩu hiện tại', autoComplete: 'current-password' },
  { key: 'next', label: 'Mật khẩu mới', autoComplete: 'new-password' },
  { key: 'confirm', label: 'Xác nhận mật khẩu mới', autoComplete: 'new-password' },
];

function PasswordTab({ showToast }) {
  const uid = useId();
  const [values, setValues] = useState({ current: '', next: '', confirm: '' });
  const [shown, setShown] = useState({ current: false, next: false, confirm: false });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => {
    const { value } = e.target;
    setValues((prev) => ({ ...prev, [k]: value }));
    setErrors((prev) => (prev[k] ? { ...prev, [k]: '' } : prev));
  };

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!values.current) next.current = 'Vui lòng nhập mật khẩu hiện tại.';
    if (!values.next) next.next = 'Vui lòng nhập mật khẩu mới.';
    else if (values.next.length < 6) next.next = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
    else if (values.next === values.current) next.next = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
    if (!values.confirm) next.confirm = 'Vui lòng xác nhận mật khẩu mới.';
    else if (values.confirm !== values.next) next.confirm = 'Hai mật khẩu chưa khớp nhau.';

    setErrors(next);
    if (Object.keys(next).length) {
      showToast('Chưa đổi được mật khẩu — vui lòng kiểm tra lại.', 'bi-exclamation-circle');
      return;
    }

    setValues({ current: '', next: '', confirm: '' });
    setShown({ current: false, next: false, confirm: false });
    showToast('Đã cập nhật mật khẩu mới thành công!', 'bi-shield-check');
  };

  return (
    <>
      <TabHead
        eyebrow="Bảo mật tài khoản"
        title="Đổi mật khẩu"
        sub="Sử dụng mật khẩu từ 6 ký tự trở lên bao gồm cả chữ và số để tăng cường tính an toàn."
      />
      <form className="profile-form" onSubmit={submit} noValidate style={{ maxWidth: 480 }}>
        {PASSWORD_FIELDS.map((f) => (
          <div className="field-block" key={f.key}>
            <label className="form-field-label" htmlFor={`${uid}-${f.key}`}>
              {f.label}
            </label>
            <div className="password-wrap">
              <input
                id={`${uid}-${f.key}`}
                className={`form-field-input${errors[f.key] ? ' invalid' : ''}`}
                type={shown[f.key] ? 'text' : 'password'}
                value={values[f.key]}
                onChange={set(f.key)}
                autoComplete={f.autoComplete}
                placeholder="••••••••"
                aria-invalid={errors[f.key] ? 'true' : undefined}
                aria-describedby={errors[f.key] ? `${uid}-${f.key}-err` : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={`${shown[f.key] ? 'Ẩn' : 'Hiện'} ${f.label.toLowerCase()}`}
                aria-pressed={shown[f.key]}
                onClick={() => setShown((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
              >
                <i className={`bi ${shown[f.key] ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
              </button>
            </div>

            {/* Thanh đo độ mạnh mật khẩu */}
            {f.key === 'next' && values.next && (
              <div className="password-strength-wrap" style={{ marginTop: '6px' }}>
                <div className="password-strength-bar">
                  <div
                    className={`password-strength-fill ${
                      values.next.length >= 8 &&
                      /[a-zA-Z]/.test(values.next) &&
                      /\d/.test(values.next) &&
                      /[^a-zA-Z0-9]/.test(values.next)
                        ? 'strong'
                        : values.next.length >= 6
                        ? 'medium'
                        : 'weak'
                    }`}
                  />
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--ink-3, #888)',
                    marginTop: '4px',
                    display: 'block',
                  }}
                >
                  {values.next.length >= 8 &&
                  /[a-zA-Z]/.test(values.next) &&
                  /\d/.test(values.next) &&
                  /[^a-zA-Z0-9]/.test(values.next)
                    ? 'Độ mạnh: Rất mạnh (Tuyệt vời)'
                    : values.next.length >= 6
                    ? 'Độ mạnh: Trung bình (Nên thêm chữ hoa, số & ký tự đặc biệt)'
                    : 'Độ mạnh: Yếu (Tối thiểu 6 ký tự)'}
                </span>
              </div>
            )}

            {errors[f.key] && (
              <span className="field-error" id={`${uid}-${f.key}-err`}>
                {errors[f.key]}
              </span>
            )}
          </div>
        ))}

        <div className="profile-form-actions">
          <button type="submit" className="btn-lyra">
            Cập nhật mật khẩu
          </button>
        </div>
      </form>
    </>
  );
}
