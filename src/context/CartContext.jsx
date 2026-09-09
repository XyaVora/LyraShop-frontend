// src/context/CartContext.jsx — giỏ hàng, yêu thích, mã giảm giá, toast,
// đơn hàng và "đã xem gần đây". Toàn bộ dữ liệu lưu ở localStorage `lyra_*`.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  COUPONS,
  FREE_SHIPPING_THRESHOLD,
  ORDERS_MOCK,
  SHIPPING_FEE,
  findProduct,
  fmt,
} from '../data/products';

const CartContext = createContext(null);

/* ── Khoá localStorage (tất cả đều là lyra_*) ────────────────────────── */
const K_CART = 'lyra_cart';
const K_WISHLIST = 'lyra_wishlist';
const K_COUPON = 'lyra_coupon';
const K_ORDERS = 'lyra_orders';
const K_RECENT = 'lyra_recent';
const MAX_RECENT = 8;
const TOAST_MS = 3200;
const MAX_TOASTS = 4;

/* ── localStorage an toàn: đọc/ghi đều bọc try/catch và kiểm tra kiểu ── */
function readStore(key, fallback, validate) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof validate === 'function' && !validate(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}
function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* bỏ qua */ }
}
function removeStore(key) {
  try { localStorage.removeItem(key); } catch { /* bỏ qua */ }
}

