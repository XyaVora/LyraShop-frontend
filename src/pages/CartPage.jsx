// src/pages/CartPage.jsx — Giỏ hàng + Thanh toán + Đặt hàng thành công.
// Trang này phục vụ CẢ hai route: currentPage === 'cart' và 'checkout'
// (App.jsx định tuyến cả hai vào đây). KHÔNG giữ state `view` cục bộ cho việc
// chuyển màn — màn hiển thị suy ra từ `currentPage`; chỉ màn "đặt hàng thành
// công" là state cục bộ (`placedOrder`) vì nó là kết quả của một hành động.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import {
  COUPONS,
  FREE_SHIPPING_THRESHOLD,
  PRODUCTS,
  findProduct,
  fmt,
  relatedProducts,
} from '../data/products';
import {
  EmptyState,
  Footer,
  Pic,
  ProductCard,
  Reveal,
  SectionHeader,
  isModifiedClick,
} from '../components/index.jsx';
import { buildUrl } from '../router.js';
import { isEmail, isPhone, normPhone } from '../utils/validate.js';
import '../styles/cart.css';

/* ══════════════════════════════════════════════════════════════════
   HẰNG SỐ (ngoài component — không dựng lại mỗi lần render)
   ══════════════════════════════════════════════════════════════════ */

const LAST_ADDRESS_KEY = 'lyra_last_address';
/** Sổ địa chỉ & hồ sơ mở rộng do trang Tài khoản ghi — Thanh toán đọc lại. */
const ADDRESS_BOOK_KEY = 'lyra_addresses';
const PROFILE_EXTRA_KEY = 'lyra_profile_extra';

/** Khối "Đã xoá — Hoàn tác" sống ít nhất chừng này trước khi bị dọn. */
const UNDO_MS = 10000;

/** Quận/huyện theo tỉnh — khớp với địa chỉ trong ORDERS_MOCK. */
const DISTRICTS_BY_CITY = {
  'Hà Nội': ['Hoàn Kiếm', 'Ba Đình', 'Đống Đa', 'Hai Bà Trưng', 'Cầu Giấy', 'Tây Hồ'],
  'TP. Hồ Chí Minh': ['Quận 1', 'Quận 3', 'Quận 7', 'Bình Thạnh', 'Phú Nhuận', 'Thủ Đức'],
  'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu'],
  'Cần Thơ': ['Ninh Kiều', 'Bình Thuỷ', 'Cái Răng', 'Ô Môn'],
  'Hải Phòng': ['Hồng Bàng', 'Lê Chân', 'Ngô Quyền', 'Hải An', 'Kiến An'],
};
const CITIES = Object.keys(DISTRICTS_BY_CITY);

const PAY_OPTIONS = [
  { id: 'cod', label: 'Thanh toán khi nhận hàng (COD)', icon: 'bi-cash-coin' },
  { id: 'banking', label: 'Chuyển khoản ngân hàng', icon: 'bi-bank' },
  { id: 'momo', label: 'Ví MoMo', icon: 'bi-phone' },
  { id: 'vnpay', label: 'VNPay QR', icon: 'bi-qr-code' },
];
const payLabel = (id) => PAY_OPTIONS.find((o) => o.id === id)?.label || 'Thanh toán khi nhận hàng (COD)';

/** Thứ tự để đưa focus về ô sai đầu tiên. */
const FIELD_ORDER = ['firstName', 'lastName', 'email', 'phone', 'city', 'district', 'street'];

/** Mã giảm giá gợi ý — lấy từ bảng COUPONS thật, không bịa. */
const COUPON_HINTS = Object.entries(COUPONS).map(([code, c]) => ({ code, ...c }));

const CHECKOUT_STEPS = [
  { n: 1, label: 'Giỏ hàng' },
  { n: 2, label: 'Giao hàng & thanh toán' },
  { n: 3, label: 'Xác nhận' },
];

/* ══════════════════════════════════════════════════════════════════
   TIỆN ÍCH
   ══════════════════════════════════════════════════════════════════ */

const safeRead = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};
const safeWrite = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* bỏ qua */ }
};
/** Như safeRead nhưng chấp nhận cả mảng (sổ địa chỉ được lưu dạng mảng). */
const safeReadList = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x === 'object') : [];
  } catch {
    return [];
  }
};

/** Địa chỉ mặc định trong sổ địa chỉ của trang Tài khoản (nếu có). */
function defaultAddress() {
  const book = safeReadList(ADDRESS_BOOK_KEY);
  return book.find((a) => a.isDefault) || book[0] || null;
}

/** Số điện thoại người dùng đã lưu ở tab Thông tin cá nhân. */
function profilePhone(user) {
  const all = safeRead(PROFILE_EXTRA_KEY) || {};
  const mine = all[user?.id || user?.email || 'guest'];
  return (mine && typeof mine === 'object' && mine.phone) || '';
}

/** "Nguyễn Thu Hà" → { firstName: 'Nguyễn Thu', lastName: 'Hà' } */
function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: '', lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

