// src/pages/AdminPage.jsx
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt, PRODUCTS } from '../data/products';

const ORDERS_DATA = [
  { id: '#MSN240098', customer: 'Nguyễn Linh Chi', date: '28/01/2025', total: 2740000, status: 'delivered', items: 3 },
  { id: '#MSN240097', customer: 'Trần Văn Bình',   date: '27/01/2025', total: 890000,  status: 'shipping',  items: 1 },
  { id: '#MSN240096', customer: 'Lê Thu Hà',       date: '27/01/2025', total: 1950000, status: 'processing', items: 2 },
  { id: '#MSN240095', customer: 'Phạm Minh Đức',   date: '26/01/2025', total: 420000,  status: 'delivered', items: 1 },
  { id: '#MSN240094', customer: 'Hoàng Thị Lan',   date: '25/01/2025', total: 3680000, status: 'cancelled', items: 4 },
];

const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard',        icon: 'bi-grid' },
  { id: 'products',  label: 'Sản phẩm',         icon: 'bi-box' },
  { id: 'orders',    label: 'Đơn hàng',          icon: 'bi-bag' },
  { id: 'customers', label: 'Khách hàng',        icon: 'bi-people' },
  { id: 'coupons',   label: 'Mã giảm giá',       icon: 'bi-tag' },
  { id: 'settings',  label: 'Cài đặt',           icon: 'bi-gear' },
];

