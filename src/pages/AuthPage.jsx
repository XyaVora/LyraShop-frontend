// src/pages/AuthPage.jsx — Đăng nhập / Đăng ký LYRA
// Hợp đồng: spec.md §2 (login/register/next) + pages.md § AuthPage.
import { useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { Pic } from '../components/index.jsx';
import { PAGES, buildUrl, parseLocation } from '../router.js';
import { FREE_SHIPPING_THRESHOLD, fmt, img } from '../data/products';
import { BRAND } from '../data/brand';
import '../styles/auth.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const MIN_PASSWORD = 6;

/* Ảnh cột hình — danh sách ảnh đã kiểm tra (images.md, mục "Auth visual"). */
const VISUAL_IMG = img('1524504388940-b1c1722653e1', 1600);

/* Tài khoản demo (chế độ offline của AppContext). */
const DEMO_ACCOUNTS = [
  { id: 'customer', label: 'Khách hàng', name: 'Khách hàng LYRA', email: 'khachhang@lyra.vn', password: 'lyra2026' },
];

const PERKS = [
  { icon: 'bi-truck', text: `Miễn phí giao hàng cho đơn từ ${fmt(FREE_SHIPPING_THRESHOLD)}` },
  { icon: 'bi-arrow-repeat', text: 'Đổi trả trong 30 ngày, không cần lý do' },
  { icon: 'bi-gift', text: 'Ưu đãi và bộ sưu tập ra mắt sớm cho thành viên' },
];

/** Chuyển `params.next` ('/profile', 'wishlist'…) thành { page, params }. */
function resolveNext(raw) {
  const fallback = { page: 'home', params: {} };
  const value = String(raw || '').trim();
  if (!value) return fallback;

  let target = fallback;
  if (value.startsWith('/')) {
    const i = value.indexOf('?');
    const parsed = parseLocation({
      pathname: i === -1 ? value : value.slice(0, i),
      search: i === -1 ? '' : value.slice(i),
    });
    target = { page: parsed.page, params: parsed.params || {} };
  } else if (PAGES.includes(value)) {
    target = { page: value, params: {} };
  }

  // Không bao giờ quay lại chính trang đăng nhập hoặc trang lỗi.
  if (target.page === 'auth' || target.page === '404') return fallback;
  return target;
}

export default function AuthPage() {
  const { navigate, params, login, register, logout, user, isLoggedIn } = useApp();
  const { showToast } = useCart();

  const mode = params.mode === 'register' ? 'register' : 'login';
  const isRegister = mode === 'register';
  const nextTarget = useMemo(() => resolveNext(params.next), [params.next]);

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passRef = useRef(null);

  const setField = (field) => (e) => {
    const { value } = e.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
    if (formError) setFormError('');
  };

  /** Đổi giữa Đăng nhập / Đăng ký — giữ URL đồng bộ (?mode=…&next=…). */
  const switchMode = (next) => {
    if (next === mode) return;
    setErrors({});
    setFormError('');
    navigate('auth', {
      mode: next === 'register' ? 'register' : undefined,
      next: params.next,
      replace: true,
      keepScroll: true,
    });
  };

  /** Kiểm tra dữ liệu; trả về object lỗi rỗng nếu hợp lệ. */
  const validate = () => {
    const next = {};
    if (isRegister && !values.name.trim()) next.name = 'Vui lòng nhập họ và tên.';
    const mail = values.email.trim();
    if (!mail) next.email = 'Vui lòng nhập địa chỉ email.';
    else if (!EMAIL_RE.test(mail)) next.email = 'Địa chỉ email chưa đúng định dạng.';
    if (!values.password) next.password = 'Vui lòng nhập mật khẩu.';
    else if (values.password.length < MIN_PASSWORD) {
      next.password = `Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự.`;
    }
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError('');
      if (found.name) nameRef.current?.focus();
      else if (found.email) emailRef.current?.focus();
      else passRef.current?.focus();
      showToast('Vui lòng kiểm tra lại thông tin đã nhập.', 'bi-exclamation-circle');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (isRegister) await register(values.name.trim(), values.email.trim(), values.password);
      else await login(values.email.trim(), values.password);

      showToast(
        isRegister
          ? 'Tạo tài khoản thành công. Chào mừng bạn đến với LYRA.'
          : 'Đăng nhập thành công. Chào mừng bạn trở lại.',
        'bi-person-check',
      );
      navigate(nextTarget.page, { ...nextTarget.params, replace: true });
    } catch (err) {
      const msg = err?.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.';
      setFormError(msg);
      showToast(msg, 'bi-exclamation-circle');
      passRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  /** Điền nhanh tài khoản demo. */
  const fillDemo = (account) => {
    setValues({
      name: isRegister ? account.name : '',
      email: account.email,
      password: account.password,
    });
    setErrors({});
    setFormError('');
    showToast(`Đã điền tài khoản demo ${account.label.toLowerCase()}.`, 'bi-magic');
    passRef.current?.focus();
  };

  const handleForgot = () => {
    const mail = values.email.trim();
    if (!EMAIL_RE.test(mail)) {
      setErrors((prev) => ({ ...prev, email: 'Nhập email hợp lệ để nhận hướng dẫn khôi phục.' }));
      emailRef.current?.focus();
      showToast('Vui lòng nhập email trước khi khôi phục mật khẩu.', 'bi-exclamation-circle');
      return;
    }
    showToast(
      'Bản demo chưa gửi được email thật. Bạn có thể đăng nhập với mật khẩu từ 6 ký tự.',
      'bi-envelope',
    );
  };

  const soon = (label) => showToast(`Trang "${label}" đang được phát triển.`, 'bi-tools');

  const goHome = (e) => {
    e.preventDefault();
    navigate('home');
  };

  const visual = (
    <div className="auth-visual">
      <Pic src={VISUAL_IMG} alt="" ratio="auto" tint="#2A2622" icon="bi-bag" eager />
      <div className="eyebrow on-ink">{BRAND.season}</div>
      <div className="auth-visual-logo">LYRA</div>
      <p className="auth-visual-sub">
        Phong cách định nghĩa bạn. Đăng nhập để lưu sản phẩm yêu thích, theo dõi đơn hàng và nhận
        ưu đãi dành riêng cho thành viên.
      </p>
      <ul className="auth-visual-perks">
        {PERKS.map((p) => (
          <li key={p.text}>
            <i className={`bi ${p.icon}`} aria-hidden="true" />
            <span>{p.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  /* Đã đăng nhập mà vẫn mở /auth → không hiện form, đưa lối đi tiếp. */
  if (isLoggedIn) {
    return (
      <section className="auth-layout">
        {visual}
        <div className="auth-form-col">
          <div className="auth-form-wrap">
            <div className="eyebrow">Tài khoản LYRA</div>
            <h1 className="auth-title">
              Bạn đang <em>đăng nhập</em>
            </h1>
            <p className="auth-subtitle">
              {user?.name} · {user?.email}
            </p>
            <div className="auth-actions-stack">
              <button
                type="button"
                className="btn-lyra btn-block"
                onClick={() => navigate(nextTarget.page === 'home' ? 'profile' : nextTarget.page, nextTarget.params)}
              >
                {nextTarget.page === 'home' ? 'Vào trang tài khoản' : 'Tiếp tục'}
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
              <a className="btn-outline-lyra btn-block" href={buildUrl('home')} onClick={goHome}>
                Về trang chủ
              </a>
              <button
                type="button"
                className="forgot-link auth-signout"
                onClick={() => {
                  logout();
                  showToast('Bạn đã đăng xuất khỏi LYRA.', 'bi-box-arrow-right');
                }}
              >
                Đăng xuất khỏi tài khoản này
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-layout">
      {visual}

      <div className="auth-form-col">
        <div className="auth-form-wrap">
          <div className="eyebrow">Tài khoản LYRA</div>
          <h1 className="auth-title">
            {isRegister ? (
              <>Tạo tài khoản <em>mới</em></>
            ) : (
              <>Chào mừng <em>trở lại</em></>
            )}
          </h1>
          <p className="auth-subtitle">
            {isRegister
              ? 'Vài thông tin ngắn gọn để bắt đầu cùng LYRA.'
              : 'Đăng nhập để tiếp tục hành trình phong cách của bạn.'}
          </p>

          {/* Chuyển chế độ */}
          <div className="auth-toggle" role="group" aria-label="Chọn đăng nhập hoặc đăng ký">
            <button
              type="button"
              className={`auth-toggle-btn${!isRegister ? ' active' : ''}`}
              aria-pressed={!isRegister}
              onClick={() => switchMode('login')}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`auth-toggle-btn${isRegister ? ' active' : ''}`}
              aria-pressed={isRegister}
              onClick={() => switchMode('register')}
            >
              Đăng ký
            </button>
          </div>

          {/* Hộp tài khoản demo */}
          <div className="demo-hint auth-demo">
            <strong className="auth-demo-title">Tài khoản demo</strong>
            <p className="auth-demo-text">
              Khi chưa kết nối backend, dùng <code>khachhang@lyra.vn</code> / <code>lyra2026</code>
              hoặc bất kỳ email hợp lệ nào với mật khẩu từ {MIN_PASSWORD} ký tự.
            </p>
            <div className="auth-demo-actions">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  className="auth-demo-fill"
                  onClick={() => fillDemo(acc)}
                >
                  <i className="bi bi-magic" aria-hidden="true" /> Điền nhanh · {acc.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <div className="auth-field">
                <label className="form-field-label" htmlFor="auth-name">Họ và tên</label>
                <input
                  id="auth-name"
                  ref={nameRef}
                  className={`form-field-input${errors.name ? ' invalid' : ''}`}
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Nguyễn Văn An"
                  value={values.name}
                  onChange={setField('name')}
                  aria-invalid={errors.name ? 'true' : undefined}
                  aria-describedby={errors.name ? 'auth-name-error' : undefined}
                  disabled={submitting}
                />
                {errors.name && (
                  <span className="field-error" id="auth-name-error">{errors.name}</span>
                )}
              </div>
            )}

            <div className="auth-field">
              <label className="form-field-label" htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                ref={emailRef}
                className={`form-field-input${errors.email ? ' invalid' : ''}`}
                type="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                placeholder="ban@email.com"
                value={values.email}
                onChange={setField('email')}
                aria-invalid={errors.email ? 'true' : undefined}
                aria-describedby={errors.email ? 'auth-email-error' : undefined}
                disabled={submitting}
              />
              {errors.email && (
                <span className="field-error" id="auth-email-error">{errors.email}</span>
              )}
            </div>

            <div className="auth-field">
              <label className="form-field-label" htmlFor="auth-password">Mật khẩu</label>
              <div className="password-wrap">
                <input
                  id="auth-password"
                  ref={passRef}
                  className={`form-field-input${errors.password ? ' invalid' : ''}`}
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder={`Ít nhất ${MIN_PASSWORD} ký tự`}
                  value={values.password}
                  onChange={setField('password')}
                  aria-invalid={errors.password ? 'true' : undefined}
                  aria-describedby={errors.password ? 'auth-password-error' : undefined}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPass}
                  onClick={() => setShowPass((v) => !v)}
                >
                  <i className={`bi bi-eye${showPass ? '-slash' : ''}`} aria-hidden="true" />
                </button>
              </div>
              {errors.password && (
                <span className="field-error" id="auth-password-error">{errors.password}</span>
              )}
            </div>

            {!isRegister && (
              <div className="auth-forgot-row">
                <button type="button" className="forgot-link" onClick={handleForgot}>
                  Quên mật khẩu?
                </button>
              </div>
            )}

            {isRegister && (
              <p className="auth-terms">
                Khi tạo tài khoản, bạn đồng ý với{' '}
                <button type="button" className="auth-inline-link" onClick={() => soon('Điều khoản dịch vụ')}>
                  Điều khoản dịch vụ
                </button>{' '}
                và{' '}
                <button type="button" className="auth-inline-link" onClick={() => soon('Chính sách bảo mật')}>
                  Chính sách bảo mật
                </button>{' '}
                của LYRA.
              </p>
            )}

            {formError && (
              <p className="auth-alert" role="alert">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                <span>{formError}</span>
              </p>
            )}

            <button type="submit" className="btn-lyra btn-block auth-submit" disabled={submitting}>
              {submitting ? (
                <>
                  <i className="bi bi-arrow-repeat auth-spin" aria-hidden="true" /> Đang xử lý…
                </>
              ) : (
                <>
                  {isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <div className="auth-divider">hoặc tiếp tục với</div>

          <div className="social-auth">
            <button type="button" className="social-auth-btn" onClick={() => soon('Đăng nhập Google')}>
              <i className="bi bi-google" aria-hidden="true" /> Google
            </button>
            <button type="button" className="social-auth-btn" onClick={() => soon('Đăng nhập Facebook')}>
              <i className="bi bi-facebook" aria-hidden="true" /> Facebook
            </button>
          </div>

          <p className="auth-switch">
            {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
            <button
              type="button"
              className="auth-inline-link"
              onClick={() => switchMode(isRegister ? 'login' : 'register')}
            >
              {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
            </button>
          </p>

          <a className="btn-outline-lyra btn-block auth-back" href={buildUrl('home')} onClick={goHome}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> Về trang chủ
          </a>
        </div>
      </div>
    </section>
  );
}