/**
 * Giá trị khởi tạo form. Thứ tự ưu tiên:
 *   1. Địa chỉ MẶC ĐỊNH trong sổ địa chỉ (`lyra_addresses` — trang Tài khoản),
 *   2. Địa chỉ của đơn gần nhất (`lyra_last_address`),
 *   3. Số điện thoại trong hồ sơ (`lyra_profile_extra`) + thông tin tài khoản.
 * Tỉnh/quận trong sổ địa chỉ là chữ tự do nên chỉ nhận khi KHỚP CẢ CẶP với
 * danh mục tĩnh — không bao giờ ghép đường của tỉnh này với quận của tỉnh khác.
 */
function initialForm(user) {
  const saved = safeRead(LAST_ADDRESS_KEY) || {};
  const raw = defaultAddress();
  // Chỉ tin bản ghi có cặp tỉnh/quận hợp lệ; nếu lệch thì bỏ luôn cả street.
  const book = raw && CITIES.includes(raw.city) && DISTRICTS_BY_CITY[raw.city].includes(raw.district)
    ? raw
    : null;

  const fromUser = splitName(user?.name);
  const fromBook = splitName(book?.fullName);

  const city = [book?.city, saved.city].find((c) => CITIES.includes(c)) || CITIES[0];
  const districts = DISTRICTS_BY_CITY[city];
  const district = [book?.city === city ? book?.district : null, saved.district]
    .find((d) => districts.includes(d)) || districts[0];

  return {
    firstName: book?.fullName ? fromBook.firstName : (saved.firstName || fromUser.firstName || ''),
    lastName: book?.fullName ? fromBook.lastName : (saved.lastName || fromUser.lastName || ''),
    email: saved.email || user?.email || '',
    phone: normPhone(book?.phone || saved.phone || profilePhone(user)),
    city,
    district,
    street: book?.street || saved.street || '',
    note: '',
  };
}

/**
 * Ghi địa chỉ vừa dùng vào CẢ hai kho để trang Tài khoản và Thanh toán nhìn
 * thấy cùng một dữ liệu. Trùng (cùng sđt + đường + quận + tỉnh) thì cập nhật
 * bản ghi cũ, không nhân bản; cờ `isDefault` sẵn có được giữ nguyên.
 */
function rememberAddress(address, form) {
  safeWrite(LAST_ADDRESS_KEY, {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: address.email,
    phone: address.phone,
    city: form.city,
    district: form.district,
    street: address.street,
  });

  const list = safeReadList(ADDRESS_BOOK_KEY);
  const same = (a) => normPhone(a.phone) === address.phone
    && String(a.street || '').trim() === address.street
    && a.district === address.district
    && a.city === address.city;

  const entry = {
    fullName: address.fullName,
    phone: address.phone,
    street: address.street,
    district: address.district,
    city: address.city,
  };
  const next = list.some(same)
    ? list.map((a) => (same(a) ? { ...a, ...entry } : a))
    : [...list, {
      ...entry,
      id: list.reduce((max, a) => Math.max(max, Number(a.id) || 0), 0) + 1,
      isDefault: list.length === 0,
    }];
  safeWrite(ADDRESS_BOOK_KEY, next);
}

/** Kiểm tra form, trả về object lỗi (rỗng nghĩa là hợp lệ). */
function validateForm(form) {
  const e = {};
  if (!form.firstName.trim()) e.firstName = 'Vui lòng nhập họ và tên đệm.';
  if (!form.lastName.trim()) e.lastName = 'Vui lòng nhập tên.';
  if (!form.email.trim()) e.email = 'Vui lòng nhập email nhận xác nhận đơn.';
  else if (!isEmail(form.email)) e.email = 'Địa chỉ email chưa hợp lệ.';
  if (!form.phone.trim()) e.phone = 'Vui lòng nhập số điện thoại.';
  else if (!isPhone(form.phone)) {
    e.phone = 'Số điện thoại gồm 10 chữ số bắt đầu bằng 0, hoặc +84 và 9 chữ số.';
  }
  if (!form.city) e.city = 'Vui lòng chọn tỉnh / thành phố.';
  if (!form.district) e.district = 'Vui lòng chọn quận / huyện.';
  if (!form.street.trim()) e.street = 'Vui lòng nhập số nhà, tên đường.';
  return e;
}

/* ══════════════════════════════════════════════════════════════════
   THÀNH PHẦN NHỎ DÙNG LẠI
   ══════════════════════════════════════════════════════════════════ */

/**
 * Thanh tiến trình miễn phí vận chuyển.
 * `done` phải là MỘT nguồn duy nhất với dòng "Phí vận chuyển: Miễn phí" —
 * nếu không, khách vừa đọc "đã miễn phí" vừa bị giục mua thêm khi dùng FREESHIP.
 */
