// src/data/products.js
// Chỉ giữ lại hàm tiện ích và fallback constants.
// Tất cả dữ liệu thực tế được lấy từ backend API.

/** Format số tiền VND */
export const fmt = (n) => {
  if (n == null) return '0đ';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  return num.toLocaleString('vi-VN') + 'đ';
};

/**
 * Map icon Bootstrap theo tên danh mục (fallback khi backend không trả về icon).
 * Backend không có trường icon/color, ta map theo slug/name.
 */
export const CATEGORY_ICON_MAP = {
  'thoi-trang-nu':  { icon: 'bi-bag-heart', color: '#C9B99A' },
  'thoi-trang-nam': { icon: 'bi-person',    color: '#A8B8C0' },
  'giay-dep':       { icon: 'bi-star',      color: '#8B7860' },
  'phu-kien':       { icon: 'bi-heart',     color: '#B4A898' },
  // fallback
  default:          { icon: 'bi-grid',      color: '#C0B4A4' },
};

/**
 * Map icon Bootstrap theo index thứ tự (fallback cho product listing).
 */
export const PRODUCT_ICONS = [
  'bi-bag-heart', 'bi-bag', 'bi-star', 'bi-heart',
  'bi-bag-heart', 'bi-bag', 'bi-star', 'bi-heart',
];

export const PRODUCT_COLORS = [
  '#E4DAD0', '#D8D0C6', '#CCC0B0', '#C9B99A',
  '#BEB0A0', '#D8D0C4', '#E8E0D5', '#D4CCB8',
];

/** Lấy icon/color fallback cho sản phẩm theo index */
export function getProductMeta(index) {
  return {
    icon:  PRODUCT_ICONS[index % PRODUCT_ICONS.length],
    color: PRODUCT_COLORS[index % PRODUCT_COLORS.length],
  };
}

/** Lấy icon/color cho danh mục theo slug */
export function getCategoryMeta(slug) {
  return CATEGORY_ICON_MAP[slug] || CATEGORY_ICON_MAP.default;
}

/**
 * Chuẩn hoá product từ API response thành object dùng được trong UI.
 * Backend ProductDetailResponse:
 *   { id, name, slug, description, basePrice, categoryId, createdAt, updatedAt, variants[] }
 * Backend ProductResponse (list):
 *   { id, name, slug, description, basePrice, categoryId, createdAt, updatedAt }
 * Variant: { id, sku, size, color, price, stock }
 */
export function normalizeProduct(raw, index = 0) {
  const meta = getProductMeta(index);
  const variants = raw.variants || [];
  const defaultVariant = variants[0] || null;

  // Lấy giá từ variant rẻ nhất, fallback về basePrice
  const price = defaultVariant
    ? Math.min(...variants.map(v => parseFloat(v.price)))
    : parseFloat(raw.basePrice || 0);

  return {
    // ID và định danh
    id:          raw.id,
    slug:        raw.slug,
    name:        raw.name,
    description: raw.description || '',
    categoryId:  raw.categoryId,

    // Giá
    price,
    basePrice:   parseFloat(raw.basePrice || 0),
    oldPrice:    null, // backend hiện chưa có trường này

    // Visual fallback (backend không có icon/color)
    icon:  meta.icon,
    color: meta.color,
    badge: null,

    // Stock từ tổng các variant
    stock: variants.reduce((sum, v) => sum + (v.stock || 0), 0) || 99,

    // Variants đầy đủ
    variants,

    // Metadata cho UI
    brand:   'LYRA',
    rating:  0,
    reviews: 0,
    discount: 0,
  };
}

/**
 * Chuẩn hoá category từ API response.
 * Backend CategoryResponse: { id, name, slug, description, parentId, createdAt, updatedAt }
 */
export function normalizeCategory(raw) {
  const meta = getCategoryMeta(raw.slug);
  return {
    id:          raw.id,
    name:        raw.name,
    slug:        raw.slug,
    description: raw.description || '',
    parentId:    raw.parentId,
    count:       0, // backend không trả về số lượng SP
    icon:        meta.icon,
    color:       meta.color,
  };
}