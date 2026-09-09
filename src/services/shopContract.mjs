// Pure mapping for public catalog, cart, and order API contracts.
// No I/O — tests import this file directly.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

export function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const STATUS_TO_UI = {
  PENDING: 'processing',
  CONFIRMED: 'confirmed',
  PROCESSING: 'packing',
  SHIPPING: 'shipping',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const TIMELINE_STEPS = [
  { label: 'Đặt hàng thành công', note: 'Đơn hàng được tạo trên website LYRA' },
  { label: 'Đã xác nhận', note: 'LYRA xác nhận đơn và chuẩn bị hàng' },
  { label: 'Đang đóng gói', note: 'Kho Hà Nội đóng gói và dán tem niêm phong' },
  { label: 'Đang giao hàng', note: 'Bàn giao đơn vị vận chuyển' },
  { label: 'Đã giao hàng', note: 'Giao tới địa chỉ nhận' },
];

const DONE_BY_STATUS = {
  processing: 1,
  confirmed: 2,
  packing: 3,
  shipping: 4,
  delivered: 5,
  cancelled: 1,
};

export function toUiStatus(status) {
  if (!status) return 'processing';
  const key = String(status).toUpperCase();
  if (STATUS_TO_UI[key]) return STATUS_TO_UI[key];
  const lower = String(status).toLowerCase();
  if (DONE_BY_STATUS[lower] != null) return lower;
  return 'processing';
}

export function toApiPaymentMethod(payment) {
  const key = String(payment || '').trim().toLowerCase();
  if (key === 'vnpay') return 'VNPAY';
  return 'COD';
}

export function toUiPayment(method) {
  const key = String(method || '').trim().toUpperCase();
  if (key === 'VNPAY') return 'vnpay';
  if (key === 'COD') return 'cod';
  return String(method || 'cod').toLowerCase();
}

export function buildTimeline(createdAt, status = 'processing') {
  const done = DONE_BY_STATUS[toUiStatus(status)] ?? 1;
  return TIMELINE_STEPS.map((step, i) => ({
    label: step.label,
    note: step.note,
    date: i < done ? createdAt : null,
    done: i < done,
  }));
}

export function resolveVariantId(product, size, color) {
  if (!product) return null;
  if (product.variantId && isUuid(product.variantId)) return product.variantId;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length === 0) return null;
  const sizeNorm = String(size || '').trim().toLowerCase();
  const colorNorm = String(color || '').trim().toLowerCase();
  const match = variants.find((variant) => {
    const sameSize = !sizeNorm || String(variant.size || '').trim().toLowerCase() === sizeNorm;
    const sameColor = !colorNorm || String(variant.color || '').trim().toLowerCase() === colorNorm;
    return sameSize && sameColor;
  });
  const picked = match || variants[0];
  return picked?.id && isUuid(picked.id) ? picked.id : null;
}

export function buildAddCartItemRequest(variantId, quantity) {
  const qty = Math.max(1, Math.min(99, Math.round(num(quantity, 1))));
  return { variantId, quantity: qty };
}

export function buildCreateOrderRequest({ shippingAddress, shippingPhone, note, paymentMethod }) {
  const body = {
    shippingAddress: String(shippingAddress || '').trim(),
    shippingPhone: String(shippingPhone || '').trim(),
    paymentMethod: toApiPaymentMethod(paymentMethod),
  };
  const trimmedNote = String(note || '').trim();
  if (trimmedNote) body.note = trimmedNote;
  return body;
}

export function formatShippingAddress(address) {
  if (!address) return '';
  if (typeof address === 'string') return address.trim();
  return [address.street, address.district, address.city].filter(Boolean).join(', ');
}

