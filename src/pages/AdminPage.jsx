// src/pages/AdminPage.jsx — Bảng điều khiển quản trị LYRA.
// Mọi con số hiển thị ở đây đều được TÍNH TỪ DỮ LIỆU THẬT trong ứng dụng
// (allOrders của CartContext, PRODUCTS/CATEGORIES/COUPONS của data layer).
// Không có số liệu bịa, không có ghi chú kỹ thuật lọt ra giao diện.
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { EmptyState, Pic, isModifiedClick } from '../components/index.jsx';
import { BRAND } from '../data/brand';
import {
  CATEGORIES,
  COUPONS,
  FREE_SHIPPING_THRESHOLD,
  PRODUCTS,
  SHIPPING_FEE,
  deburr,
  fmt,
} from '../data/products';
import { buildUrl } from '../router.js';
import { isEmail } from '../utils/validate.js';
import '../styles/admin.css';

/* ══════════════════════════════════════════════════════════════
   Hằng số & tiện ích (tính một lần ở tầng module — không Date.now()
   hay Math.random() trong thân render)
   ══════════════════════════════════════════════════════════════ */

const NOW = new Date();
const pad2 = (n) => String(n).padStart(2, '0');
const CURRENT_MONTH_LABEL = `Tháng ${pad2(NOW.getMonth() + 1)}/${NOW.getFullYear()}`;

/** Nhãn trạng thái — phủ ĐỦ 6 khoá CartContext định nghĩa để bảng quản trị
    không bao giờ in ra khoá kỹ thuật; cách viết khớp trang Tài khoản và
    Chi tiết đơn ("Đã huỷ", không phải "Đã hủy"). */
const STATUS_LABEL = {
  processing: 'Đang xử lý',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
};
/** Class badge — admin.css chỉ có 4 kiểu nên confirmed/packing dùng lại
    'processing', đúng như trang Tài khoản đang làm. */
const STATUS_CLS = {
  processing: 'processing',
  confirmed: 'processing',
  packing: 'processing',
  shipping: 'shipping',
  delivered: 'delivered',
  cancelled: 'cancelled',
};
const statusLabel = (s) => STATUS_LABEL[s] || STATUS_LABEL.processing;
const statusCls = (s) => STATUS_CLS[s] || 'processing';

/** Tập trạng thái quản trị viên được phép ĐẶT — cố ý là tập con (chip lọc,
    bộ đếm và ô <select>); mở rộng sẽ sinh những tab luôn bằng 0. */
const STATUS_KEYS = ['processing', 'shipping', 'delivered', 'cancelled'];
/** Danh sách option cho một đơn — luôn chứa trạng thái hiện tại của nó. */
const statusOptions = (current) => (STATUS_KEYS.includes(current)
  ? STATUS_KEYS
  : [current, ...STATUS_KEYS]);

const ADMIN_NAV = [
  { id: 'dashboard', label: 'Tổng quan', icon: 'bi-grid' },
  { id: 'products', label: 'Sản phẩm', icon: 'bi-box-seam' },
  { id: 'orders', label: 'Đơn hàng', icon: 'bi-bag' },
  { id: 'customers', label: 'Khách hàng', icon: 'bi-people' },
  { id: 'coupons', label: 'Mã giảm giá', icon: 'bi-tag' },
  { id: 'settings', label: 'Cài đặt', icon: 'bi-gear' },
];

const MONTH_SHORT = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const CHART_MAX_PX = 148; // chiều cao cột lớn nhất — luôn nằm gọn trong .admin-chart

/** ISO → DD/MM/YYYY (ORDERS_MOCK chỉ có createdAt dạng ISO). */
const fmtDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** Số tiền rút gọn theo cách viết Việt: 2.180.000đ → "2,2 triệu". */
const fmtShort = (n) => {
  const v = Number(n) || 0;
  if (v >= 1000000) return `${(v / 1000000).toFixed(1).replace('.', ',')} triệu`;
  return fmt(v);
};

const monthKey = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

/** Khoá nhận diện khách hàng suy ra từ địa chỉ nhận hàng của đơn. */
const customerKey = (order) => {
  const a = order?.address || {};
  return String(a.email || a.phone || a.fullName || '').trim().toLowerCase();
};

/** Top sản phẩm theo số đã bán — [...PRODUCTS] để không mutate mảng gốc. */
const TOP_PRODUCTS = [...PRODUCTS].sort((a, b) => b.sold - a.sold).slice(0, 5);

