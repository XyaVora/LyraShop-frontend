// src/pages/ProfilePage.jsx — Tài khoản LYRA
// Tab đồng bộ URL (?tab=), đơn hàng lấy từ allOrders (đơn thật + mock),
// địa chỉ lưu localStorage `lyra_addresses`, hồ sơ ghi qua updateUser.
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt, findProduct } from '../data/products';
import { buildUrl } from '../router.js';
import {
  EmptyState,
  Footer,
  Pic,
  ProductCard,
  Reveal,
  isModifiedClick,
} from '../components/index.jsx';
import Modal from '../components/Modal.jsx';
import { isEmail, isPhone, normPhone } from '../utils/validate.js';
import '../styles/profile.css';

/* ══════════════ Hằng số & tiện ích ══════════════ */

const NAV_ITEMS = [
  { id: 'orders', label: 'Đơn hàng của tôi', icon: 'bi-bag' },
  { id: 'wishlist', label: 'Yêu thích', icon: 'bi-heart' },
  { id: 'address', label: 'Sổ địa chỉ', icon: 'bi-geo-alt' },
  { id: 'profile', label: 'Thông tin cá nhân', icon: 'bi-person' },
  { id: 'password', label: 'Đổi mật khẩu', icon: 'bi-lock' },
];
const TAB_IDS = NAV_ITEMS.map((t) => t.id);

// Nhãn + class badge cho mọi trạng thái đơn hàng của CartContext.
const STATUS = {
  processing: { label: 'Đang xử lý', cls: 'processing' },
  confirmed: { label: 'Đã xác nhận', cls: 'processing' },
  packing: { label: 'Đang đóng gói', cls: 'processing' },
  shipping: { label: 'Đang giao', cls: 'shipping' },
  delivered: { label: 'Đã giao', cls: 'delivered' },
  cancelled: { label: 'Đã huỷ', cls: 'cancelled' },
};
const statusOf = (s) => STATUS[s] || STATUS.processing;

// Đơn còn huỷ được khi chưa rời kho.
const CANCELLABLE = ['processing'];
const OPEN_STATUSES = ['processing', 'confirmed', 'packing'];

const ORDER_FILTERS = [
  { id: 'all', label: 'Tất cả', match: () => true },
  { id: 'open', label: 'Đang xử lý', match: (o) => OPEN_STATUSES.includes(o.status) },
  { id: 'shipping', label: 'Đang giao', match: (o) => o.status === 'shipping' },
  { id: 'delivered', label: 'Đã giao', match: (o) => o.status === 'delivered' },
  { id: 'cancelled', label: 'Đã huỷ', match: (o) => o.status === 'cancelled' },
];

const ADDR_KEY = 'lyra_addresses';
const EXTRA_KEY = 'lyra_profile_extra'; // sđt / ngày sinh (AppContext không lưu 2 trường này)

/** Mốc "hôm nay" (YYYY-MM-DD) theo giờ ĐỊA PHƯƠNG — chặn chọn ngày sinh
    ở tương lai. Không dùng toISOString() vì bản UTC lệch một ngày với GMT+7
    trong khoảng 00:00–07:00. Tính một lần khi nạp module, giống TODAY của
    trang "Mới về" và NOW của trang Quản trị. */
const TODAY_ISO = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* bỏ qua */ }
}