export function mapProductDetail(raw, extras = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const variants = Array.isArray(raw.variants) ? raw.variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    price: num(variant.price, num(raw.basePrice)),
    stock: Math.max(0, num(variant.stock)),
  })) : [];
  const images = (Array.isArray(raw.images) ? [...raw.images] : [])
    .sort((a, b) => Number(b.primary) - Number(a.primary) || num(a.sortOrder) - num(b.sortOrder))
    .map((image) => image?.url)
    .filter(Boolean);
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const colors = [...new Map(
    variants
      .filter((v) => v.color)
      .map((v) => [v.color, { name: v.color, hex: extras.colorHex || '#E9E2D6' }]),
  ).values()];
  const stock = variants.reduce((sum, v) => sum + v.stock, 0);
  const price = variants.length
    ? Math.min(...variants.map((v) => v.price))
    : num(raw.basePrice);
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    desc: raw.description || '',
    description: raw.description || '',
    price,
    oldPrice: null,
    discount: 0,
    rating: num(raw.averageRating),
    reviews: num(raw.reviewCount),
    sold: 0,
    stock,
    badge: extras.badge || '',
    icon: extras.icon || 'bi-bag-heart',
    color: extras.tint || '#E9E2D6',
    images,
    cat: extras.categoryName || 'LYRA',
    brand: extras.brand || 'LYRA',
    createdAt: raw.createdAt,
    variants,
    sizes: sizes.length ? sizes : ['Free size'],
    colors: colors.length ? colors : [{ name: 'Mặc định', hex: '#E9E2D6' }],
    categoryId: raw.categoryId,
  };
}

export function mapCartItem(item, meta = {}) {
  if (!item || item.id == null) return null;
  const qty = Math.max(1, num(item.quantity, 1));
  const price = num(item.unitPrice);
  const name = meta.name || item.sku || 'Sản phẩm LYRA';
  return {
    key: String(item.id),
    cartItemId: item.id,
    variantId: item.variantId,
    productId: meta.productId || item.variantId,
    slug: meta.slug,
    name,
    price,
    oldPrice: meta.oldPrice ?? null,
    image: meta.image,
    tint: meta.tint || '#E9E2D6',
    icon: meta.icon || 'bi-bag-heart',
    qty,
    size: item.size,
    variantColor: item.color,
    stock: num(meta.stock, 99),
    cat: meta.cat || 'LYRA',
    brand: meta.brand || 'LYRA',
    sku: item.sku,
    subtotal: num(item.subtotal, price * qty),
  };
}

export function mapCartToItems(cart, metaByVariant = {}) {
  const items = Array.isArray(cart?.items) ? cart.items : [];
  return items
    .map((item) => mapCartItem(item, metaByVariant[item.variantId] || {}))
    .filter(Boolean);
}

export function mapOrderItem(item) {
  if (!item) return null;
  const qty = Math.max(1, num(item.quantity, 1));
  const price = num(item.unitPrice);
  return {
    productId: item.variantId,
    variantId: item.variantId,
    qty,
    size: item.size,
    variantColor: item.color,
    price,
    name: item.productName || item.sku || 'Sản phẩm LYRA',
    sku: item.sku,
    subtotal: num(item.subtotal, price * qty),
  };
}

export function mapOrderResponse(raw) {
  if (!raw || !raw.id) return null;
  const createdAt = raw.createdAt || new Date().toISOString();
  const status = toUiStatus(raw.status);
  const items = (Array.isArray(raw.items) ? raw.items : []).map(mapOrderItem).filter(Boolean);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = num(raw.totalAmount, subtotal);
  const shippingAddress = String(raw.shippingAddress || '');
  return {
    id: raw.id,
    createdAt,
    updatedAt: raw.updatedAt,
    status,
    items,
    address: {
      fullName: '',
      phone: raw.shippingPhone || '',
      email: '',
      street: shippingAddress,
      district: '',
      city: '',
    },
    payment: toUiPayment(raw.paymentMethod),
    paymentStatus: raw.paymentStatus,
    paymentUrl: raw.paymentUrl || null,
    note: raw.note || '',
    couponCode: null,
    subtotal,
    shipping: 0,
    discount: 0,
    total,
    timeline: buildTimeline(createdAt, status),
    source: 'api',
  };
}
