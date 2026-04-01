// src/pages/AuthPage.jsx
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';

export default function AuthPage() {
  const { navigate, login } = useApp();
  const { showToast } = useCart();
  const [mode, setMode]       = useState('login'); // login | register
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]       = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = () => {
    if (!email || !password) { showToast('Vui lòng điền đầy đủ thông tin', 'bi-exclamation-circle'); return; }
    login(email, password);
    showToast(mode === 'login' ? 'Đăng nhập thành công! Chào mừng bạn trở lại.' : 'Đăng ký thành công! Chào mừng bạn đến với MAISON.', 'bi-person-check');
    navigate('home');
  };

  return (
    <div className="auth-layout">
      {/* Visual */}
      <div className="auth-visual">
        <div className="auth-visual-logo">MAISON</div>
        <p className="auth-visual-sub">Phong cách định nghĩa bạn. Khám phá bộ sưu tập thời trang cao cấp độc quyền.</p>
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 280 }}>
          {[
            { icon: 'bi-truck', text: 'Miễn phí giao hàng toàn quốc' },
            { icon: 'bi-arrow-repeat', text: 'Đổi trả dễ dàng trong 30 ngày' },
            { icon: 'bi-gift', text: 'Ưu đãi độc quyền cho thành viên' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, opacity: .8 }}>
              <i className={`bi ${icon}`} style={{ fontSize: 16 }} />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="auth-form-col">
        <div className="auth-form-wrap">
          <h2 className="auth-title">{mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</h2>
          <p className="auth-subtitle">
            {mode === 'login' ? 'Chào mừng bạn trở lại với MAISON' : 'Tạo tài khoản mới và khám phá thời trang'}
          </p>

          {/* Toggle */}
          <div className="auth-toggle mb-4">
            <button className={`auth-toggle-btn${mode === 'login' ? ' active' : ''}`} onClick={() => setMode('login')}>Đăng nhập</button>
            <button className={`auth-toggle-btn${mode === 'register' ? ' active' : ''}`} onClick={() => setMode('register')}>Đăng ký</button>
          </div>

          {/* Social */}
          <div className="social-auth">
            <button className="social-auth-btn" onClick={() => showToast('Chức năng đang phát triển', 'bi-info-circle')}>
              <i className="bi bi-google" /> Google
            </button>
            <button className="social-auth-btn" onClick={() => showToast('Chức năng đang phát triển', 'bi-info-circle')}>
              <i className="bi bi-facebook" /> Facebook
            </button>
          </div>

          <div className="auth-divider">hoặc</div>

          {mode === 'register' && (
            <>
              <label className="form-field-label">Họ và tên</label>
              <input className="form-field-input" type="text" placeholder="Nguyễn Văn An"
                value={name} onChange={e => setName(e.target.value)} />
            </>
          )}

          <label className="form-field-label">Email</label>
          <input className="form-field-input" type="email" placeholder="email@example.com"
            value={email} onChange={e => setEmail(e.target.value)} />

          <label className="form-field-label">Mật khẩu</label>
          <div style={{ position: 'relative' }}>
            <input className="form-field-input" type={showPass ? 'text' : 'password'}
              placeholder="Nhập mật khẩu..."
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ paddingRight: 44 }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16 }}>
              <i className={`bi bi-eye${showPass ? '-slash' : ''}`} />
            </button>
          </div>

          {mode === 'login' && (
            <div className="d-flex justify-content-end mb-3">
              <span className="forgot-link" onClick={() => showToast('Email khôi phục đã được gửi!', 'bi-envelope')}>
                Quên mật khẩu?
              </span>
            </div>
          )}

          {mode === 'register' && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Bằng cách đăng ký, bạn đồng ý với{' '}
              <span style={{ color: 'var(--ink)', cursor: 'pointer', textDecoration: 'underline' }}>Điều khoản dịch vụ</span>{' '}và{' '}
              <span style={{ color: 'var(--ink)', cursor: 'pointer', textDecoration: 'underline' }}>Chính sách bảo mật</span> của MAISON.
            </div>
          )}

          <button className="btn-maison w-100 justify-content-center py-3" onClick={handleSubmit}>
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <i className="bi bi-arrow-right" />
          </button>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
            {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
            <span style={{ color: 'var(--ink)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
            </span>
          </div>

          <button className="btn-outline-maison w-100 justify-content-center mt-4"
            onClick={() => navigate('home')}>
            <i className="bi bi-arrow-left" /> Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