export default function AdminPage() {
  const { navigate } = useApp();
  const { showToast } = useCart();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">LYRA <span style={{ fontSize: 11, opacity: .5, letterSpacing: '.08em' }}>Admin</span></div>
        <div className="admin-nav-section">Quản lý</div>
        {ADMIN_NAV.map(item => (
          <a key={item.id}
            className={`admin-nav-item${activeTab === item.id ? ' active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <i className={`bi ${item.icon}`} />
            {item.label}
          </a>
        ))}
        <div className="admin-nav-section">Hệ thống</div>
        <a className="admin-nav-item" onClick={() => navigate('home')}>
          <i className="bi bi-arrow-left" /> Về trang chủ
        </a>
        <a className="admin-nav-item" onClick={() => showToast('Đã đăng xuất', 'bi-door-open')}>
          <i className="bi bi-box-arrow-right" /> Đăng xuất
        </a>
      </aside>

      {/* Main */}
      <main className="admin-main">
        {activeTab === 'dashboard' && <DashboardTab setActiveTab={setActiveTab} />}
        {activeTab === 'products'  && <ProductsTab showToast={showToast} navigate={navigate} />}
        {activeTab === 'orders'    && <OrdersTab showToast={showToast} />}
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'coupons'   && <CouponsTab showToast={showToast} />}
        {activeTab === 'settings'  && <SettingsTab showToast={showToast} />}
      </main>
    </div>
  );
}

/* ── Dashboard ── */
function DashboardTab({ setActiveTab }) {
  const stats = [
    { label: 'Doanh thu tháng', value: '142.5M', change: '+18.2%', up: true, icon: 'bi-graph-up' },
    { label: 'Đơn hàng mới',    value: '284',    change: '+12.5%', up: true, icon: 'bi-bag-check' },
    { label: 'Khách hàng mới',  value: '1,842',  change: '+8.4%',  up: true, icon: 'bi-people' },
    { label: 'Tỉ lệ chuyển đổi', value: '3.8%',  change: '-0.3%',  up: false, icon: 'bi-percent' },
  ];
  const topProducts = PRODUCTS.sort((a,b) => b.reviews - a.reviews).slice(0, 5);

  return (
    <>
      <div>
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-sub">Tổng quan hoạt động kinh doanh — Tháng 01/2025</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="d-flex justify-content-between align-items-start">
              <div className="stat-label">{s.label}</div>
              <i className={`bi ${s.icon}`} style={{ fontSize: 20, color: 'var(--warm)', opacity: .6 }} />
            </div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-change ${s.up ? 'up' : 'down'}`}>
              <i className={`bi bi-arrow-${s.up ? 'up' : 'down'}`} /> {s.change} so với tháng trước
            </div>
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="admin-table-card">
        <div className="admin-table-title">Doanh thu 12 tháng qua</div>
        <div className="admin-chart-placeholder">
          <i className="bi bi-bar-chart" />
          <span>Biểu đồ doanh thu (tích hợp Chart.js khi kết nối API)</span>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {[40,65,52,78,60,88,72,95,68,84,92,110].map((h, i) => (
              <div key={i} style={{ width: 28, height: h * 1.2, background: 'var(--warm)', opacity: .3 + i * .05, borderRadius: 2 }} />
            ))}
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Recent orders */}
        <div className="col-lg-7">
          <div className="admin-table-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="admin-table-title">Đơn hàng gần đây</div>
              <span style={{ fontSize: 11.5, color: 'var(--warm)', cursor: 'pointer' }} onClick={() => setActiveTab('orders')}>Xem tất cả →</span>
            </div>
            <table className="admin-table">
              <thead><tr>
                <th>Mã đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th>
              </tr></thead>
              <tbody>
                {ORDERS_DATA.slice(0,4).map(o => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>{o.id}</td>
                    <td>{o.customer}</td>
                    <td style={{ fontFamily: 'var(--font-serif)' }}>{fmt(o.total)}</td>
                    <td><span className={`status-pill ${o.status}`}>{
                      {delivered:'Đã giao',shipping:'Đang giao',processing:'Xử lý',cancelled:'Đã hủy'}[o.status]
                    }</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top products */}
        <div className="col-lg-5">
          <div className="admin-table-card">
            <div className="admin-table-title">Top sản phẩm bán chạy</div>
            {topProducts.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 32, height: 32, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`bi ${p.icon}`} style={{ fontSize: 14, color: 'rgba(14,14,14,.3)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{p.reviews} đã bán</div>
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, flexShrink: 0 }}>{fmt(p.price)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Products Tab ── */
function ProductsTab({ showToast, navigate }) {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div>
          <h1 className="admin-page-title">Sản phẩm</h1>
          <p className="admin-page-sub">{PRODUCTS.length} sản phẩm</p>
        </div>
        <button className="btn-lyra" onClick={() => showToast('Tính năng thêm sản phẩm đang phát triển', 'bi-plus')}>
          <i className="bi bi-plus" /> Thêm sản phẩm
        </button>
      </div>

      <div className="admin-table-card">
        <div className="d-flex gap-3 mb-3">
          <input style={{ border: '1px solid var(--border)', padding: '8px 14px', fontSize: 12.5, flex: 1, outline: 'none', fontFamily: 'var(--font-sans)' }} placeholder="Tìm kiếm sản phẩm..." />
          <select style={{ border: '1px solid var(--border)', padding: '8px 14px', fontSize: 12.5, outline: 'none', fontFamily: 'var(--font-sans)' }}>
            <option>Tất cả danh mục</option>
            <option>Thời trang nữ</option>
            <option>Thời trang nam</option>
            <option>Giày dép</option>
          </select>
        </div>
        <table className="admin-table">
          <thead><tr>
            <th>Sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Kho</th><th>Đánh giá</th><th>Trạng thái</th><th>Hành động</th>
          </tr></thead>
          <tbody>
            {PRODUCTS.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 44, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`bi ${p.icon}`} style={{ fontSize: 14, color: 'rgba(14,14,14,.25)' }} />
                    </div>
                    <span style={{ fontSize: 12.5 }}>{p.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{p.cat}</td>
                <td style={{ fontFamily: 'var(--font-serif)' }}>{fmt(p.price)}</td>
                <td>
                  <span style={{ color: p.stock < 10 ? 'var(--danger)' : 'inherit' }}>{p.stock}</span>
                </td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>★ {p.rating} ({p.reviews})</td>
                <td><span className="status-pill delivered">Đang bán</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ background: 'none', border: '1px solid var(--border)', padding: '4px 10px', fontSize: 11.5, cursor: 'pointer' }}
                      onClick={() => navigate('detail', { product: p })}>Xem</button>
                    <button style={{ background: 'none', border: '1px solid var(--border)', padding: '4px 10px', fontSize: 11.5, cursor: 'pointer' }}
                      onClick={() => showToast(`Chỉnh sửa "${p.name}"`, 'bi-pencil')}>Sửa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ── Orders Tab ── */
function OrdersTab({ showToast }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? ORDERS_DATA : ORDERS_DATA.filter(o => o.status === filter);

  return (
    <>
      <h1 className="admin-page-title">Đơn hàng</h1>
      <p className="admin-page-sub">{ORDERS_DATA.length} đơn hàng</p>

      <div className="d-flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
        {['all','processing','shipping','delivered','cancelled'].map(s => (
          <button key={s}
            style={{ padding: '7px 16px', fontSize: 11.5, letterSpacing: '.06em', border: '1px solid var(--border)', background: filter === s ? 'var(--ink)' : 'transparent', color: filter === s ? 'var(--cream)' : 'var(--ink)', cursor: 'pointer', transition: 'all .2s' }}
            onClick={() => setFilter(s)}>
            {{ all:'Tất cả', processing:'Xử lý', shipping:'Đang giao', delivered:'Đã giao', cancelled:'Đã hủy' }[s]}
          </button>
        ))}
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr>
            <th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Số SP</th><th>Tổng tiền</th><th>Trạng thái</th><th>Hành động</th>
          </tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{o.id}</td>
                <td>{o.customer}</td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{o.date}</td>
                <td>{o.items}</td>
                <td style={{ fontFamily: 'var(--font-serif)' }}>{fmt(o.total)}</td>
                <td><span className={`status-pill ${o.status}`}>{
                  {delivered:'Đã giao',shipping:'Đang giao',processing:'Xử lý',cancelled:'Đã hủy'}[o.status]
                }</span></td>
                <td>
                  <button style={{ background: 'none', border: '1px solid var(--border)', padding: '4px 12px', fontSize: 11.5, cursor: 'pointer' }}
                    onClick={() => showToast(`Xem đơn ${o.id}`, 'bi-eye')}>Chi tiết</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ── Customers Tab ── */
function CustomersTab() {
  const customers = [
    { name: 'Nguyễn Linh Chi', email: 'chi@email.com', orders: 8,  total: 12400000, joined: '10/2024' },
    { name: 'Trần Văn Bình',   email: 'binh@email.com', orders: 5,  total: 7800000,  joined: '11/2024' },
    { name: 'Lê Thu Hà',       email: 'ha@email.com',   orders: 12, total: 18600000, joined: '08/2024' },
    { name: 'Phạm Minh Đức',   email: 'duc@email.com',  orders: 3,  total: 3200000,  joined: '01/2025' },
  ];
  return (
    <>
      <h1 className="admin-page-title">Khách hàng</h1>
      <p className="admin-page-sub">{customers.length} khách hàng đã đăng ký</p>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Khách hàng</th><th>Email</th><th>Tham gia</th><th>Số đơn</th><th>Tổng chi tiêu</th></tr></thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.email}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--warm-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', color: 'var(--warm)', fontSize: 14 }}>
                      {c.name[0]}
                    </div>
                    {c.name}
                  </div>
                </td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.email}</td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.joined}</td>
                <td>{c.orders}</td>
                <td style={{ fontFamily: 'var(--font-serif)' }}>{fmt(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ── Coupons Tab ── */
function CouponsTab({ showToast }) {
  const coupons = [
    { code: 'LYRA10', type: 'Phần trăm', value: '10%',       uses: 45, limit: 100,  expires: '31/03/2025', active: true },
    { code: 'LYRA20', type: 'Phần trăm', value: '20%',       uses: 12, limit: 50,   expires: '28/02/2025', active: true },
    { code: 'FREESHIP', type: 'Vận chuyển', value: 'Miễn phí', uses: 88, limit: 200,  expires: '30/06/2025', active: true },
    { code: 'SAVE100K', type: 'Cố định',   value: '100.000đ',  uses: 23, limit: 50,   expires: '15/02/2025', active: false },
  ];
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div>
          <h1 className="admin-page-title">Mã giảm giá</h1>
          <p className="admin-page-sub">{coupons.length} mã coupon</p>
        </div>
        <button className="btn-lyra" onClick={() => showToast('Tạo mã giảm giá mới', 'bi-plus')}>
          <i className="bi bi-plus" /> Tạo mã mới
        </button>
      </div>
      <div className="admin-table-card">
        <table className="admin-table">
          <thead><tr><th>Mã</th><th>Loại</th><th>Giá trị</th><th>Đã dùng</th><th>Hết hạn</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {coupons.map(c => (
              <tr key={c.code}>
                <td style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '.05em' }}>{c.code}</td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.type}</td>
                <td style={{ fontFamily: 'var(--font-serif)' }}>{c.value}</td>
                <td style={{ fontSize: 12 }}>{c.uses} / {c.limit}</td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.expires}</td>
                <td><span className={`status-pill ${c.active ? 'delivered' : 'cancelled'}`}>{c.active ? 'Hoạt động' : 'Hết hạn'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ── Settings Tab ── */
function SettingsTab({ showToast }) {
  return (
    <>
      <h1 className="admin-page-title">Cài đặt</h1>
      <p className="admin-page-sub">Quản lý cấu hình website</p>
      <div className="row g-4">
        {[
          { title: 'Thông tin cửa hàng', fields: ['Tên cửa hàng', 'Email', 'Số điện thoại', 'Địa chỉ'] },
          { title: 'Cài đặt vận chuyển', fields: ['Phí vận chuyển mặc định', 'Ngưỡng miễn phí ship', 'Thời gian giao hàng'] },
        ].map(section => (
          <div key={section.title} className="col-md-6">
            <div className="admin-table-card">
              <div className="admin-table-title mb-3">{section.title}</div>
              {section.fields.map(f => (
                <div key={f} className="mb-3">
                  <label style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{f}</label>
                  <input style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 14px', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none' }} placeholder={f} />
                </div>
              ))}
              <button className="btn-lyra" onClick={() => showToast('Đã lưu cài đặt!', 'bi-check-circle')}>Lưu</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