/* ── Tiện ích ────────────────────────────────────────────────────────── */
const isArr = Array.isArray;
const normId = (id) => String(id || '').replace(/^#/, '').toUpperCase();
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

/** Size mặc định: lấy size giữa bộ size của sản phẩm. */
const defaultSize = (p) => {
  const sizes = isArr(p?.sizes) && p.sizes.length ? p.sizes : ['Free size'];
  return sizes[Math.floor(sizes.length / 2)];
};
/** Màu mặc định: màu đầu tiên trong danh sách màu của sản phẩm. */
const defaultColor = (p) => (isArr(p?.colors) && p.colors.length ? p.colors[0].name : 'Mặc định');

const cartKey = (id, size, variantColor) => `${id}|${size}|${variantColor}`;

/**
 * Dựng item giỏ hàng đúng hợp đồng §3.
 * Lưu ý: `tint` giữ mã màu placeholder của sản phẩm, `variantColor` mới là
 * tên màu người dùng chọn — KHÔNG ghi đè `product.color` như bản cũ.
 */
function makeCartItem(product, qty, size, variantColor) {
  return {
    key: cartKey(product.id, size, variantColor),
    productId: product.id,
    slug: product.slug,
    name: product.name,
    price: num(product.price),
    oldPrice: product.oldPrice ?? null,
    image: isArr(product.images) ? product.images[0] : product.image,
    tint: product.color,
    icon: product.icon,
    qty: Math.max(1, num(qty, 1)),
    size,
    variantColor,
    stock: num(product.stock, 99),
    cat: product.cat,
    brand: product.brand,
  };
}

/**
 * Đồng bộ item đã lưu với catalog hiện tại: giá/tồn kho/ảnh luôn mới,
 * sản phẩm đã bị gỡ khỏi catalog thì loại bỏ khỏi giỏ.
 */
function hydrateCartItem(stored) {
  if (!stored || typeof stored !== 'object') return null;
  const product = findProduct(stored.productId ?? stored.id ?? stored.slug);
  if (!product) return null;
  const size = stored.size || defaultSize(product);
  const variantColor = stored.variantColor || stored.colorName || defaultColor(product);
  const item = makeCartItem(product, num(stored.qty, 1), size, variantColor);
  item.qty = Math.max(1, Math.min(item.stock || 99, item.qty));
  return item;
}

/** Gộp các item trùng key (có thể xảy ra sau khi hydrate). */
function mergeCart(items) {
  const out = [];
  for (const it of items) {
    const found = out.find((o) => o.key === it.key);
    if (found) found.qty = Math.min(found.stock || 99, found.qty + it.qty);
    else out.push(it);
  }
  return out;
}

/* ── ĐƠN HÀNG ────────────────────────────────────────────────────────── */
// Cùng nhãn với timeline của ORDERS_MOCK để hai loại đơn hiển thị như nhau.
const TIMELINE_STEPS = [
  { label: 'Đặt hàng thành công', note: 'Đơn hàng được tạo trên website LYRA' },
  { label: 'Đã xác nhận', note: 'LYRA xác nhận đơn và chuẩn bị hàng' },
  { label: 'Đang đóng gói', note: 'Kho Hà Nội đóng gói và dán tem niêm phong' },
  { label: 'Đang giao hàng', note: 'Bàn giao đơn vị vận chuyển' },
  { label: 'Đã giao hàng', note: 'Giao tới địa chỉ nhận' },
];
/** Số bước đã hoàn tất tương ứng từng trạng thái. */
const DONE_BY_STATUS = {
  processing: 1, confirmed: 2, packing: 3, shipping: 4, delivered: 5, cancelled: 1,
};

function buildTimeline(createdAt, status = 'processing') {
  const done = DONE_BY_STATUS[status] ?? 1;
  return TIMELINE_STEPS.map((step, i) => ({
    label: step.label,
    note: step.note,
    date: i < done ? createdAt : null,
    done: i < done,
  }));
}

/** Cập nhật timeline theo trạng thái mới, giữ nguyên mốc thời gian đã có. */
function applyStatus(timeline, status, when) {
  const steps = isArr(timeline) && timeline.length ? timeline : buildTimeline(when, status);
  const done = DONE_BY_STATUS[status] ?? 1;
  return steps.map((s, i) => ({
    ...s,
    done: i < done,
    // Giữ nguyên mốc thời gian đã ghi nhận. Nếu quản trị viên lùi trạng thái
    // (ví dụ shipping → processing) thì các bước sau chỉ mất cờ `done`, còn
    // lịch sử thời gian không bị xoá trắng — dữ liệu này không khôi phục được.
    date: i < done ? (s.date || when) : (s.date || null),
  }));
}

/** Chuẩn hoá đơn (kể cả đơn mock hoặc dữ liệu cũ) về cùng một shape. */
function normalizeOrder(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id) return null; // dữ liệu hỏng → bỏ
  const createdAt = raw.createdAt || raw.date || new Date().toISOString();
  const status = raw.status || 'processing';
  const items = (isArr(raw.items) ? raw.items : []).map((it) => {
    // Dữ liệu cũ có thể chỉ là mảng id sản phẩm.
    if (typeof it === 'number' || typeof it === 'string') {
      const p = findProduct(it);
      return {
        productId: it,
        qty: 1,
        size: p ? defaultSize(p) : 'M',
        variantColor: p ? defaultColor(p) : 'Mặc định',
        price: num(p?.price),
        name: p?.name,
      };
    }
    const p = findProduct(it.productId);
    return {
      productId: it.productId,
      qty: Math.max(1, num(it.qty, 1)),
      size: it.size || (p ? defaultSize(p) : 'M'),
      variantColor: it.variantColor || it.colorName || (p ? defaultColor(p) : 'Mặc định'),
      price: num(it.price, num(p?.price)),
      name: it.name || p?.name,
    };
  });
  const subtotal = num(raw.subtotal, items.reduce((a, i) => a + i.price * i.qty, 0));
  const shipping = num(raw.shipping);
  const discount = num(raw.discount);
  return {
    id: raw.id,
    createdAt,
    status,
    items,
    address: raw.address || null,
    payment: raw.payment || 'cod',
    note: raw.note || '',
    couponCode: raw.couponCode || null,
    subtotal,
    shipping,
    discount,
    total: num(raw.total, Math.max(0, subtotal - discount + shipping)),
    timeline: isArr(raw.timeline) && raw.timeline.length
      ? raw.timeline
      : buildTimeline(createdAt, status),
  };
}

// Đơn mock chuẩn hoá một lần ở tầng module (thuần, không side effect).
const MOCK_ORDERS = (isArr(ORDERS_MOCK) ? ORDERS_MOCK : []).map(normalizeOrder).filter(Boolean);

