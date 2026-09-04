// src/pages/AdminPage.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { productApi, categoryApi, adminApi, extractErrorMessage } from '../services/api';
import { normalizeProduct, normalizeCategory, fmt } from '../data/products';

const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard',        icon: 'bi-grid' },
  { id: 'products',  label: 'Sản phẩm',         icon: 'bi-box' },
  { id: 'categories',label: 'Danh mục',         icon: 'bi-folder' },
];

export default function AdminPage() {
  const { navigate, logout } = useApp();
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
        <a className="admin-nav-item" onClick={async () => {
          await logout();
          showToast('Đã đăng xuất', 'bi-door-open');
          navigate('home');
        }}>
          <i className="bi bi-box-arrow-right" /> Đăng xuất
        </a>
      </aside>

      {/* Main */}
      <main className="admin-main">
        {activeTab === 'dashboard' && <DashboardTab setActiveTab={setActiveTab} />}
        {activeTab === 'products'  && <ProductsTab showToast={showToast} />}
        {activeTab === 'categories'&& <CategoriesTab showToast={showToast} />}
      </main>
    </div>
  );
}

/* ── Dashboard ── */
function DashboardTab({ setActiveTab }) {
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);

  useEffect(() => {
    productApi.list({ size: 1 }).then(r => setTotalProducts(r.data?.totalElements || 0)).catch(() => {});
    categoryApi.list().then(r => setTotalCategories(r.data?.length || 0)).catch(() => {});
  }, []);

  return (
    <>
      <div>
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-sub">Tổng quan hệ thống LyraShop</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="d-flex justify-content-between align-items-start">
            <div className="stat-label">Tổng sản phẩm</div>
            <i className="bi bi-box" style={{ fontSize: 20, color: 'var(--warm)', opacity: .6 }} />
          </div>
          <div className="stat-value">{totalProducts}</div>
        </div>

        <div className="stat-card">
          <div className="d-flex justify-content-between align-items-start">
            <div className="stat-label">Tổng danh mục</div>
            <i className="bi bi-folder" style={{ fontSize: 20, color: 'var(--warm)', opacity: .6 }} />
          </div>
          <div className="stat-value">{totalCategories}</div>
        </div>
      </div>
    </>
  );
}

/* ── Products Tab ── */
function ProductsTab({ showToast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '', basePrice: '', categoryId: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = () => {
    setLoading(true);
    productApi.list({ size: 50, sort: 'createdAt,desc' })
      .then(r => {
        const list = (r.data?.content || []).map((p, idx) => normalizeProduct(p, idx));
        setProducts(list);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
    categoryApi.list().then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.basePrice || !form.categoryId) {
      showToast('Vui lòng điền đủ các trường bắt buộc', 'bi-exclamation-circle');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.createProduct({
        name: form.name,
        slug: form.slug,
        description: form.description,
        basePrice: parseFloat(form.basePrice),
        categoryId: parseInt(form.categoryId, 10),
      });
      showToast('Đã thêm sản phẩm thành công', 'bi-check-circle');
      setShowAddModal(false);
      setForm({ name: '', slug: '', description: '', basePrice: '', categoryId: '' });
      fetchProducts();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Lỗi khi tạo sản phẩm'), 'bi-x-circle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Bạn có chắc muốn ẩn sản phẩm này không?')) return;
    try {
      await adminApi.deactivateProduct(id);
      showToast('Đã cập nhật trạng thái sản phẩm', 'bi-check-circle');
      fetchProducts();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Lỗi khi hủy kích hoạt'), 'bi-x-circle');
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="admin-page-title">Sản phẩm</h1>
          <p className="admin-page-sub">{products.length} sản phẩm</p>
        </div>
        <button className="btn-lyra" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-plus" /> Thêm sản phẩm
        </button>
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Đang tải...</div>
        ) : products.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Chưa có sản phẩm nào</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sản phẩm</th><th>Slug</th><th>Giá gốc</th><th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 44, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`bi ${p.icon}`} style={{ fontSize: 14, color: 'rgba(14,14,14,.25)' }} />
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{p.slug}</td>
                  <td style={{ fontFamily: 'var(--font-serif)' }}>{fmt(p.basePrice || p.price)}</td>
                  <td>
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 13 }}
                      onClick={() => handleDeactivate(p.id)}
                      title="Vô hiệu hóa"
                    >
                      <i className="bi bi-trash" /> Ẩn
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1200,
          background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{ background: '#fff', maxWidth: 500, width: '100%', padding: 28 }}>
            <h3 style={{ marginBottom: 20 }}>Thêm sản phẩm mới</h3>
            <form onSubmit={handleCreate}>
              <label className="form-field-label">Tên sản phẩm *</label>
              <input className="form-field-input" required value={form.name} onChange={e => {
                const name = e.target.value;
                const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                setForm(prev => ({ ...prev, name, slug: prev.slug || slug }));
              }} />

              <label className="form-field-label">Slug *</label>
              <input className="form-field-input" required value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />

              <label className="form-field-label">Giá gốc (VNĐ) *</label>
              <input className="form-field-input" type="number" required value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} />

              <label className="form-field-label">Danh mục *</label>
              <select className="form-field-input" required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">-- Chọn danh mục --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <label className="form-field-label">Mô tả</label>
              <textarea className="form-field-input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button type="button" className="btn-outline-lyra" onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className="btn-lyra" disabled={submitting}>
                  {submitting ? 'Đang tạo...' : 'Lưu sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Categories Tab ── */
function CategoriesTab({ showToast }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = () => {
    setLoading(true);
    categoryApi.list()
      .then(r => setCategories(r.data || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !slug) {
      showToast('Vui lòng nhập tên và slug danh mục', 'bi-exclamation-circle');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.createCategory({ name, slug, description });
      showToast('Tạo danh mục thành công', 'bi-check-circle');
      setName(''); setSlug(''); setDescription('');
      fetchCategories();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Lỗi khi tạo danh mục'), 'bi-x-circle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-4">
        <h1 className="admin-page-title">Danh mục</h1>
        <p className="admin-page-sub">Quản lý danh mục sản phẩm</p>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <div style={{ border: '1px solid var(--border)', background: '#fff', padding: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Thêm danh mục</h3>
            <form onSubmit={handleCreate}>
              <label className="form-field-label">Tên danh mục *</label>
              <input className="form-field-input" required value={name} onChange={e => {
                const n = e.target.value;
                const s = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                setName(n);
                setSlug(s);
              }} />

              <label className="form-field-label">Slug *</label>
              <input className="form-field-input" required value={slug} onChange={e => setSlug(e.target.value)} />

              <label className="form-field-label">Mô tả</label>
              <textarea className="form-field-input" rows={3} value={description} onChange={e => setDescription(e.target.value)} />

              <button type="submit" className="btn-lyra w-100 justify-content-center mt-3" disabled={submitting}>
                {submitting ? 'Đang tạo...' : 'Tạo danh mục'}
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="admin-table-card">
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Đang tải...</div>
            ) : categories.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Chưa có danh mục nào</div>
            ) : (
              <table className="admin-table">
                <thead><tr><th>Tên danh mục</th><th>Slug</th><th>Mô tả</th></tr></thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.slug}</td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
