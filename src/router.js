// src/router.js — pure URL <-> page mapping. No React, no side effects.
// Single source of truth for routing. Used by AppContext and by any link builder.

/** Trang hợp lệ của ứng dụng. */
export const PAGES = [
  'home', 'shop', 'sale', 'new', 'brands', 'search', 'detail',
  'cart', 'checkout', 'auth', 'wishlist', 'profile', 'order-detail', '404',
];

/** Bỏ dấu tiếng Việt + tạo slug an toàn cho URL. */
export function slugify(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Bỏ dấu để so khớp tìm kiếm (không đổi khoảng trắng). */
export function deburr(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

const clean = (v) => (v === undefined || v === null || v === '' ? undefined : String(v));

/** Giải mã một đoạn URL, trả lại nguyên trạng nếu chuỗi bị hỏng. */
const safeDecode = (s) => {
  try { return decodeURIComponent(s); } catch { return s; }
};

/**
 * Phân tích location thành { page, params }.
 * @param {{pathname?: string, search?: string}} loc
 */
export function parseLocation(loc = {}) {
  const pathname = loc.pathname || '/';
  const search = loc.search || '';
  const q = new URLSearchParams(search);
  const params = {};
  for (const [k, v] of q.entries()) if (v !== '') params[k] = v;

  // decodeURIComponent ném URIError với chuỗi hỏng ("%", "%E1%BA"). Hàm này chạy
  // trong initializer của useState ở AppProvider nên một ngoại lệ sẽ làm trắng
  // toàn bộ ứng dụng — luôn giải mã an toàn.
  const segs = pathname.split('/').filter(Boolean).map(safeDecode);

  if (segs.length === 0) return { page: 'home', params };

  switch (segs[0]) {
    case 'shop':
      return { page: 'shop', params };
    case 'sale':
      return { page: 'sale', params };
    case 'new':
      return { page: 'new', params };
    case 'brands':
      return { page: 'brands', params };
    case 'search':
      return { page: 'search', params };
    case 'product':
      return segs[1] ? { page: 'detail', params: { ...params, product: segs[1] } } : { page: '404', params };
    case 'cart':
      return { page: 'cart', params };
    case 'checkout':
      return { page: 'checkout', params };
    case 'auth':
      return { page: 'auth', params };
    case 'wishlist':
      return { page: 'wishlist', params };
    case 'profile':
      return { page: 'profile', params };
    case 'orders':
      return segs[1] ? { page: 'order-detail', params: { ...params, order: segs[1] } } : { page: 'profile', params };
    default:
      return { page: '404', params };
  }
}

/**
 * Dựng URL từ page + params. Bỏ qua các param rỗng.
 * @returns {string} ví dụ "/shop?cat=giay-dep"
 */
export function buildUrl(page, params = {}) {
  const p = { ...params };
  // Các khoá điều khiển điều hướng, không đưa vào URL.
  delete p.replace; delete p.keepScroll; delete p.product; delete p.order;

  let path = '/';
  switch (page) {
    case 'home': path = '/'; break;
    case 'detail': {
      const slug = clean(params.product);
      path = slug ? `/product/${encodeURIComponent(slug)}` : '/shop';
      break;
    }
    case 'order-detail': {
      const id = clean(params.order);
      path = id ? `/orders/${encodeURIComponent(String(id).replace(/^#/, ''))}` : '/profile';
      break;
    }
    case '404': path = '/404'; break;
    default: path = `/${page}`; break;
  }

  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    const val = clean(v);
    if (val !== undefined) q.set(k, val);
  }
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

const TITLES = {
  home: 'Thời trang & Phong cách',
  shop: 'Tất cả sản phẩm',
  sale: 'Khuyến mãi',
  new: 'Hàng mới về',
  brands: 'Thương hiệu',
  search: 'Tìm kiếm',
  detail: 'Sản phẩm',
  cart: 'Giỏ hàng',
  checkout: 'Thanh toán',
  auth: 'Đăng nhập',
  wishlist: 'Yêu thích',
  profile: 'Tài khoản',
  'order-detail': 'Chi tiết đơn hàng',
  '404': 'Không tìm thấy trang',
};

/** Tiêu đề tài liệu cho từng trang. */
export function pageTitle(page, extra) {
  const base = extra || TITLES[page] || TITLES.home;
  return `${base} — LYRA`;
}