function FreeShipBar({ subtotal, remaining, done, couponCode }) {
  const pct = done
    ? 100
    : Math.max(0, Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100)));
  // Miễn phí nhờ mã chứ chưa đạt ngưỡng → nói rõ lý do cho khách yên tâm.
  const byCoupon = done && subtotal < FREE_SHIPPING_THRESHOLD;
  return (
    <div className={`freeship${done ? ' done' : ''}`}>
      <p className="freeship-text">
        {done ? (
          byCoupon && couponCode ? (
            <>Đơn hàng này đã được <strong>miễn phí vận chuyển</strong> nhờ mã {couponCode}.</>
          ) : (
            <>Đơn hàng này đã được <strong>miễn phí vận chuyển</strong>.</>
          )
        ) : (
          <>Mua thêm <strong>{fmt(remaining)}</strong> để được miễn phí vận chuyển toàn quốc.</>
        )}
      </p>
      <div
        className="freeship-track"
        role="progressbar"
        aria-label="Tiến trình miễn phí vận chuyển"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${pct}%`}
      >
        <div className="freeship-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Chỉ báo bước — 3 bước đúng với số màn thật, tự xuống dòng ở 375px. */
function CheckoutSteps({ current }) {
  return (
    <ol className="checkout-steps cart-steps" aria-label="Tiến trình đặt hàng">
      {CHECKOUT_STEPS.map((s) => {
        const state = current > s.n ? ' done' : current === s.n ? ' active' : '';
        return (
          <li key={s.n} className={`c-step${state}`} aria-current={current === s.n ? 'step' : undefined}>
            <span className="c-step-num">
              {current > s.n ? <i className="bi bi-check" aria-hidden="true" /> : s.n}
            </span>
            <span className="c-step-label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Bộ tăng/giảm số lượng: nút có nhãn kèm tên sản phẩm, ô nhập trực tiếp,
 * và một vùng aria-live đọc số lượng mới sau mỗi thay đổi.
 */
function QtyStepper({ item, updateQty, setQty }) {
  const [draft, setDraft] = useState(String(item.qty));
  useEffect(() => { setDraft(String(item.qty)); }, [item.qty]);

  const maxQty = item.stock || 99;
  const commit = () => {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n) || n < 1) { setDraft(String(item.qty)); return; }
    setQty(item.key, n);
    setDraft(String(Math.min(maxQty, n)));
  };

  return (
    <div className="cart-qty-wrap">
      <div className="cart-qty-ctrl" role="group" aria-label={`Số lượng — ${item.name}`}>
        <button
          type="button"
          className="cart-qty-btn"
          aria-label={`Giảm số lượng ${item.name}`}
          disabled={item.qty <= 1}
          onClick={() => updateQty(item.key, -1)}
        >
          <span aria-hidden="true">−</span>
        </button>
        <input
          className="cart-qty-val"
          type="number"
          inputMode="numeric"
          min={1}
          max={maxQty}
          step={1}
          value={draft}
          aria-label={`Số lượng ${item.name}`}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur(); }
          }}
        />
        <button
          type="button"
          className="cart-qty-btn"
          aria-label={`Tăng số lượng ${item.name}`}
          disabled={item.qty >= maxQty}
          onClick={() => updateQty(item.key, 1)}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <output className="sr-only" aria-live="polite">
        {`${item.name}: ${item.qty} sản phẩm`}
      </output>
      {item.qty >= maxQty && (
        <span className="cart-qty-note">Tối đa {maxQty} sản phẩm</span>
      )}
    </div>
  );
}

/** Ô mã giảm giá: Enter áp dụng, chip mã đang dùng + nút bỏ, gợi ý mã thật. */
function CouponBox({ coupon, applyCoupon, removeCoupon, subtotal }) {
  const [code, setCode] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (applyCoupon(code)) setCode('');
  };
  return (
    <div className="coupon-section">
      <div className="coupon-label" id="coupon-label">Mã giảm giá</div>
      <form className="coupon-row" onSubmit={submit}>
        <label className="sr-only" htmlFor="cart-coupon">Nhập mã giảm giá</label>
        <input
          id="cart-coupon"
          className="coupon-field"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Nhập mã giảm giá…"
          autoComplete="off"
        />
        <button type="submit" className="coupon-apply-btn">Áp dụng</button>
      </form>

      {coupon && (
        <div className="coupon-chip">
          <i className="bi bi-tag" aria-hidden="true" />
          <span>{coupon.code} — {coupon.label}</span>
          <button
            type="button"
            className="coupon-chip-remove"
            aria-label={`Bỏ mã giảm giá ${coupon.code}`}
            onClick={removeCoupon}
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
      )}

      <ul className="coupon-hints">
        {COUPON_HINTS.map((c) => {
          const active = coupon?.code === c.code;
          const locked = subtotal < (c.min || 0);
          return (
            <li key={c.code}>
              <button
                type="button"
                className={`coupon-hint${active ? ' is-active' : ''}`}
                onClick={() => applyCoupon(c.code)}
                disabled={active}
                title={c.label}
              >
                <span className="coupon-hint-code">{c.code}</span>
                <span className="coupon-hint-note">
                  {active ? 'Đang áp dụng' : locked ? `Đơn từ ${fmt(c.min)}` : c.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Các dòng tổng kết dùng chung cho cả giỏ hàng và thanh toán. */
function SummaryLines({ subtotal, shipping, discount, total, coupon, compact = false }) {
  return (
    <div className={compact ? 'summary-block is-compact' : 'summary-block'}>
      <div className="summary-line">
        <span className="s-label">Tạm tính</span>
        <span>{fmt(subtotal)}</span>
      </div>
      <div className="summary-line">
        <span className="s-label">Phí vận chuyển</span>
        <span>{shipping === 0 ? 'Miễn phí' : fmt(shipping)}</span>
      </div>
      {discount > 0 && (
        <div className="summary-line">
          <span className="s-label">Giảm giá{coupon ? ` (${coupon.code})` : ''}</span>
          <span className="summary-discount">−{fmt(discount)}</span>
        </div>
      )}
      <div className="summary-total-line">
        <span className="t-label">Tổng cộng</span>
        <span className="summary-total-val">{fmt(total)}</span>
      </div>
    </div>
  );
}

/** Danh sách sản phẩm rút gọn (cột phải màn thanh toán). */
function OrderMiniCard({ cart, subtotal, shipping, discount, total, coupon }) {
  return (
    <div className="order-mini-card">
      <h2 className="order-mini-heading">Sản phẩm trong đơn ({cart.length})</h2>
      <ul className="order-mini-list">
        {cart.map((item) => (
          <li key={item.key} className="order-mini-row">
            <span className="mini-img">
              <Pic
                as="span"
                src={item.image}
                alt={item.name}
                tint={item.tint}
                icon={item.icon}
                ratio="auto"
              />
            </span>
            <span className="mini-info">
              <span className="mini-name">{item.name}</span>
              <span className="mini-meta">Size {item.size} · {item.variantColor} · ×{item.qty}</span>
            </span>
            <span className="mini-price">{fmt(item.price * item.qty)}</span>
          </li>
        ))}
      </ul>
      <hr className="order-divider" />
      <SummaryLines
        subtotal={subtotal}
        shipping={shipping}
        discount={discount}
        total={total}
        coupon={coupon}
        compact
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MÀN 1 — GIỎ HÀNG
   ══════════════════════════════════════════════════════════════════ */

/**
 * Khối "Đã xoá … [Hoàn tác]" hiện NGAY tại vị trí dòng vừa xoá.
 * Toast vẫn còn nhưng nó nằm cuối DOM và tự tắt, nên người dùng bàn phím
 * không với tới được — khối này mới là đường hoàn tác thật sự.
 */
function UndoNotice({ row, onUndo, onDismiss, undoRef }) {
  return (
    // Không đặt role="status" ở đây: toast đã đọc "Đã xoá …" rồi, thêm một
    // vùng live nữa sẽ khiến trình đọc màn hình nhắc lại hai lần. Ngữ cảnh
    // được đưa vào aria-label của chính nút Hoàn tác.
    <div className="cart-undo">
      <i className="bi bi-trash3 cart-undo-icon" aria-hidden="true" />
      <p className="cart-undo-text">
        Đã xoá <strong>{row.item.name}</strong> khỏi giỏ hàng.
      </p>
      <button
        type="button"
        className="cart-undo-btn"
        ref={undoRef}
        aria-label={`Hoàn tác — khôi phục ${row.item.name} vào giỏ hàng`}
        onClick={onUndo}
      >
        <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Hoàn tác
      </button>
      <button
        type="button"
        className="cart-undo-close"
        aria-label={`Bỏ qua thông báo đã xoá ${row.item.name}`}
        onClick={onDismiss}
      >
        <i className="bi bi-x-lg" aria-hidden="true" />
      </button>
    </div>
  );
}

function CartView() {
  const { navigate } = useApp();
  const ctx = useCart();
  const {
    cart, cartCount, subtotal, shipping, discount, total, freeShipRemaining,
    removeFromCart, updateQty, setQty, addToCart,
    coupon, applyCoupon, removeCoupon, showToast,
  } = ctx;

  // Viết phòng thủ: dùng cờ của context nếu có, nếu không thì suy từ số còn thiếu.
  const freeShip = ctx.freeShipping ?? (freeShipRemaining === 0);

  const empty = cart.length === 0;

  /* ── Hoàn tác xoá dòng hàng ─────────────────────────────────────── */
  const [removedRows, setRemovedRows] = useState([]); // [{ key, item, index, at }]
  const undoRefs = useRef({});
  const removeRefs = useRef({});

  const focusSoon = (get) => {
    requestAnimationFrame(() => { get()?.focus?.(); });
  };

  const dismissUndo = (key) => {
    setRemovedRows((prev) => prev.filter((r) => r.key !== key));
    delete undoRefs.current[key];
  };

  const undoRemove = (row) => {
    const product = findProduct(row.item.productId);
    if (product) {
      addToCart(product, row.item.qty, row.item.size, row.item.variantColor, { openDrawer: false });
      showToast(`Đã khôi phục "${row.item.name}" vào giỏ`, 'bi-arrow-counterclockwise');
    } else {
      showToast('Sản phẩm này không còn trong danh mục.', 'bi-exclamation-circle');
    }
    dismissUndo(row.key);
    focusSoon(() => removeRefs.current[row.key]);
  };

  // Gợi ý: cùng danh mục với món đầu giỏ, bỏ những món đã có trong giỏ.
  const suggestions = useMemo(() => {
    const inCart = new Set(cart.map((i) => String(i.productId)));
    const seed = cart.length ? findProduct(cart[0].productId) : null;
    const pool = seed
      ? relatedProducts(seed, 12)
      : [...PRODUCTS].sort((a, b) => b.sold - a.sold);
    return pool.filter((p) => !inCart.has(String(p.id))).slice(0, 4);
  }, [cart]);

  const goDetail = (e, item) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    navigate('detail', { product: item.slug || item.productId });
  };

  /**
   * Xoá dòng hàng: đặt một khối hoàn tác ngay tại vị trí vừa xoá (nút thật,
   * nằm trong luồng Tab, không tự tắt) và vẫn giữ toast cho người dùng chuột.
   * `byKeyboard` (e.detail === 0) → đưa focus tới nút Hoàn tác thay vì để rơi
   * về body; thao tác chuột thì không đụng tới focus.
   */
  const remove = (item, index, byKeyboard) => {
    removeFromCart(item.key);
    const at = Date.now();
    setRemovedRows((prev) => [
      // Dọn các khối đã sống quá UNDO_MS; khối vừa tạo luôn được giữ lại.
      ...prev.filter((r) => r.key !== item.key && at - r.at < UNDO_MS),
      { key: item.key, item, index, at },
    ]);
    showToast(`Đã xoá "${item.name}" khỏi giỏ`, 'bi-trash3', {
      action: {
        label: 'Hoàn tác',
        onClick: () => {
          const product = findProduct(item.productId);
          if (product) addToCart(product, item.qty, item.size, item.variantColor, { openDrawer: false });
          dismissUndo(item.key);
        },
      },
    });
    if (byKeyboard) focusSoon(() => undoRefs.current[item.key]);
  };

  /** Các khối hoàn tác cần chèn trước dòng thứ `i` (hoặc ở cuối bảng). */
  const undoRowsAt = (i, last = false) => removedRows
    .filter((r) => (last ? r.index >= i : r.index === i))
    .map((r) => (
      <tr key={`undo-${r.key}`} className="cart-undo-line">
        <td className="cart-undo-cell" colSpan={5}>
          <UndoNotice
            row={r}
            onUndo={() => undoRemove(r)}
            onDismiss={() => dismissUndo(r.key)}
            undoRef={(el) => { undoRefs.current[r.key] = el; }}
          />
        </td>
      </tr>
    ));

  return (
    <>
      <div className="cart-layout">
        {/* ── Cột trái: danh sách sản phẩm ─────────────────────────── */}
        <div className="cart-main-col">
          <div className="eyebrow">Bước 1 · Giỏ hàng</div>
          <h1 className="cart-page-title">Giỏ hàng <em>của bạn</em></h1>
          <p className="cart-items-count">
            {empty ? 'Chưa có sản phẩm nào' : `${cartCount} sản phẩm · ${cart.length} dòng hàng`}
          </p>

          {empty ? (
            <>
              {/* Xoá dòng cuối cùng vẫn phải hoàn tác được. */}
              {removedRows.length > 0 && (
                <div className="cart-undo-stack">
                  {removedRows.map((r) => (
                    <UndoNotice
                      key={r.key}
                      row={r}
                      onUndo={() => undoRemove(r)}
                      onDismiss={() => dismissUndo(r.key)}
                      undoRef={(el) => { undoRefs.current[r.key] = el; }}
                    />
                  ))}
                </div>
              )}
              <EmptyState
                icon="bi-bag"
                title="Giỏ hàng đang trống"
                sub="Hãy chọn cho mình một thiết kế LYRA — chúng tôi giữ giỏ hàng lại cho lần ghé sau."
              >
                <button type="button" className="btn-lyra" onClick={() => navigate('shop')}>
                  Khám phá bộ sưu tập
                </button>
                <button type="button" className="btn-outline-lyra" onClick={() => navigate('new')}>
                  Hàng mới về
                </button>
              </EmptyState>
            </>
          ) : (
            <>
              <table className="cart-table" role="table">
                <caption className="sr-only">Danh sách sản phẩm trong giỏ hàng</caption>
                <thead role="rowgroup">
                  <tr role="row">
                    <th role="columnheader" scope="col">Sản phẩm</th>
                    <th role="columnheader" scope="col" className="cart-th-num">Đơn giá</th>
                    <th role="columnheader" scope="col" className="cart-th-qty">Số lượng</th>
                    <th role="columnheader" scope="col" className="cart-th-num">Thành tiền</th>
                    <th role="columnheader" scope="col">
                      <span className="sr-only">Xoá khỏi giỏ</span>
                    </th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {cart.flatMap((item, index) => {
                    const href = buildUrl('detail', { product: item.slug || item.productId });
                    return [
                      ...undoRowsAt(index),
                      <tr key={item.key} role="row" className="cart-line">
                        <td role="cell" className="cart-cell cart-cell-product">
                          <div className="cart-product">
                            <a
                              className="cart-item-img-box"
                              href={href}
                              onClick={(e) => goDetail(e, item)}
                              tabIndex={-1}
                              aria-hidden="true"
                            >
                              <Pic
                                as="span"
                                src={item.image}
                                alt={item.name}
                                tint={item.tint}
                                icon={item.icon}
                                ratio="auto"
                              />
                            </a>
                            <div className="cart-product-info">
                              <a
                                className="cart-item-product-name"
                                href={href}
                                onClick={(e) => goDetail(e, item)}
                              >
                                {item.name}
                              </a>
                              <div className="cart-item-meta">
                                {item.brand} · Size {item.size} · Màu {item.variantColor}
                              </div>
                              {item.stock <= 5 && (
                                <div className="cart-stock-warn">
                                  <i className="bi bi-exclamation-circle" aria-hidden="true" /> Chỉ còn {item.stock} sản phẩm
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td role="cell" className="cart-cell cart-cell-price" data-label="Đơn giá">
                          <span className="item-price">{fmt(item.price)}</span>
                        </td>

                        <td role="cell" className="cart-cell cart-cell-qty" data-label="Số lượng">
                          <QtyStepper item={item} updateQty={updateQty} setQty={setQty} />
                        </td>

                        <td role="cell" className="cart-cell cart-cell-total" data-label="Thành tiền">
                          <span className="item-total">{fmt(item.price * item.qty)}</span>
                        </td>

                        <td role="cell" className="cart-cell cart-cell-remove">
                          <button
                            type="button"
                            className="cart-remove-btn"
                            ref={(el) => { removeRefs.current[item.key] = el; }}
                            aria-label={`Xoá ${item.name} khỏi giỏ hàng`}
                            onClick={(e) => remove(item, index, e.detail === 0)}
                          >
                            <i className="bi bi-x-lg" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>,
                    ];
                  })}
                  {undoRowsAt(cart.length, true)}
                </tbody>
              </table>

              <div className="cart-main-foot">
                <button
                  type="button"
                  className="btn-outline-lyra cart-continue-shopping"
                  onClick={() => navigate('shop')}
                >
                  <span className="cart-continue-arrow" aria-hidden="true">←</span>
                  <span className="cart-continue-label">Tiếp tục mua sắm</span>
                </button>
                <p className="cart-foot-note">
                  Giá đã bao gồm VAT. Đổi trả trong 30 ngày với sản phẩm còn nguyên tem LYRA.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ── Cột phải: tóm tắt ────────────────────────────────────── */}
        <aside className="cart-summary-col" aria-label="Tóm tắt đơn hàng">
          <h2 className="summary-title">Tóm tắt <em>đơn</em></h2>

          {!empty && (
            <FreeShipBar
              subtotal={subtotal}
              remaining={freeShipRemaining}
              done={freeShip}
              couponCode={coupon?.code}
            />
          )}

          <SummaryLines
            subtotal={subtotal}
            shipping={shipping}
            discount={discount}
            total={total}
            coupon={coupon}
          />

          <CouponBox
            coupon={coupon}
            applyCoupon={applyCoupon}
            removeCoupon={removeCoupon}
            subtotal={subtotal}
          />

          <button
            type="button"
            className="btn-warm btn-block"
            disabled={empty}
            aria-describedby={empty ? 'cart-checkout-hint' : undefined}
            onClick={() => navigate('checkout')}
          >
            Tiến hành thanh toán <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
          {empty && (
            <p className="cart-checkout-hint" id="cart-checkout-hint">
              Thêm ít nhất một sản phẩm để tiếp tục thanh toán.
            </p>
          )}

          <div className="payment-methods-row" aria-hidden="true">
            {PAY_OPTIONS.map((m) => (
              <span key={m.id} className="pay-method-tag">{m.id.toUpperCase()}</span>
            ))}
          </div>
          <p className="cart-secure-note">
            <i className="bi bi-shield-lock" aria-hidden="true" /> Thanh toán an toàn, mã hoá SSL
          </p>
        </aside>
      </div>

      {suggestions.length > 0 && (
        <section className="section-sm cart-suggest-section">
          <div className="wrap">
            <SectionHeader
              eyebrow="Gợi ý cho bạn"
              title={<>Có thể bạn <em>thích</em></>}
              link={{ label: 'Xem tất cả', page: 'shop' }}
            />
            <div className="products-grid">
              {suggestions.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MÀN 2 — THANH TOÁN (form controlled + validate inline)
   ══════════════════════════════════════════════════════════════════ */

function CheckoutView({ onPlaced }) {
  const { navigate, user } = useApp();
  const {
    cart, subtotal, shipping, discount, total, coupon,
    clearCart, placeOrder, showToast,
  } = useCart();

  const [form, setForm] = useState(() => initialForm(user));
  const [errors, setErrors] = useState({});
  const [payment, setPayment] = useState('cod');
  const fieldRefs = useRef({});
  /** Ô nào người dùng đã tự tay sửa — tuyệt đối không điền đè lên. */
  const touched = useRef({});
  const seededFor = useRef(user?.id ?? null);

  const districts = DISTRICTS_BY_CITY[form.city] || [];

  // Giỏ rỗng thì không có gì để thanh toán → quay lại /cart.
  useEffect(() => {
    if (cart.length === 0) navigate('cart', { replace: true });
  }, [cart.length, navigate]);

  /* AppContext khôi phục phiên trong useEffect, nên khi vào thẳng /checkout
     (F5, bookmark) thì render ĐẦU TIÊN `user` vẫn là null và component không
     remount sau đó. Điền bù một lần khi phiên xuất hiện — chỉ vào những ô
     người dùng CHƯA chạm và đang còn rỗng, không đè chữ đang gõ. */
  useEffect(() => {
    if (!user || seededFor.current === user.id) return;
    seededFor.current = user.id;
    const seed = initialForm(user);
    setForm((prev) => {
      const next = { ...prev };
      let changed = false;
      ['firstName', 'lastName', 'email', 'phone'].forEach((k) => {
        if (!touched.current[k] && !prev[k] && seed[k]) {
          next[k] = seed[k];
          changed = true;
        }
      });
      return changed ? next : prev; // trả `prev` để không render thừa
    });
  }, [user]);

  const setField = (name, value) => {
    touched.current[name] = true;
    setForm((prev) => (name === 'city'
      ? { ...prev, city: value, district: (DISTRICTS_BY_CITY[value] || [''])[0] }
      : { ...prev, [name]: value }));
    // Xoá lỗi ngay khi người dùng bắt đầu sửa ô đó.
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validateForm(form);
    const firstBad = FIELD_ORDER.find((k) => errs[k]);
    if (firstBad) {
      setErrors(errs);
      fieldRefs.current[firstBad]?.focus();
      showToast('Vui lòng kiểm tra lại thông tin giao hàng.', 'bi-exclamation-circle');
      return;
    }
    setErrors({});

    const address = {
      fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
      phone: normPhone(form.phone),
      email: form.email.trim(),
      street: form.street.trim(),
      district: form.district,
      city: form.city,
    };

    // Mã đơn do placeOrder sinh — KHÔNG bao giờ sinh trong thân render.
    const order = placeOrder({
      items: cart,
      address,
      payment,
      note: form.note.trim(),
      subtotal,
      shipping,
      discount,
      total,
      couponCode: coupon?.code || null,
    });

    // Ghi vào cả `lyra_last_address` lẫn sổ địa chỉ của trang Tài khoản.
    rememberAddress(address, form);

    clearCart();
    onPlaced(order);
    showToast(`Đã đặt đơn ${order.id} thành công.`, 'bi-bag-check');
  };

  if (cart.length === 0) return null;

  /** Dựng một ô nhập có label liên kết + lỗi inline. */
  const field = (name, label, extra = {}) => {
    const { type = 'text', placeholder, autoComplete, inputMode, wide } = extra;
    const id = `co-${name}`;
    const err = errors[name];
    return (
      <div className={`field-block${wide ? ' is-wide' : ''}`}>
        <label className="form-field-label" htmlFor={id}>{label}</label>
        <input
          id={id}
          name={name}
          ref={(el) => { fieldRefs.current[name] = el; }}
          className="form-field-input"
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={form[name]}
          onChange={(ev) => setField(name, ev.target.value)}
          aria-invalid={err ? 'true' : undefined}
          aria-describedby={err ? `${id}-err` : undefined}
          required
        />
        <span className="field-error" id={`${id}-err`}>{err || ''}</span>
      </div>
    );
  };

  const select = (name, label, options) => {
    const id = `co-${name}`;
    const err = errors[name];
    return (
      <div className="field-block">
        <label className="form-field-label" htmlFor={id}>{label}</label>
        <select
          id={id}
          name={name}
          ref={(el) => { fieldRefs.current[name] = el; }}
          className="form-field-select"
          value={form[name]}
          onChange={(ev) => setField(name, ev.target.value)}
          aria-invalid={err ? 'true' : undefined}
          aria-describedby={err ? `${id}-err` : undefined}
          required
        >
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <span className="field-error" id={`${id}-err`}>{err || ''}</span>
      </div>
    );
  };

  return (
    <div className="checkout-wrapper">
      <div className="eyebrow">Bước 2 · Hoàn tất đơn hàng</div>
      <h1 className="checkout-title">Thanh <em>toán</em></h1>

      <CheckoutSteps current={2} />

      <form className="checkout-grid" onSubmit={submit} noValidate>
        {/* ── Cột trái: thông tin & phương thức ──────────────────── */}
        <div className="checkout-form-col">
          <section className="checkout-block" aria-labelledby="co-ship-head">
            <h2 className="checkout-block-head" id="co-ship-head">Thông tin giao hàng</h2>

            <div className="form-row-2">
              {field('firstName', 'Họ và tên đệm', { placeholder: 'Nguyễn Thu', autoComplete: 'given-name' })}
              {field('lastName', 'Tên', { placeholder: 'Hà', autoComplete: 'family-name' })}
            </div>

            <div className="form-row-2">
              {field('email', 'Email', { type: 'email', placeholder: 'ban@email.com', autoComplete: 'email', inputMode: 'email' })}
              {field('phone', 'Số điện thoại', { type: 'tel', placeholder: '0912345678', autoComplete: 'tel', inputMode: 'tel' })}
            </div>

            <div className="form-row-2">
              {select('city', 'Tỉnh / Thành phố', CITIES)}
              {select('district', 'Quận / Huyện', districts)}
            </div>

            {field('street', 'Địa chỉ cụ thể', {
              placeholder: 'Số nhà, tên đường, phường / xã',
              autoComplete: 'street-address',
              wide: true,
            })}

            <div className="field-block is-wide">
              <label className="form-field-label" htmlFor="co-note">Ghi chú đơn hàng (không bắt buộc)</label>
              <textarea
                id="co-note"
                name="note"
                className="form-field-textarea"
                rows={3}
                placeholder="Giao trong giờ hành chính, gọi trước khi giao…"
                value={form.note}
                onChange={(ev) => setField('note', ev.target.value)}
              />
            </div>
          </section>

          <fieldset className="checkout-block pay-fieldset">
            <legend className="checkout-block-head">Phương thức thanh toán</legend>
            {PAY_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`payment-option${payment === opt.id ? ' active' : ''}`}
                htmlFor={`pay-${opt.id}`}
              >
                <input
                  type="radio"
                  id={`pay-${opt.id}`}
                  name="payment"
                  value={opt.id}
                  checked={payment === opt.id}
                  onChange={() => setPayment(opt.id)}
                />
                <span className="pay-method-label">{opt.label}</span>
                <i className={`bi ${opt.icon} pay-method-icon`} aria-hidden="true" />
              </label>
            ))}
            <p className="pay-note">
              Đây là bản demo — không có giao dịch thật nào được thực hiện.
            </p>
          </fieldset>

          <div className="checkout-actions">
            <button
              type="button"
              className="btn-outline-lyra"
              onClick={() => navigate('cart')}
            >
              <i className="bi bi-arrow-left" aria-hidden="true" /> Về giỏ hàng
            </button>
            <button type="submit" className="btn-lyra checkout-submit">
              Đặt hàng — {fmt(total)}
            </button>
          </div>
        </div>

        {/* ── Cột phải: tóm tắt dính ─────────────────────────────── */}
        <aside className="checkout-summary-sticky" aria-label="Tóm tắt đơn hàng">
          <OrderMiniCard
            cart={cart}
            subtotal={subtotal}
            shipping={shipping}
            discount={discount}
            total={total}
            coupon={coupon}
          />
        </aside>
      </form>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MÀN 3 — ĐẶT HÀNG THÀNH CÔNG
   ══════════════════════════════════════════════════════════════════ */

function SuccessView({ order }) {
  const { navigate } = useApp();
  const addr = order.address || {};

  return (
    <div className="checkout-wrapper">
      <CheckoutSteps current={3} />

      <Reveal className="order-success" as="section">
        <i className="bi bi-check-circle order-success-icon" aria-hidden="true" />
        <div className="eyebrow bare">Cảm ơn bạn</div>
        <h1 className="t-h1 order-success-title">Đặt hàng <em>thành công</em></h1>
        <p className="order-success-sub">
          LYRA đã nhận đơn của bạn và sẽ liên hệ xác nhận trong vòng 24 giờ.
          Hàng dự kiến giao trong 2–3 ngày làm việc.
        </p>

        <div className="order-success-code-box">
          <span className="eyebrow bare">Mã đơn hàng</span>
          <span className="order-success-code">{order.id}</span>
        </div>

        <dl className="order-success-facts">
          <div>
            <dt>Người nhận</dt>
            <dd>{addr.fullName || '—'}</dd>
          </div>
          <div>
            <dt>Giao tới</dt>
            <dd>
              {[addr.street, addr.district, addr.city].filter(Boolean).join(', ') || '—'}
            </dd>
          </div>
          <div>
            <dt>Thanh toán</dt>
            <dd>{payLabel(order.payment)}</dd>
          </div>
          <div>
            <dt>Tổng cộng</dt>
            <dd className="order-success-total">{fmt(order.total)}</dd>
          </div>
        </dl>

        <div className="order-success-actions">
          <button
            type="button"
            className="btn-lyra"
            onClick={() => navigate('order-detail', { order: order.id })}
          >
            Xem đơn hàng
          </button>
          <button type="button" className="btn-outline-lyra" onClick={() => navigate('shop')}>
            Tiếp tục mua sắm
          </button>
        </div>

        <p className="order-success-note">
          Email xác nhận đã được gửi tới <strong>{addr.email || 'địa chỉ email của bạn'}</strong>.
        </p>
      </Reveal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TRANG
   ══════════════════════════════════════════════════════════════════ */

export default function CartPage() {
  const { currentPage } = useApp();
  // Chỉ màn "thành công" là state cục bộ; cart ↔ checkout do URL quyết định.
  const [placedOrder, setPlacedOrder] = useState(null);

  return (
    <div className="cart-page">
      {placedOrder ? (
        <SuccessView order={placedOrder} />
      ) : currentPage === 'checkout' ? (
        <CheckoutView onPlaced={setPlacedOrder} />
      ) : (
        <CartView />
      )}
      <Footer />
    </div>
  );
}
