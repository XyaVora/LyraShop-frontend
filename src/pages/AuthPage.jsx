// src/pages/AuthPage.jsx
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';

export default function AuthPage() {
  const { navigate, login, register, authLoading } = useApp();
  const { showToast } = useCart();
  const [mode, setMode]         = useState('login'); // login | register
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      showToast('Vui lòng điền đầy đủ email và mật khẩu', 'bi-exclamation-circle');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        showToast('Vui lòng nhập họ và tên', 'bi-exclamation-circle');
        return;
      }
      if (password.length < 12) {
        showToast('Mật khẩu tối thiểu 12 ký tự theo yêu cầu hệ thống', 'bi-exclamation-circle');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        showToast('Đăng nhập thành công! Chào mừng bạn trở lại.', 'bi-person-check');
      } else {
        await register(name.trim(), email.trim(), password);
        showToast('Đăng ký thành công! Chào mừng bạn đến với LYRA.', 'bi-person-check');
      }
      navigate('home');
    } catch (err) {
      showToast(err.message || 'Thao tác thất bại, vui lòng kiểm tra lại thông tin', 'bi-x-circle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Visual */}
      <div className="auth-visual">
        <div className="auth-visual-logo">LYRA</div>
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
            {mode === 'login' ? 'Chào mừng bạn trở lại với LYRA' : 'Tạo tài khoản mới và khám phá thời trang'}
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

          <label className="form-field-label">
            Mật khẩu {mode === 'register' && <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>(tối thiểu 12 ký tự)</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <input className="form-field-input" type={showPass ? 'text' : 'password'}
              placeholder={mode === 'register' ? 'Nhập mật khẩu (tối thiểu 12 ký tự)...' : 'Nhập mật khẩu...'}
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ paddingRight: 44 }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16 }}>
              <i className={`bi ${showPass ? '-slash' : ''}`} />
            </button>
          </div>

          {mode === 'login' && (
            <div className="d-flex justify-content-end mb-3">
              <span className="forgot-link" onClick={() => showToast('Chức năng khôi phục đang phát triển', 'bi-info-circle')}>
                Quên mật khẩu?
              </span>
            </div>
          )}

          {mode === 'register' && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Bằng cách đăng ký, bạn đồng ý với{' '}
              <span style={{ color: 'var(--ink)', cursor: 'pointer', textDecoration: 'underline' }}>Điều khoản dịch vụ</span>{' '}và{' '}
              <span style={{ color: 'var(--ink)', cursor: 'pointer', textDecoration: 'underline' }}>Chính sách bảo mật</span> của LYRA.
            </div>
          )}

          <button
            className="btn-lyra w-100 justify-content-center py-3"
            onClick={handleSubmit}
            disabled={submitting || authLoading}
          >
            {submitting ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <i className="bi bi-arrow-right" />
          </button>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
            {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
            <span style={{ color: 'var(--ink)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
            </span>
          </div>

          <button className="btn-outline-lyra w-100 justify-content-center mt-4"
            onClick={() => navigate('home')}>
            <i className="bi bi-arrow-left" /> Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