const SKU = (p) => `LY-${String(p.id).padStart(3, '0')}-2026`;

const COUPON_TYPE_LABEL = { percent: 'Phần trăm', fixed: 'Cố định', shipping: 'Vận chuyển' };
const couponValue = (c) => {
  if (c.type === 'percent') return `${c.value}%`;
  if (c.type === 'fixed') return fmt(c.value);
  return 'Miễn phí ship';
};

const SETTINGS_KEY = 'lyra_settings';
const DEFAULT_SETTINGS = {
  storeName: BRAND.name,
  email: BRAND.email,
  hotline: BRAND.hotline,
  address: BRAND.address,
  shippingFee: String(SHIPPING_FEE),
  freeThreshold: String(FREE_SHIPPING_THRESHOLD),
  leadTime: '2 – 4 ngày làm việc',
};

/**
 * Số tiền hợp lệ: KHÔNG rỗng, là số hữu hạn và không âm.
 * Phải kiểm tra chuỗi TRƯỚC khi ép kiểu — `Number('')` và `Number('  ')` đều
 * bằng 0 nên `Number(v) >= 0` cho ô trống đi lọt.
 * Khai bằng `function` để `readSettings` bên dưới gọi được (tránh TDZ).
 */
function isMoney(v) {
  const s = String(v ?? '').trim();
  return s !== '' && Number.isFinite(Number(s)) && Number(s) >= 0;
}

/** Mọi trường cài đặt luôn là CHUỖI — lọc dữ liệu hỏng thay vì spread mù. */
const readSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      const merged = { ...DEFAULT_SETTINGS };
      Object.keys(DEFAULT_SETTINGS).forEach((k) => {
        const v = parsed[k];
        if (typeof v === 'string' || typeof v === 'number') {
          const s = String(v).trim();
          if (s !== '') merged[k] = s;
        }
      });
      // Bản lưu hỏng từ trước ("" hoặc chữ) → quay về mặc định thay vì hiện 0 ₫.
      if (!isMoney(merged.shippingFee)) merged.shippingFee = DEFAULT_SETTINGS.shippingFee;
      if (!isMoney(merged.freeThreshold)) merged.freeThreshold = DEFAULT_SETTINGS.freeThreshold;
      return merged;
    }
  } catch { /* dữ liệu hỏng → dùng mặc định */ }
  return { ...DEFAULT_SETTINGS };
};

/* ══════════════════════════════════════════════════════════════
   Trang
   ══════════════════════════════════════════════════════════════ */