/** ISO → DD/MM/YYYY (dữ liệu chỉ có createdAt dạng ISO). */
function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
/** ISO → MM/YYYY (dùng cho "Thành viên từ"). */
function formatMonth(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const countItems = (order) => order.items.reduce((a, i) => a + (i.qty || 1), 0);

/* ══════════════ Trang ══════════════ */

export default function ProfilePage() {
  const { navigate, user, logout, profileTab, updateUser } = useApp();
  const { showToast, wishlist, allOrders, cancelOrder } = useCart();

  const activeTab = TAB_IDS.includes(profileTab) ? profileTab : 'orders';

  const goTab = (id) => {
    if (id === activeTab) return;
    navigate('profile', { tab: id, replace: true, keepScroll: true });
  };

  const handleLogout = () => {
    logout();
    showToast('Đã đăng xuất khỏi tài khoản LYRA', 'bi-door-open');
    navigate('home');
  };

  const openOrders = allOrders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const activeItem = NAV_ITEMS.find((t) => t.id === activeTab);

  return (
    <div className="profile-page">
      <header className="profile-head">
        <div className="wrap">
          <p className="eyebrow">Tài khoản LYRA</p>
          <h1 className="t-h1 profile-title">
            Không gian <em>của bạn</em>
          </h1>
          <p className="profile-head-sub">
            Theo dõi đơn hàng, lưu địa chỉ giao nhận và giữ hồ sơ của bạn luôn chính xác — tất cả ở một nơi.
          </p>
        </div>
      </header>

      <div className="profile-layout">
        {/* ── Sidebar ── */}
        <aside className="profile-sidebar" aria-label="Điều hướng tài khoản">
          <div className="profile-side-inner">
            <div className="profile-avatar" aria-hidden="true">{user?.avatar || 'L'}</div>
            <p className="profile-name">{user?.name || 'Khách hàng LYRA'}</p>
            <p className="profile-email">{user?.email}</p>
            {user?.joined && (
              <p className="profile-since">Thành viên từ {formatMonth(user.joined)}</p>
            )}

            <nav className="profile-nav" aria-label="Mục tài khoản">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`profile-nav-item${activeTab === item.id ? ' active' : ''}`}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                  onClick={() => goTab(item.id)}
                >
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  {item.label}
                </button>
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

        {/* ── Nội dung ── */}
        <section className="profile-content" aria-label={activeItem?.label}>
          {activeTab === 'orders' && (
            <OrdersTab
              orders={allOrders}
              openCount={openOrders.length}
              wishCount={wishlist.length}
              navigate={navigate}
              cancelOrder={cancelOrder}
              showToast={showToast}
            />
          )}
          {activeTab === 'wishlist' && <WishlistTab wishlist={wishlist} navigate={navigate} />}
          {activeTab === 'address' && <AddressTab user={user} showToast={showToast} />}
          {activeTab === 'profile' && (
            <ProfileInfoTab user={user} updateUser={updateUser} showToast={showToast} />
          )}
          {activeTab === 'password' && <PasswordTab showToast={showToast} />}
        </section>
      </div>

      <Footer />
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

/* ══════════════ Tab Đơn hàng ══════════════ */
function OrdersTab({ orders, openCount, wishCount, navigate, cancelOrder, showToast }) {
  const [filter, setFilter] = useState('all');
  const [pending, setPending] = useState(null); // đơn đang chờ xác nhận huỷ

  const current = ORDER_FILTERS.find((f) => f.id === filter) || ORDER_FILTERS[0];
  const list = useMemo(() => orders.filter(current.match), [orders, current]);

  const counts = useMemo(
    () => ORDER_FILTERS.reduce((acc, f) => {
      acc[f.id] = orders.filter(f.match).length;
      return acc;
    }, {}),
    [orders],
  );

  const confirmCancel = async () => {
    if (!pending) return;
    const target = pending;
    setPending(null);
    const ok = await cancelOrder(target.id);
    showToast(
      ok ? `Đã huỷ đơn hàng ${target.id}` : 'Không huỷ được đơn này. Chỉ đơn đang chờ xác nhận mới huỷ được.',
      ok ? 'bi-x-circle' : 'bi-exclamation-circle',
    );
  };

  return (
    <>
      <TabHead
        eyebrow="Lịch sử mua sắm"
        title="Đơn hàng của tôi"
        sub="Theo dõi hành trình từng đơn hàng LYRA của bạn."
      />

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
          <span className="profile-stat-value">{wishCount}</span>
          <span className="profile-stat-label">Sản phẩm yêu thích</span>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="order-filter-row">
          <div className="chip-row" role="group" aria-label="Lọc đơn hàng theo trạng thái">
            {ORDER_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`chip${filter === f.id ? ' active' : ''}`}
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label} ({counts[f.id] || 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon="bi-bag"
          title="Chưa có đơn hàng nào"
          sub="Khi bạn đặt hàng tại LYRA, mọi đơn sẽ được lưu lại tại đây."
          action={{ label: 'Bắt đầu mua sắm', onClick: () => navigate('shop') }}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon="bi-funnel"
          title="Không có đơn nào ở trạng thái này"
          sub="Chọn một bộ lọc khác để xem các đơn hàng còn lại."
          action={{ label: 'Xem tất cả đơn', onClick: () => setFilter('all') }}
        />
      ) : (
        <div className="order-card-list">
          {list.map((order, i) => (
            <OrderCard
              key={order.id}
              order={order}
              index={i}
              navigate={navigate}
              onAskCancel={() => setPending(order)}
            />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="Huỷ đơn hàng"
        size="sm"
        footer={(
          <>
            <button type="button" className="btn-outline-lyra" onClick={() => setPending(null)}>
              Giữ đơn hàng
            </button>
            <button type="button" className="btn-lyra btn-danger-solid" onClick={confirmCancel}>
              Xác nhận huỷ
            </button>
          </>
        )}
      >
        <p className="modal-text">
          Bạn chắc chắn muốn huỷ đơn <strong>{pending?.id}</strong> trị giá{' '}
          <strong>{pending ? fmt(pending.total) : ''}</strong>?
        </p>
        <p className="modal-text muted">
          Thao tác này không thể hoàn tác. Nếu cần thay đổi sản phẩm hoặc địa chỉ, bạn có thể gọi
          hotline 1900 1234 để LYRA hỗ trợ thay vì huỷ đơn.
        </p>
      </Modal>
    </>
  );
}

function OrderCard({ order, index, navigate, onAskCancel }) {
  const st = statusOf(order.status);
  const href = buildUrl('order-detail', { order: order.id });
  const canCancel = CANCELLABLE.includes(order.status);

  const openDetail = (e) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    navigate('order-detail', { order: order.id });
  };

  return (
    <Reveal as="article" className="order-card" delay={index % 6}>
      <div className="order-card-header">
        <div>
          <p className="order-id">{order.id}</p>
          <p className="order-date">
            Đặt ngày {formatDate(order.createdAt)} · {countItems(order)} sản phẩm
          </p>
        </div>
        <span className={`order-status-badge ${st.cls}`}>{st.label}</span>
      </div>

      <div className="order-card-body">
        <div className="order-items-preview">
          {order.items.slice(0, 4).map((item, i) => {
            const p = findProduct(item.productId);
            return (
              <Pic
                key={`${item.productId}-${item.size}-${item.variantColor}-${i}`}
                className="order-item-thumb"
                src={p?.images?.[0]}
                alt={item.name || p?.name || 'Sản phẩm'}
                tint={p?.color}
                icon={p?.icon || 'bi-bag'}
                ratio="48/58"
              />
            );
          })}
          {order.items.length > 4 && (
            <span className="order-more">+{order.items.length - 4}</span>
          )}
        </div>
        <p className="order-total-text">{fmt(order.total)}</p>
      </div>

      <div className="order-card-foot">
        <a
          className="btn-outline-lyra btn-sm"
          href={href}
          onClick={openDetail}
          aria-label={`Xem chi tiết đơn hàng ${order.id}`}
        >
          Xem chi tiết
        </a>
        {canCancel && (
          <button
            type="button"
            className="btn-outline-lyra btn-sm btn-danger-outline"
            onClick={onAskCancel}
            aria-label={`Huỷ đơn hàng ${order.id}`}
          >
            Huỷ đơn
          </button>
        )}
      </div>
    </Reveal>
  );
}

/* ══════════════ Tab Yêu thích ══════════════ */
function WishlistTab({ wishlist, navigate }) {
  return (
    <>
      <TabHead
        eyebrow="Đã lưu lại"
        title="Sản phẩm yêu thích"
        sub={
          wishlist.length
            ? `${wishlist.length} thiết kế đang chờ bạn quyết định.`
            : 'Những thiết kế bạn lưu lại sẽ xuất hiện ở đây.'
        }
      />
      {wishlist.length === 0 ? (
        <EmptyState
          icon="bi-heart"
          title="Danh sách yêu thích trống"
          sub="Chạm vào biểu tượng trái tim trên mỗi sản phẩm để lưu lại cho lần sau."
          action={{ label: 'Khám phá bộ sưu tập', onClick: () => navigate('shop') }}
        />
      ) : (
        <>
          <div className="products-grid cols-3">
            {wishlist.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
          <div className="profile-form-actions">
            <button type="button" className="btn-outline-lyra" onClick={() => navigate('wishlist')}>
              Mở trang yêu thích đầy đủ
            </button>
          </div>
        </>
      )}
    </>
  );
}

/* ══════════════ Tab Địa chỉ ══════════════ */
const EMPTY_ADDRESS = { fullName: '', phone: '', street: '', district: '', city: '' };

function AddressTab({ user, showToast }) {
  const [addresses, setAddresses] = useState(() => {
    const stored = readJson(ADDR_KEY, []);
    return Array.isArray(stored) ? stored.filter((a) => a && typeof a === 'object') : [];
  });
  const [editing, setEditing] = useState(null); // { mode: 'add' | 'edit', data }
  const [removing, setRemoving] = useState(null);

  useEffect(() => { writeJson(ADDR_KEY, addresses); }, [addresses]);

  const save = (form) => {
    setAddresses((prev) => {
      if (editing?.mode === 'edit') {
        return prev.map((a) => (a.id === editing.data.id ? { ...a, ...form } : a));
      }
      const nextId = prev.reduce((max, a) => Math.max(max, Number(a.id) || 0), 0) + 1;
      // Địa chỉ đầu tiên mặc định là địa chỉ giao hàng chính.
      return [...prev, { ...form, id: nextId, isDefault: prev.length === 0 }];
    });
    showToast(
      editing?.mode === 'edit' ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ mới',
      'bi-geo-alt',
    );
    setEditing(null);
  };

  const remove = () => {
    if (!removing) return;
    setAddresses((prev) => {
      const rest = prev.filter((a) => a.id !== removing.id);
      // Xoá địa chỉ mặc định → chuyển mặc định cho địa chỉ đầu tiên còn lại.
      if (removing.isDefault && rest.length) rest[0] = { ...rest[0], isDefault: true };
      return rest;
    });
    showToast(`Đã xoá địa chỉ của ${removing.fullName}`, 'bi-trash');
    setRemoving(null);
  };

  const setDefault = (id) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    showToast('Đã đặt làm địa chỉ mặc định', 'bi-check-circle');
  };

  return (
    <>
      <TabHead
        eyebrow="Giao nhận"
        title="Sổ địa chỉ"
        sub="Lưu sẵn địa chỉ để thanh toán nhanh hơn ở lần mua kế tiếp."
      />

      {addresses.length === 0 ? (
        <EmptyState
          icon="bi-geo-alt"
          title="Chưa có địa chỉ nào"
          sub="Thêm địa chỉ giao hàng để rút ngắn bước thanh toán."
          action={{
            label: 'Thêm địa chỉ đầu tiên',
            onClick: () => setEditing({
              mode: 'add',
              data: { ...EMPTY_ADDRESS, fullName: user?.name || '' },
            }),
          }}
        />
      ) : (
        <>
          <div className="address-grid">
            {addresses.map((a) => (
              <article key={a.id} className={`address-card${a.isDefault ? ' is-default' : ''}`}>
                <div className="address-card-top">
                  <p className="address-name">{a.fullName}</p>
                  {a.isDefault && <span className="address-badge">Mặc định</span>}
                </div>
                <p className="address-lines">
                  {a.phone}
                  <br />
                  {[a.street, a.district, a.city].filter(Boolean).join(', ')}
                </p>
                <div className="address-actions">
                  <button
                    type="button"
                    className="btn-outline-lyra btn-sm"
                    onClick={() => setEditing({ mode: 'edit', data: a })}
                    aria-label={`Chỉnh sửa địa chỉ của ${a.fullName}`}
                  >
                    Chỉnh sửa
                  </button>
                  {!a.isDefault && (
                    <button
                      type="button"
                      className="btn-outline-lyra btn-sm"
                      onClick={() => setDefault(a.id)}
                      aria-label={`Đặt địa chỉ của ${a.fullName} làm mặc định`}
                    >
                      Đặt mặc định
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-outline-lyra btn-sm btn-danger-outline"
                    onClick={() => setRemoving(a)}
                    aria-label={`Xoá địa chỉ của ${a.fullName}`}
                  >
                    Xoá
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="profile-form-actions">
            <button
              type="button"
              className="btn-outline-lyra"
              onClick={() => setEditing({
                mode: 'add',
                data: { ...EMPTY_ADDRESS, fullName: user?.name || '' },
              })}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" /> Thêm địa chỉ mới
            </button>
          </div>
        </>
      )}

      <AddressModal
        state={editing}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <Modal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Xoá địa chỉ"
        size="sm"
        footer={(
          <>
            <button type="button" className="btn-outline-lyra" onClick={() => setRemoving(null)}>
              Giữ lại
            </button>
            <button type="button" className="btn-lyra btn-danger-solid" onClick={remove}>
              Xoá địa chỉ
            </button>
          </>
        )}
      >
        <p className="modal-text">
          Xoá địa chỉ của <strong>{removing?.fullName}</strong>? Bạn có thể thêm lại bất cứ lúc nào.
        </p>
      </Modal>
    </>
  );
}

function AddressModal({ state, onClose, onSave }) {
  const uid = useId();
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [errors, setErrors] = useState({});

  // Nạp lại dữ liệu mỗi khi mở modal cho một địa chỉ khác.
  useEffect(() => {
    if (state) {
      setForm({ ...EMPTY_ADDRESS, ...state.data });
      setErrors({});
    }
  }, [state]);

  const set = (k) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [k]: value }));
    setErrors((prev) => (prev[k] ? { ...prev, [k]: '' } : prev));
  };

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.fullName.trim()) next.fullName = 'Vui lòng nhập họ và tên người nhận.';
    if (!form.phone.trim()) next.phone = 'Vui lòng nhập số điện thoại.';
    else if (!isPhone(form.phone)) {
      next.phone = 'Số điện thoại chưa đúng định dạng (ví dụ 0912345678).';
    }
    if (!form.street.trim()) next.street = 'Vui lòng nhập số nhà, tên đường.';
    if (!form.district.trim()) next.district = 'Vui lòng nhập quận / huyện.';
    if (!form.city.trim()) next.city = 'Vui lòng nhập tỉnh / thành phố.';
    setErrors(next);
    if (Object.keys(next).length) return;

    onSave({
      fullName: form.fullName.trim(),
      phone: normPhone(form.phone),
      street: form.street.trim(),
      district: form.district.trim(),
      city: form.city.trim(),
    });
  };

  const field = (key, label, props = {}) => (
    <div className="field-block">
      <label className="form-field-label" htmlFor={`${uid}-${key}`}>{label}</label>
      <input
        id={`${uid}-${key}`}
        className={`form-field-input${errors[key] ? ' invalid' : ''}`}
        value={form[key]}
        onChange={set(key)}
        aria-invalid={errors[key] ? 'true' : undefined}
        aria-describedby={errors[key] ? `${uid}-${key}-err` : undefined}
        {...props}
      />
      {errors[key] && (
        <span className="field-error" id={`${uid}-${key}-err`}>{errors[key]}</span>
      )}
    </div>
  );

  return (
    <Modal
      open={Boolean(state)}
      onClose={onClose}
      title={state?.mode === 'edit' ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
      size="sm"
      footer={(
        <>
          <button type="button" className="btn-outline-lyra" onClick={onClose}>Huỷ</button>
          <button type="submit" form={`${uid}-form`} className="btn-lyra">Lưu địa chỉ</button>
        </>
      )}
    >
      <form id={`${uid}-form`} className="address-form" onSubmit={submit} noValidate>
        {field('fullName', 'Họ và tên người nhận', { autoComplete: 'name' })}
        {field('phone', 'Số điện thoại', { type: 'tel', autoComplete: 'tel', inputMode: 'tel' })}
        {field('street', 'Số nhà, tên đường', { autoComplete: 'street-address' })}
        <div className="form-row-2">
          {field('district', 'Quận / Huyện', { autoComplete: 'address-level2' })}
          {field('city', 'Tỉnh / Thành phố', { autoComplete: 'address-level1' })}
        </div>
      </form>
    </Modal>
  );
}

/* ══════════════ Tab Thông tin cá nhân ══════════════ */
function ProfileInfoTab({ user, updateUser, showToast }) {
  const uid = useId();
  const extraKeyId = user?.id || user?.email || 'guest';

  // AppContext chỉ lưu name/email/avatar/role/joined → sđt & ngày sinh giữ riêng.
  const loadExtra = useCallback(() => {
    const all = readJson(EXTRA_KEY, {});
    const mine = all && typeof all === 'object' ? all[extraKeyId] : null;
    return { phone: mine?.phone || '', birthday: mine?.birthday || '' };
  }, [extraKeyId]);

  const [form, setForm] = useState(() => ({
    name: user?.name || '',
    email: user?.email || '',
    ...loadExtra(),
  }));
  const [errors, setErrors] = useState({});

  // Đổi tài khoản (hoặc hồ sơ được cập nhật nơi khác) → nạp lại giá trị.
  useEffect(() => {
    setForm({ name: user?.name || '', email: user?.email || '', ...loadExtra() });
    setErrors({});
  }, [user?.id, user?.name, user?.email, loadExtra]);

  const set = (k) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [k]: value }));
    setErrors((prev) => (prev[k] ? { ...prev, [k]: '' } : prev));
  };

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Vui lòng nhập họ và tên.';
    if (!form.email.trim()) next.email = 'Vui lòng nhập email.';
    else if (!isEmail(form.email)) next.email = 'Địa chỉ email chưa hợp lệ.';
    // Số điện thoại không bắt buộc; nếu có thì chuẩn hoá giống trang Thanh toán.
    const phone = normPhone(form.phone);
    if (form.phone.trim() && !isPhone(form.phone)) {
      next.phone = 'Số điện thoại chưa đúng định dạng (ví dụ 0912345678).';
    }
    if (form.birthday && form.birthday > TODAY_ISO) {
      next.birthday = 'Ngày sinh không thể ở tương lai.';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      showToast('Vui lòng kiểm tra lại thông tin đã nhập.', 'bi-exclamation-circle');
      return;
    }

    updateUser({ name: form.name.trim(), email: form.email.trim() });

    const all = readJson(EXTRA_KEY, {});
    writeJson(EXTRA_KEY, {
      ...(all && typeof all === 'object' ? all : {}),
      [extraKeyId]: { phone, birthday: form.birthday },
    });

    showToast('Đã lưu thông tin tài khoản', 'bi-check-circle');
  };

  return (
    <>
      <TabHead
        eyebrow="Hồ sơ"
        title="Thông tin cá nhân"
        sub="Thông tin này được dùng để liên hệ và điền sẵn khi bạn thanh toán."
      />
      <form className="profile-form" onSubmit={submit} noValidate>
        <div className="field-block">
          <label className="form-field-label" htmlFor={`${uid}-name`}>Họ và tên</label>
          <input
            id={`${uid}-name`}
            className={`form-field-input${errors.name ? ' invalid' : ''}`}
            value={form.name}
            onChange={set('name')}
            autoComplete="name"
            aria-invalid={errors.name ? 'true' : undefined}
            aria-describedby={errors.name ? `${uid}-name-err` : undefined}
          />
          {errors.name && <span className="field-error" id={`${uid}-name-err`}>{errors.name}</span>}
        </div>

        <div className="field-block">
          <label className="form-field-label" htmlFor={`${uid}-email`}>Email</label>
          <input
            id={`${uid}-email`}
            className={`form-field-input${errors.email ? ' invalid' : ''}`}
            type="email"
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? `${uid}-email-err` : undefined}
          />
          {errors.email && <span className="field-error" id={`${uid}-email-err`}>{errors.email}</span>}
        </div>

        <div className="form-row-2">
          <div className="field-block">
            <label className="form-field-label" htmlFor={`${uid}-phone`}>Số điện thoại</label>
            <input
              id={`${uid}-phone`}
              className={`form-field-input${errors.phone ? ' invalid' : ''}`}
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={set('phone')}
              autoComplete="tel"
              placeholder="0912345678"
              aria-invalid={errors.phone ? 'true' : undefined}
              aria-describedby={errors.phone ? `${uid}-phone-err` : undefined}
            />
            {errors.phone && <span className="field-error" id={`${uid}-phone-err`}>{errors.phone}</span>}
          </div>
          <div className="field-block">
            <label className="form-field-label" htmlFor={`${uid}-birthday`}>Ngày sinh</label>
            <input
              id={`${uid}-birthday`}
              className={`form-field-input${errors.birthday ? ' invalid' : ''}`}
              type="date"
              value={form.birthday}
              onChange={set('birthday')}
              max={TODAY_ISO}
              autoComplete="bday"
              aria-invalid={errors.birthday ? 'true' : undefined}
              aria-describedby={errors.birthday ? `${uid}-birthday-err` : undefined}
            />
            {errors.birthday && (
              <span className="field-error" id={`${uid}-birthday-err`}>{errors.birthday}</span>
            )}
          </div>
        </div>

        <div className="profile-form-actions">
          <button type="submit" className="btn-lyra">Lưu thay đổi</button>
        </div>
        <p className="profile-form-note">
          Số điện thoại và ngày sinh được lưu trên trình duyệt này (bản demo chưa có máy chủ).
        </p>
      </form>
    </>
  );
}

/* ══════════════ Tab Đổi mật khẩu ══════════════ */
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
    showToast('Đã ghi nhận mật khẩu mới (bản demo chưa kết nối máy chủ).', 'bi-shield-check');
  };

  return (
    <>
      <TabHead
        eyebrow="Bảo mật"
        title="Đổi mật khẩu"
        sub="Dùng mật khẩu từ 6 ký tự trở lên và không trùng với mật khẩu cũ."
      />
      <form className="profile-form" onSubmit={submit} noValidate>
        {PASSWORD_FIELDS.map((f) => (
          <div className="field-block" key={f.key}>
            <label className="form-field-label" htmlFor={`${uid}-${f.key}`}>{f.label}</label>
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
            {errors[f.key] && (
              <span className="field-error" id={`${uid}-${f.key}-err`}>{errors[f.key]}</span>
            )}
          </div>
        ))}

        <div className="profile-form-actions">
          <button type="submit" className="btn-lyra">Cập nhật mật khẩu</button>
        </div>
        <p className="profile-form-note">
          Bản demo LYRA 2026 chưa kết nối máy chủ nên mật khẩu chỉ được kiểm tra tại trình duyệt.
        </p>
      </form>
    </>
  );
}