/* ── PROVIDER ────────────────────────────────────────────────────────── */
export function CartProvider({ children }) {
  // Giỏ hàng: đọc từ localStorage rồi đồng bộ lại với catalog.
  const [cart, setCart] = useState(() => {
    const stored = readStore(K_CART, [], isArr);
    return mergeCart(stored.map(hydrateCartItem).filter(Boolean));
  });

  // Yêu thích lưu dạng id, expose ra ngoài là object sản phẩm đầy đủ.
  const [wishlistIds, setWishlistIds] = useState(() => {
    const stored = readStore(K_WISHLIST, [], isArr);
    const ids = stored.map((v) => (v && typeof v === 'object' ? v.id : v));
    return ids.filter((id) => Boolean(findProduct(id)));
  });

  // Coupon: chỉ giữ mã, dựng lại từ COUPONS để không "sống dai" khi đổi bảng mã.
  const [coupon, setCouponState] = useState(() => {
    const stored = readStore(K_COUPON, null);
    const code = stored && typeof stored === 'object' ? stored.code : stored;
    const c = code ? COUPONS[String(code).toUpperCase()] : null;
    return c ? { code: String(code).toUpperCase(), ...c } : null;
  });

  const [orders, setOrders] = useState(() =>
    readStore(K_ORDERS, [], isArr).map(normalizeOrder).filter(Boolean));

  const [recentIds, setRecentIds] = useState(() => {
    const stored = readStore(K_RECENT, [], isArr);
    return stored.filter((id) => Boolean(findProduct(id))).slice(0, MAX_RECENT);
  });

  const [toasts, setToasts] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  /* ── Ghi localStorage ─────────────────────────────────────────────── */
  useEffect(() => { writeStore(K_CART, cart); }, [cart]);
  useEffect(() => { writeStore(K_WISHLIST, wishlistIds); }, [wishlistIds]);
  useEffect(() => { writeStore(K_ORDERS, orders); }, [orders]);
  useEffect(() => { writeStore(K_RECENT, recentIds); }, [recentIds]);
  useEffect(() => {
    if (coupon) writeStore(K_COUPON, { code: coupon.code });
    else removeStore(K_COUPON);
  }, [coupon]);

  /* ── TOAST ────────────────────────────────────────────────────────── */
  const toastSeq = useRef(0);          // id tăng dần, không dùng Date.now()
  const toastTimers = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timer = toastTimers.current.get(id);
    if (timer) { clearTimeout(timer); toastTimers.current.delete(id); }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((msg, icon = 'bi-check-circle', { action } = {}) => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToasts((prev) => [...prev, { id, msg, icon, action }].slice(-MAX_TOASTS));
    const timer = setTimeout(() => {
      toastTimers.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_MS);
    toastTimers.current.set(id, timer);
    return id;
  }, []);

  // Dọn timer khi unmount.
  useEffect(() => {
    const timers = toastTimers.current;
    return () => { timers.forEach(clearTimeout); timers.clear(); };
  }, []);

  /* ── GIỎ HÀNG ─────────────────────────────────────────────────────── */
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  // Bấm Back/Forward khi đang mở ngăn kéo giỏ hàng phải đóng nó lại — nếu không
  // lớp phủ vẫn che trang mới và cuộn trang vẫn bị khoá.
  useEffect(() => {
    const onNavigated = () => setCartOpen(false);
    window.addEventListener('lyra:navigated', onNavigated);
    return () => window.removeEventListener('lyra:navigated', onNavigated);
  }, []);

  const addToCart = useCallback((product, qty = 1, size, variantColor, { openDrawer = true } = {}) => {
    if (!product) return;
    // Cho phép truyền cả sản phẩm đầy đủ, id/slug, hoặc item của đơn hàng cũ
    // ({ productId, ... }) — luôn quy về bản ghi mới nhất trong catalog.
    const p = findProduct(product) || findProduct(product.productId) || product;
    if (!p || p.id === undefined) return;

    const s = size || defaultSize(p);
    const c = variantColor || defaultColor(p);
    const key = cartKey(p.id, s, c);

    // Hàm cập nhật giữ thuần: mọi side effect (mở drawer) làm ở ngoài.
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key
          ? { ...i, qty: Math.min(i.stock || 99, i.qty + Math.max(1, num(qty, 1))) }
          : i));
      }
      // Dựng item từ `p` (bản ghi catalog đã phân giải), KHÔNG từ tham số thô:
      // caller có thể truyền id, slug, hoặc item đơn hàng cũ thiếu ảnh/giá/tồn kho.
      return [...prev, makeCartItem(p, qty, s, c)];
    });

    if (openDrawer) setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((key) => {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const updateQty = useCallback((key, delta) => {
    setCart((prev) => prev.map((i) => (i.key === key
      ? { ...i, qty: Math.max(1, Math.min(i.stock || 99, i.qty + num(delta))) }
      : i)));
  }, []);

  const setQty = useCallback((key, n) => {
    setCart((prev) => prev.map((i) => (i.key === key
      ? { ...i, qty: Math.max(1, Math.min(i.stock || 99, Math.round(num(n, 1)))) }
      : i)));
  }, []);

  /** Xoá sạch giỏ — xoá luôn coupon đang áp dụng (state + localStorage). */
  const clearCart = useCallback(() => {
    setCart([]);
    setCouponState(null);
    removeStore(K_COUPON);
  }, []);

  /* ── YÊU THÍCH ────────────────────────────────────────────────────── */
  const wishlist = useMemo(
    () => wishlistIds.map((id) => findProduct(id)).filter(Boolean),
    [wishlistIds],
  );

  const isWishlisted = useCallback(
    (id) => wishlistIds.some((w) => String(w) === String(id)),
    [wishlistIds],
  );

  const toggleWishlist = useCallback((product, { silent = false } = {}) => {
    if (!product) return;
    // Quyết định TRƯỚC khi gọi setState để không đặt side effect trong updater.
    const exists = wishlistIds.some((w) => String(w) === String(product.id));
    setWishlistIds((prev) => (exists
      ? prev.filter((w) => String(w) !== String(product.id))
      : [...prev, product.id]));
    if (!silent) {
      showToast(
        exists ? 'Đã xoá khỏi danh sách yêu thích' : 'Đã thêm vào danh sách yêu thích',
        exists ? 'bi-heart' : 'bi-heart-fill',
      );
    }
  }, [wishlistIds, showToast]);

  /* ── TÍNH TOÁN GIỎ HÀNG ───────────────────────────────────────────── */
  const cartCount = useMemo(() => cart.reduce((a, i) => a + i.qty, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((a, i) => a + i.price * i.qty, 0), [cart]);

  /* Mã giảm giá chỉ có hiệu lực khi giỏ vẫn đạt điều kiện tối thiểu.
     Đây là NGUỒN DUY NHẤT quyết định điều đó — kiểm tra lúc bấm "Áp dụng" là
     chưa đủ: khách có thể bớt hàng sau khi áp mã, hoặc mã được khôi phục từ
     localStorage ở phiên sau khi giỏ đã khác. */
  const couponEligible = useMemo(
    () => Boolean(coupon) && cart.length > 0 && subtotal >= num(coupon.min),
    [coupon, cart.length, subtotal],
  );

  // Giỏ rỗng thì không tính phí ship; coupon loại shipping chỉ miễn phí khi đủ điều kiện.
  const shipping = cart.length === 0
    || subtotal >= FREE_SHIPPING_THRESHOLD
    || (coupon?.type === 'shipping' && couponEligible)
    ? 0
    : SHIPPING_FEE;

  const discount = useMemo(() => {
    if (!coupon || !couponEligible) return 0;
    const raw = coupon.type === 'percent'
      ? Math.round((subtotal * num(coupon.value)) / 100)
      : coupon.type === 'fixed' ? num(coupon.value) : 0;
    return Math.min(subtotal, Math.max(0, raw)); // không bao giờ vượt tạm tính
  }, [coupon, couponEligible, subtotal]);

  const total = Math.max(0, subtotal - discount + shipping);

  /** Đơn đã được miễn phí vận chuyển (do đạt ngưỡng hoặc do mã FREESHIP). */
  const freeShipping = shipping === 0 && cart.length > 0;

  /* Còn thiếu bao nhiêu để được miễn phí ship. Nếu đã miễn phí (kể cả nhờ mã)
     thì bằng 0 — nếu không giao diện sẽ vừa báo "đã miễn phí" vừa giục mua thêm. */
  const freeShipRemaining = freeShipping ? 0 : Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  /* ── MÃ GIẢM GIÁ ──────────────────────────────────────────────────── */
  const applyCoupon = useCallback((code) => {
    const key = String(code || '').trim().toUpperCase();
    if (!key) { showToast('Vui lòng nhập mã giảm giá', 'bi-exclamation-circle'); return false; }

    const c = COUPONS[key];
    if (!c) { showToast('Mã giảm giá không hợp lệ', 'bi-x-circle'); return false; }

    const min = num(c.min);
    if (subtotal < min) {
      showToast(`Mã ${key} chỉ áp dụng cho đơn từ ${fmt(min)}`, 'bi-exclamation-circle');
      return false;
    }

    setCouponState({ code: key, ...c });
    showToast(`Đã áp dụng mã ${key} — ${c.label}`, 'bi-tag');
    return true;
  }, [subtotal, showToast]);

  const removeCoupon = useCallback(() => {
    setCouponState(null);
    removeStore(K_COUPON);
    showToast('Đã bỏ mã giảm giá', 'bi-tag');
  }, [showToast]);

  /* Tự gỡ mã khi giỏ tụt xuống dưới điều kiện tối thiểu.
     `discount` đã trả 0 trong trường hợp này nên tiền luôn đúng; effect này chỉ
     dọn giao diện để khách không thấy một mã "đang áp dụng" mà không giảm gì.
     Chỉ bắn đúng một lần, khi giỏ còn hàng, và không bắn lúc vừa mount. */
  const warnedCoupon = useRef('');
  useEffect(() => {
    if (!coupon) { warnedCoupon.current = ''; return; }
    const min = num(coupon.min);
    // Giỏ rỗng: giữ mã lại, khách có thể đang xoá để chọn lại hàng.
    if (cart.length === 0 || subtotal >= min) return;
    if (warnedCoupon.current === coupon.code) return; // đã báo rồi, không lặp
    warnedCoupon.current = coupon.code;
    const { code } = coupon;
    setCouponState(null);
    removeStore(K_COUPON);
    showToast(`Đã gỡ mã ${code} — đơn hàng chưa đạt ${fmt(min)}`, 'bi-exclamation-circle');
  }, [coupon, subtotal, cart.length, showToast]);

  /* ── ĐƠN HÀNG ─────────────────────────────────────────────────────── */
  const allOrders = useMemo(() => {
    const saved = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const savedIds = new Set(saved.map((o) => normId(o.id)));
    const mocks = MOCK_ORDERS.filter((o) => !savedIds.has(normId(o.id)));
    // Sắp xếp TOÀN BỘ theo thời gian: đơn mock khai báo theo thứ tự cũ → mới,
    // nếu chỉ nối vào sau thì danh sách đơn ở trang Tài khoản sẽ không đơn điệu.
    return [...saved, ...mocks].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [orders]);

  const getOrder = useCallback(
    (id) => allOrders.find((o) => normId(o.id) === normId(id)) || null,
    [allOrders],
  );

  /** Mã đơn kế tiếp dạng #LY26xxxx, không trùng với đơn mock. */
  const nextOrderId = useCallback(() => {
    const nums = [...orders, ...MOCK_ORDERS]
      .map((o) => parseInt(String(o.id).replace(/\D/g, '').slice(-4), 10))
      .filter((n) => Number.isFinite(n));
    const n = Math.max(orders.length, ...nums, 0) + 1;
    return `#LY26${String(n).padStart(4, '0')}`;
  }, [orders]);

  const placeOrder = useCallback((payload = {}) => {
    const createdAt = new Date().toISOString();
    const items = (isArr(payload.items) ? payload.items : cart).map((i) => ({
      productId: i.productId ?? i.id,
      qty: Math.max(1, num(i.qty, 1)),
      size: i.size,
      variantColor: i.variantColor,
      price: num(i.price),
      name: i.name,
    }));
    const sub = num(payload.subtotal, items.reduce((a, i) => a + i.price * i.qty, 0));
    const ship = num(payload.shipping);
    const disc = Math.min(sub, num(payload.discount));

    const order = {
      id: nextOrderId(),
      createdAt,
      status: 'processing',
      items,
      address: payload.address || null,
      payment: payload.payment || 'cod',
      note: payload.note || '',
      couponCode: payload.couponCode || null,
      subtotal: sub,
      shipping: ship,
      discount: disc,
      total: num(payload.total, Math.max(0, sub - disc + ship)),
      timeline: buildTimeline(createdAt, 'processing'),
    };

    setOrders((prev) => [order, ...prev]);
    return order;
  }, [cart, nextOrderId]);

  /**
   * Cập nhật đơn — hoạt động cả với đơn mock: lần đầu chạm tới thì copy
   * bản mock vào danh sách đã lưu rồi mới sửa (copy-on-write).
   */
  const patchOrder = useCallback((id, patch) => {
    const target = normId(id);
    // Kiểm tra sự tồn tại NGOÀI updater để trả về kết quả đồng bộ chính xác.
    const exists = orders.some((o) => normId(o.id) === target)
      || MOCK_ORDERS.some((o) => normId(o.id) === target);
    if (!exists) return false;

    setOrders((prev) => {
      const idx = prev.findIndex((o) => normId(o.id) === target);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch(next[idx]) };
        return next;
      }
      const mock = MOCK_ORDERS.find((o) => normId(o.id) === target);
      if (!mock) return prev;
      return [{ ...mock, ...patch(mock) }, ...prev];
    });
    return true;
  }, [orders]);

  const updateOrderStatus = useCallback((id, status) => {
    const when = new Date().toISOString();
    return patchOrder(id, (o) => ({
      status,
      timeline: applyStatus(o.timeline, status, when),
    }));
  }, [patchOrder]);

  const cancelOrder = useCallback((id) => {
    const when = new Date().toISOString();
    return patchOrder(id, (o) => ({
      status: 'cancelled',
      cancelledAt: when,
      timeline: applyStatus(o.timeline, 'cancelled', when),
    }));
  }, [patchOrder]);

  /* ── ĐÃ XEM GẦN ĐÂY (tối đa 8) ────────────────────────────────────── */
  const recentlyViewed = useMemo(
    () => recentIds.map((id) => findProduct(id)).filter(Boolean),
    [recentIds],
  );

  const addRecentlyViewed = useCallback((productId) => {
    if (productId === undefined || productId === null) return;
    setRecentIds((prev) => {
      // Đã đứng đầu danh sách → giữ nguyên để tránh render thừa.
      if (prev.length && String(prev[0]) === String(productId)) return prev;
      const rest = prev.filter((id) => String(id) !== String(productId));
      return [productId, ...rest].slice(0, MAX_RECENT);
    });
  }, []);

  /* ── GIÁ TRỊ CONTEXT ──────────────────────────────────────────────── */
  const value = useMemo(() => ({
    cart, cartCount, subtotal, shipping, discount, total, freeShipRemaining, freeShipping, couponEligible,
    addToCart, removeFromCart, updateQty, setQty, clearCart,
    cartOpen, openCart, closeCart,
    wishlist, toggleWishlist, isWishlisted,
    coupon, applyCoupon, removeCoupon,
    toasts, showToast, dismissToast,
    orders, allOrders, placeOrder, cancelOrder, updateOrderStatus, getOrder,
    recentlyViewed, addRecentlyViewed,
  }), [
    cart, cartCount, subtotal, shipping, discount, total, freeShipRemaining, freeShipping, couponEligible,
    addToCart, removeFromCart, updateQty, setQty, clearCart,
    cartOpen, openCart, closeCart,
    wishlist, toggleWishlist, isWishlisted,
    coupon, applyCoupon, removeCoupon,
    toasts, showToast, dismissToast,
    orders, allOrders, placeOrder, cancelOrder, updateOrderStatus, getOrder,
    recentlyViewed, addRecentlyViewed,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
export default CartContext;