export default function AdminPage() {
  const { navigate, adminTab, isLoggedIn, isAdmin, authLoading, user, logout } = useApp();
  const { showToast, allOrders } = useCart();

  const tab = ADMIN_NAV.some((t) => t.id === adminTab) ? adminTab : 'dashboard';
  const current = ADMIN_NAV.find((t) => t.id === tab) || ADMIN_NAV[0];

  const goTab = (id) => navigate('admin', { tab: id, replace: true, keepScroll: true });

  const goHome = (e) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    navigate('home');
  };

  const doLogout = () => {
    logout();
    showToast('Đã đăng xuất khỏi khu vực quản trị.', 'bi-door-open');
    navigate('home');
  };

  /* ── Chặn quyền ───────────────────────────────────────────── */
  if (authLoading) {
    return (
      <div className="admin-gate">
        <i className="bi bi-hourglass-split" aria-hidden="true" />
        <p className="admin-gate-text">Đang kiểm tra phiên đăng nhập…</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <AdminGate
        eyebrow="LYRA · Khu vực nội bộ"
        icon="bi-shield-lock"
        titleA="Khu vực"
        titleEm="quản trị"
        text="Trang này dành riêng cho đội ngũ vận hành LYRA. Vui lòng đăng nhập bằng tài khoản quản trị để tiếp tục."
        primary={{ label: 'Đăng nhập quản trị', onClick: () => navigate('auth', { next: '/admin' }) }}
        onHome={goHome}
        hint="Tài khoản demo: admin@lyra.vn — mật khẩu bất kỳ từ 6 ký tự."
      />
    );
  }

  if (!isAdmin) {
    return (
      <AdminGate
        eyebrow="LYRA · Khu vực nội bộ"
        icon="bi-person-lock"
        titleA="Không đủ"
        titleEm="quyền"
        text={`Tài khoản ${user?.email || ''} đang ở nhóm khách hàng nên không thể mở bảng điều khiển. Bạn vẫn có thể theo dõi đơn hàng của mình ở trang tài khoản.`}
        primary={{ label: 'Về trang tài khoản', onClick: () => navigate('profile', { tab: 'orders' }) }}
        onHome={goHome}
        secondary={{ label: 'Đăng xuất', onClick: doLogout }}
      />
    );
  }

  /* ── Phụ đề từng tab (đếm thật) ───────────────────────────── */
  const subByTab = {
    dashboard: `Tổng quan hoạt động kinh doanh — ${CURRENT_MONTH_LABEL}`,
    products: `${PRODUCTS.length} thiết kế đang bán trên ${CATEGORIES.length} danh mục`,
    orders: `${allOrders.length} đơn hàng trong hệ thống`,
    customers: 'Danh sách suy ra từ địa chỉ nhận hàng của các đơn đã ghi nhận',
    coupons: `${Object.keys(COUPONS).length} mã đang được giỏ hàng chấp nhận`,
    settings: 'Cấu hình cửa hàng — lưu trên trình duyệt của bạn',
  };

  return (
    <div className="admin-layout">
      <nav className="admin-sidebar" aria-label="Điều hướng quản trị">
        <div className="admin-sidebar-logo">
          LYRA <span className="admin-sidebar-tag">Quản trị</span>
        </div>

        <div className="admin-nav-section">Quản lý</div>
        {ADMIN_NAV.map((item) => (
          <a
            key={item.id}
            className={`admin-nav-item${tab === item.id ? ' active' : ''}`}
            href={buildUrl('admin', { tab: item.id })}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={(e) => {
              if (isModifiedClick(e)) return;
              e.preventDefault();
              goTab(item.id);
            }}
          >
            <i className={`bi ${item.icon}`} aria-hidden="true" />
            {item.label}
          </a>
        ))}

        <div className="admin-nav-section">Hệ thống</div>
        <a className="admin-nav-item admin-nav-exit" href={buildUrl('home')} onClick={goHome}>
          <i className="bi bi-arrow-left" aria-hidden="true" /> Về trang chủ
        </a>
        <button type="button" className="admin-nav-item admin-nav-exit" onClick={doLogout}>
          <i className="bi bi-box-arrow-right" aria-hidden="true" /> Đăng xuất
        </button>
      </nav>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-text">
            <div className="eyebrow">LYRA · Bảng điều khiển</div>
            <h1 className="admin-page-title">{current.label}</h1>
            <p className="admin-page-sub">{subByTab[tab]}</p>
          </div>
          <div className="admin-user">
            <span className="admin-avatar" aria-hidden="true">{user?.avatar || 'A'}</span>
            <span className="admin-user-meta">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </span>
          </div>
        </header>

        {tab === 'dashboard' && <DashboardTab allOrders={allOrders} goTab={goTab} />}
        {tab === 'products' && <ProductsTab navigate={navigate} showToast={showToast} />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'customers' && <CustomersTab allOrders={allOrders} />}
        {tab === 'coupons' && <CouponsTab allOrders={allOrders} showToast={showToast} />}
        {tab === 'settings' && <SettingsTab showToast={showToast} />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Panel chặn truy cập
   ══════════════════════════════════════════════════════════════ */
function AdminGate({ eyebrow, icon, titleA, titleEm, text, primary, secondary, onHome, hint }) {
  return (
    <div className="admin-gate">
      <i className={`bi ${icon}`} aria-hidden="true" />
      <div className="eyebrow bare">{eyebrow}</div>
      <h1 className="t-h1 admin-gate-title">
        {titleA} <em>{titleEm}</em>
      </h1>
      <p className="admin-gate-text">{text}</p>
      <div className="admin-gate-actions">
        <button type="button" className="btn-lyra" onClick={primary.onClick}>
          {primary.label}
        </button>
        <a className="btn-outline-lyra" href={buildUrl('home')} onClick={onHome}>
          Về trang chủ
        </a>
        {secondary && (
          <button type="button" className="btn-warm" onClick={secondary.onClick}>
            {secondary.label}
          </button>
        )}
      </div>
      {hint && <p className="demo-hint">{hint}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Tổng quan
   ══════════════════════════════════════════════════════════════ */
function DashboardTab({ allOrders, goTab }) {
  const stats = useMemo(() => {
    const active = allOrders.filter((o) => o.status !== 'cancelled');
    const revenue = active.reduce((a, o) => a + (Number(o.total) || 0), 0);
    const customers = new Set(allOrders.map(customerKey).filter(Boolean));
    const byStatus = STATUS_KEYS.reduce((acc, k) => {
      acc[k] = allOrders.filter((o) => o.status === k).length;
      return acc;
    }, {});
    return {
      revenue,
      active: active.length,
      total: allOrders.length,
      customers: customers.size,
      avg: active.length ? Math.round(revenue / active.length) : 0,
      byStatus,
    };
  }, [allOrders]);

  const months = useMemo(() => {
    const list = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1);
      list.push({
        key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`,
        short: MONTH_SHORT[d.getMonth()],
        full: `Tháng ${pad2(d.getMonth() + 1)}/${d.getFullYear()}`,
        value: 0,
      });
    }
    const index = new Map(list.map((m) => [m.key, m]));
    allOrders.forEach((o) => {
      if (o.status === 'cancelled') return;
      const bucket = index.get(monthKey(o.createdAt));
      if (bucket) bucket.value += Number(o.total) || 0;
    });
    return list;
  }, [allOrders]);

  const maxMonth = months.reduce((m, x) => Math.max(m, x.value), 0);

  const recent = useMemo(
    () => [...allOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
    [allOrders],
  );

  const tiles = [
    {
      label: 'Doanh thu ghi nhận',
      value: fmtShort(stats.revenue),
      note: `${stats.active}/${stats.total} đơn không huỷ`,
      icon: 'bi-graph-up',
    },
    {
      label: 'Tổng đơn hàng',
      value: String(stats.total),
      note: `${stats.byStatus.processing} đang xử lý · ${stats.byStatus.shipping} đang giao`,
      icon: 'bi-bag-check',
    },
    {
      label: 'Khách hàng',
      value: String(stats.customers),
      note: 'Đếm theo địa chỉ nhận hàng duy nhất',
      icon: 'bi-people',
    },
    {
      label: 'Giá trị trung bình',
      value: fmtShort(stats.avg),
      note: 'Trên mỗi đơn không huỷ',
      icon: 'bi-receipt',
    },
  ];

  return (
    <>
      <div className="stats-grid">
        {tiles.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-head">
              <span className="stat-label">{s.label}</span>
              <i className={`bi ${s.icon}`} aria-hidden="true" />
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-note">{s.note}</div>
          </div>
        ))}
      </div>

      <div className="admin-table-card">
        <div className="admin-card-head">
          <div className="admin-table-title">Doanh thu 12 tháng gần nhất</div>
          <span className="admin-card-note">Tính từ đơn hàng trong hệ thống demo</span>
        </div>
        {maxMonth > 0 ? (
          <div className="admin-chart" role="img" aria-label={`Biểu đồ doanh thu 12 tháng, cao nhất ${fmt(maxMonth)}`}>
            {months.map((m) => (
              <div key={m.key} className="admin-chart-col" title={`${m.full}: ${fmt(m.value)}`}>
                <span className="admin-chart-value">{m.value ? fmtShort(m.value) : ''}</span>
                <div
                  className="admin-chart-bar"
                  style={{ height: Math.max(2, Math.round((m.value / maxMonth) * CHART_MAX_PX)) }}
                />
                <span className="admin-chart-label">{m.short}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-card-note">Chưa có đơn hàng nào trong 12 tháng gần nhất.</p>
        )}
      </div>

      <div className="admin-split">
        <div className="admin-table-card">
          <div className="admin-card-head">
            <div className="admin-table-title">Đơn hàng gần đây</div>
            <a
              className="admin-card-link"
              href={buildUrl('admin', { tab: 'orders' })}
              onClick={(e) => {
                if (isModifiedClick(e)) return;
                e.preventDefault();
                goTab('orders');
              }}
            >
              Xem tất cả <i className="bi bi-arrow-right" aria-hidden="true" />
            </a>
          </div>

          {recent.length === 0 ? (
            <p className="admin-card-note">Chưa có đơn hàng nào.</p>
          ) : (
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Ngày đặt</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id}>
                      <td className="admin-mono">{o.id}</td>
                      <td>{o.address?.fullName || 'Khách lẻ'}</td>
                      <td className="admin-dim">{fmtDate(o.createdAt)}</td>
                      <td className="admin-amount">{fmt(o.total)}</td>
                      <td>
                        <span className={`status-pill ${statusCls(o.status)}`}>{statusLabel(o.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-table-card">
          <div className="admin-card-head">
            <div className="admin-table-title">Sản phẩm bán chạy</div>
            <span className="admin-card-note">Theo số lượng đã bán</span>
          </div>
          <ul className="admin-top-list">
            {TOP_PRODUCTS.map((p, i) => (
              <li key={p.id} className="admin-top-item">
                <span className="admin-top-rank">{pad2(i + 1)}</span>
                <Pic
                  src={p.images?.[0]}
                  alt=""
                  tint={p.color}
                  icon={p.icon}
                  ratio="3/4"
                  className="admin-thumb"
                />
                <span className="admin-top-text">
                  <span className="admin-top-name">{p.name}</span>
                  <span className="admin-top-sub">{p.sold.toLocaleString('vi-VN')} đã bán · {p.cat}</span>
                </span>
                <span className="admin-amount">{fmt(p.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Sản phẩm
   ══════════════════════════════════════════════════════════════ */
const PRODUCT_SORTS = [
  { id: 'sold', label: 'Bán chạy nhất' },
  { id: 'newest', label: 'Mới nhất' },
  { id: 'price-desc', label: 'Giá cao → thấp' },
  { id: 'price-asc', label: 'Giá thấp → cao' },
  { id: 'stock-asc', label: 'Tồn kho ít nhất' },
  { id: 'name', label: 'Tên A → Z' },
];

const stockBadge = (stock) => {
  if (stock <= 0) return { cls: 'cancelled', text: 'Hết hàng' };
  if (stock <= 8) return { cls: 'shipping', text: `Sắp hết · ${stock}` };
  return { cls: 'delivered', text: `Còn ${stock}` };
};

function ProductsTab({ navigate, showToast }) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState('sold');

  const rows = useMemo(() => {
    const q = deburr(search.trim().toLowerCase());
    let list = PRODUCTS.filter((p) => {
      if (cat !== 'all' && p.cat !== cat) return false;
      if (!q) return true;
      return deburr(`${p.name} ${p.cat} ${p.brand} ${SKU(p)}`.toLowerCase()).includes(q);
    });
    list = [...list];
    if (sort === 'sold') list.sort((a, b) => b.sold - a.sold);
    else if (sort === 'newest') list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'stock-asc') list.sort((a, b) => a.stock - b.stock);
    else list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return list;
  }, [search, cat, sort]);

  const reset = () => {
    setSearch('');
    setCat('all');
    setSort('sold');
  };

  return (
    <>
      <div className="admin-action-row">
        <p className="admin-card-note">
          Đang hiển thị {rows.length}/{PRODUCTS.length} sản phẩm
        </p>
        <button
          type="button"
          className="btn-lyra btn-sm"
          onClick={() => showToast('Chức năng thêm sản phẩm đang được phát triển.', 'bi-tools')}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" /> Thêm sản phẩm
        </button>
      </div>

      <div className="admin-table-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <i className="bi bi-search" aria-hidden="true" />
            <label className="sr-only" htmlFor="admin-product-search">Tìm kiếm sản phẩm</label>
            <input
              id="admin-product-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, danh mục hoặc SKU…"
            />
          </div>

          <label className="sr-only" htmlFor="admin-product-cat">Lọc theo danh mục</label>
          <select
            id="admin-product-cat"
            className="admin-select"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="all">Tất cả danh mục</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.name}>{c.name} ({c.count})</option>
            ))}
          </select>

          <label className="sr-only" htmlFor="admin-product-sort">Sắp xếp sản phẩm</label>
          <select
            id="admin-product-sort"
            className="admin-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {PRODUCT_SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon="bi-search"
            title="Không tìm thấy sản phẩm"
            sub="Thử từ khoá khác hoặc bỏ bớt bộ lọc danh mục."
            action={{ label: 'Xoá bộ lọc', onClick: reset }}
          />
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá</th>
                  <th>Tồn kho</th>
                  <th>Đã bán</th>
                  <th>Đánh giá</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const badge = stockBadge(p.stock);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="admin-product-cell">
                          <Pic
                            src={p.images?.[0]}
                            alt=""
                            tint={p.color}
                            icon={p.icon}
                            ratio="3/4"
                            className="admin-thumb"
                          />
                          <span className="admin-product-text">
                            <span className="admin-product-name">{p.name}</span>
                            <span className="admin-mono admin-dim">{SKU(p)}</span>
                          </span>
                        </div>
                      </td>
                      <td className="admin-dim">{p.cat}</td>
                      <td className="admin-amount">{fmt(p.price)}</td>
                      <td><span className={`status-pill ${badge.cls}`}>{badge.text}</span></td>
                      <td>{p.sold.toLocaleString('vi-VN')}</td>
                      <td className="admin-dim">
                        {p.rating.toFixed(1).replace('.', ',')} · {p.reviews} đánh giá
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <a
                            className="admin-mini-btn"
                            href={buildUrl('detail', { product: p.slug })}
                            onClick={(e) => {
                              if (isModifiedClick(e)) return;
                              e.preventDefault();
                              navigate('detail', { product: p });
                            }}
                          >
                            Xem
                          </a>
                          <button
                            type="button"
                            className="admin-mini-btn"
                            onClick={() => showToast('Chức năng chỉnh sửa sản phẩm đang được phát triển.', 'bi-tools')}
                          >
                            Sửa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Đơn hàng
   ══════════════════════════════════════════════════════════════ */
function OrdersTab() {
  const { navigate } = useApp();
  const { allOrders, showToast, updateOrderStatus, cancelOrder } = useCart();
  const [filter, setFilter] = useState('all');

  const counts = useMemo(() => {
    const c = { all: allOrders.length };
    STATUS_KEYS.forEach((k) => { c[k] = allOrders.filter((o) => o.status === k).length; });
    return c;
  }, [allOrders]);

  const rows = useMemo(() => {
    const list = filter === 'all' ? [...allOrders] : allOrders.filter((o) => o.status === filter);
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allOrders, filter]);

  const changeStatus = (order, next) => {
    if (next === order.status) return;
    const ok = next === 'cancelled' ? cancelOrder(order.id) : updateOrderStatus(order.id, next);
    if (ok) showToast(`Đơn ${order.id} → ${statusLabel(next)}`, 'bi-arrow-repeat');
    else showToast('Không cập nhật được đơn hàng này.', 'bi-exclamation-circle');
  };

  return (
    <>
      <div className="chip-row admin-chip-row">
        {['all', ...STATUS_KEYS].map((s) => (
          <button
            key={s}
            type="button"
            className={`chip${filter === s ? ' active' : ''}`}
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'Tất cả' : statusLabel(s)} ({counts[s] || 0})
          </button>
        ))}
      </div>

      <div className="admin-table-card">
        {rows.length === 0 ? (
          <EmptyState
            icon="bi-bag"
            title="Chưa có đơn nào ở trạng thái này"
            sub="Chọn một bộ lọc khác để xem toàn bộ đơn hàng."
            action={{ label: 'Xem tất cả đơn', onClick: () => setFilter('all') }}
          />
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Ngày đặt</th>
                  <th>Số SP</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const qty = (o.items || []).reduce((a, i) => a + (Number(i.qty) || 0), 0);
                  return (
                    <tr key={o.id}>
                      <td className="admin-mono">{o.id}</td>
                      <td>
                        <span className="admin-product-text">
                          <span className="admin-product-name">{o.address?.fullName || 'Khách lẻ'}</span>
                          <span className="admin-dim">{o.address?.city || '—'}</span>
                        </span>
                      </td>
                      <td className="admin-dim">{fmtDate(o.createdAt)}</td>
                      <td>{qty}</td>
                      <td className="admin-amount">{fmt(o.total)}</td>
                      <td>
                        <label className="sr-only" htmlFor={`status-${o.id.replace('#', '')}`}>
                          Trạng thái đơn {o.id}
                        </label>
                        <select
                          id={`status-${o.id.replace('#', '')}`}
                          className={`admin-select admin-status-select ${statusCls(o.status)}`}
                          value={o.status}
                          onChange={(e) => changeStatus(o, e.target.value)}
                        >
                          {statusOptions(o.status).map((k) => (
                            <option key={k} value={k}>{statusLabel(k)}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <a
                          className="admin-mini-btn"
                          href={buildUrl('order-detail', { order: o.id })}
                          onClick={(e) => {
                            if (isModifiedClick(e)) return;
                            e.preventDefault();
                            navigate('order-detail', { order: o.id });
                          }}
                        >
                          Chi tiết
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Khách hàng — dẫn xuất từ allOrders
   ══════════════════════════════════════════════════════════════ */
function CustomersTab({ allOrders }) {
  const customers = useMemo(() => {
    const map = new Map();
    allOrders.forEach((o) => {
      const key = customerKey(o);
      if (!key) return;
      const a = o.address || {};
      const entry = map.get(key) || {
        key,
        name: a.fullName || 'Khách lẻ',
        email: a.email || '',
        phone: a.phone || '',
        city: a.city || '',
        orders: 0,
        spent: 0,
        last: o.createdAt,
      };
      entry.orders += 1;
      if (o.status !== 'cancelled') entry.spent += Number(o.total) || 0;
      if (new Date(o.createdAt).getTime() > new Date(entry.last).getTime()) entry.last = o.createdAt;
      map.set(key, entry);
    });
    return [...map.values()].sort((a, b) => b.spent - a.spent);
  }, [allOrders]);

  if (customers.length === 0) {
    return (
      <div className="admin-table-card">
        <EmptyState
          icon="bi-people"
          title="Chưa có khách hàng nào"
          sub="Danh sách khách hàng được dựng từ địa chỉ nhận hàng của các đơn đã đặt."
        />
      </div>
    );
  }

  return (
    <>
      <p className="admin-card-note admin-action-row">
        {customers.length} khách hàng · dựng từ {allOrders.length} đơn hàng
      </p>
      <div className="admin-table-card">
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Email</th>
                <th>Điện thoại</th>
                <th>Khu vực</th>
                <th>Số đơn</th>
                <th>Đã chi tiêu</th>
                <th>Đơn gần nhất</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.key}>
                  <td>
                    <div className="admin-product-cell">
                      <span className="admin-avatar sm" aria-hidden="true">{(c.name[0] || 'K').toUpperCase()}</span>
                      <span className="admin-product-name">{c.name}</span>
                    </div>
                  </td>
                  <td className="admin-dim">{c.email || '—'}</td>
                  <td className="admin-dim">{c.phone || '—'}</td>
                  <td className="admin-dim">{c.city || '—'}</td>
                  <td>{c.orders}</td>
                  <td className="admin-amount">{fmt(c.spent)}</td>
                  <td className="admin-dim">{fmtDate(c.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Mã giảm giá — đọc thẳng từ COUPONS nên luôn khớp với giỏ hàng
   ══════════════════════════════════════════════════════════════ */
function CouponsTab({ allOrders, showToast }) {
  const rows = useMemo(() => {
    const used = new Map();
    allOrders.forEach((o) => {
      const code = String(o.couponCode || '').toUpperCase();
      if (code) used.set(code, (used.get(code) || 0) + 1);
    });
    return Object.entries(COUPONS).map(([code, c]) => ({
      code,
      ...c,
      used: used.get(code) || 0,
    }));
  }, [allOrders]);

  return (
    <>
      <div className="admin-action-row">
        <p className="admin-card-note">
          Bảng này đọc trực tiếp cấu hình mã giảm giá — đúng những mã giỏ hàng đang chấp nhận.
        </p>
        <button
          type="button"
          className="btn-lyra btn-sm"
          onClick={() => showToast('Chức năng tạo mã giảm giá đang được phát triển.', 'bi-tools')}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" /> Tạo mã mới
        </button>
      </div>

      <div className="admin-table-card">
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Loại</th>
                <th>Giá trị</th>
                <th>Đơn tối thiểu</th>
                <th>Đã dùng</th>
                <th>Mô tả</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.code}>
                  <td className="admin-mono admin-coupon-code">{c.code}</td>
                  <td className="admin-dim">{COUPON_TYPE_LABEL[c.type] || c.type}</td>
                  <td className="admin-amount">{couponValue(c)}</td>
                  <td className="admin-dim">{c.min > 0 ? fmt(c.min) : 'Không yêu cầu'}</td>
                  <td>{c.used} đơn</td>
                  <td className="admin-dim">{c.label}</td>
                  <td><span className="status-pill delivered">Đang áp dụng</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Cài đặt — form controlled, lưu localStorage lyra_settings
   ══════════════════════════════════════════════════════════════ */
function SettingsTab({ showToast }) {
  const [form, setForm] = useState(readSettings);
  const [errors, setErrors] = useState({});

  const set = (name) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.storeName.trim()) next.storeName = 'Vui lòng nhập tên cửa hàng.';
    if (!isEmail(form.email)) next.email = 'Địa chỉ email chưa hợp lệ.';
    if (!form.hotline.trim()) next.hotline = 'Vui lòng nhập số hotline.';
    if (!form.address.trim()) next.address = 'Vui lòng nhập địa chỉ cửa hàng.';
    if (!isMoney(form.shippingFee)) next.shippingFee = 'Phí vận chuyển phải là số không âm.';
    if (!isMoney(form.freeThreshold)) next.freeThreshold = 'Ngưỡng miễn phí phải là số không âm.';
    if (!form.leadTime.trim()) next.leadTime = 'Vui lòng nhập thời gian giao hàng dự kiến.';

    setErrors(next);
    if (Object.keys(next).length > 0) {
      showToast('Vui lòng kiểm tra lại các trường được đánh dấu.', 'bi-exclamation-circle');
      return;
    }

    // Chuẩn hoá trước khi lưu — VẪN là chuỗi để giữ bất biến cho `.trim()`.
    const clean = {
      ...form,
      storeName: form.storeName.trim(),
      email: form.email.trim(),
      hotline: form.hotline.trim(),
      address: form.address.trim(),
      leadTime: form.leadTime.trim(),
      shippingFee: String(Number(String(form.shippingFee).trim())),
      freeThreshold: String(Number(String(form.freeThreshold).trim())),
    };

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean));
      setForm(clean);
      showToast('Đã lưu cài đặt trên trình duyệt này.', 'bi-check-circle');
    } catch {
      showToast('Trình duyệt đang chặn lưu trữ nên chưa lưu được cài đặt.', 'bi-exclamation-circle');
    }
  };

  const restore = () => {
    setForm({ ...DEFAULT_SETTINGS });
    setErrors({});
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch { /* bỏ qua */ }
    showToast('Đã khôi phục cài đặt mặc định.', 'bi-arrow-counterclockwise');
  };

  return (
    <form className="admin-settings" onSubmit={submit} noValidate>
      <div className="admin-split">
        <div className="admin-table-card">
          <div className="admin-table-title">Thông tin cửa hàng</div>
          <AdminField id="set-name" label="Tên cửa hàng" value={form.storeName} onChange={set('storeName')} error={errors.storeName} />
          <AdminField id="set-email" label="Email liên hệ" type="email" value={form.email} onChange={set('email')} error={errors.email} />
          <AdminField id="set-hotline" label="Hotline" value={form.hotline} onChange={set('hotline')} error={errors.hotline} />
          <AdminField id="set-address" label="Địa chỉ cửa hàng" value={form.address} onChange={set('address')} error={errors.address} />
        </div>

        <div className="admin-table-card">
          <div className="admin-table-title">Vận chuyển</div>
          <AdminField
            id="set-fee"
            label="Phí vận chuyển mặc định (đ)"
            type="number"
            min="0"
            step="1000"
            value={form.shippingFee}
            onChange={set('shippingFee')}
            error={errors.shippingFee}
            hint={`Đang áp dụng: ${fmt(Number(form.shippingFee) || 0)}`}
          />
          <AdminField
            id="set-threshold"
            label="Ngưỡng miễn phí vận chuyển (đ)"
            type="number"
            min="0"
            step="10000"
            value={form.freeThreshold}
            onChange={set('freeThreshold')}
            error={errors.freeThreshold}
            hint={`Đang áp dụng: ${fmt(Number(form.freeThreshold) || 0)}`}
          />
          <AdminField id="set-lead" label="Thời gian giao hàng dự kiến" value={form.leadTime} onChange={set('leadTime')} error={errors.leadTime} />
          <p className="admin-card-note">
            Cài đặt được lưu trên trình duyệt của bạn để xem trước giao diện. Biểu phí thật của giỏ hàng
            vẫn lấy từ cấu hình hệ thống cho tới khi có máy chủ.
          </p>
        </div>
      </div>

      <div className="admin-settings-foot">
        <button type="submit" className="btn-lyra">Lưu cài đặt</button>
        <button type="button" className="btn-outline-lyra" onClick={restore}>Khôi phục mặc định</button>
      </div>
    </form>
  );
}

function AdminField({ id, label, value, onChange, error, hint, type = 'text', ...rest }) {
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        className={`admin-input${error ? ' has-error' : ''}`}
        value={value}
        onChange={onChange}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      {error ? (
        <p className="field-error" id={`${id}-error`} role="alert">{error}</p>
      ) : (
        hint && <p className="admin-field-hint">{hint}</p>
      )}
    </div>
  );
}
