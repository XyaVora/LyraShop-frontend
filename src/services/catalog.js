import { categoryApi, productApi } from './api';
import { isUuid, mapProductDetail } from './shopContract.mjs';
import { PRODUCTS, CATEGORIES, slugify } from '../data/products';

const META_KEY = 'lyra_cart_meta';
const productCache = new Map();

function readMetaStore() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(META_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMetaStore(store) {
  try { sessionStorage.setItem(META_KEY, JSON.stringify(store)); } catch { /* ignore */ }
}

export function rememberVariantMeta(variantId, meta) {
  if (!variantId) return;
  const store = readMetaStore();
  store[variantId] = { ...(store[variantId] || {}), ...meta };
  writeMetaStore(store);
}

export function readVariantMeta(variantId) {
  if (!variantId) return {};
  return readMetaStore()[variantId] || {};
}

export function variantMetaMap() {
  return readMetaStore();
}

export function rememberProduct(product) {
  if (!product?.id) return product;
  productCache.set(String(product.id), product);
  if (product.slug) productCache.set(String(product.slug), product);
  return product;
}

export function findCachedProduct(idOrSlug) {
  if (idOrSlug == null || idOrSlug === '') return null;
  return productCache.get(String(idOrSlug)) || null;
}

export async function loadProductDetail(id) {
  if (!isUuid(id)) return null;
  const cached = productCache.get(String(id));
  if (cached?.variants?.length) return cached;
  const { data } = await productApi.get(id);
  return rememberProduct(mapProductDetail(data));
}

export async function loadShopCatalog() {
  const [listRes, catRes] = await Promise.all([
    productApi.list({ page: 0, size: 100, sort: 'createdAt,desc' }),
    categoryApi.list().catch(() => ({ data: [] })),
  ]);
  const content = Array.isArray(listRes.data?.content) ? listRes.data.content : [];
  const categories = Array.isArray(catRes.data) ? catRes.data : [];
  const categoryName = (id) => categories.find((c) => String(c.id) === String(id))?.name || 'LYRA';

  return content
    .map((item) => rememberProduct(mapProductDetail(item, {
      categoryName: categoryName(item.categoryId),
    })))
    .filter(Boolean);
}

/** Ghép ảnh/mô tả lookbook khi API chưa trả media đầy đủ. */
export function enrichWithMock(product) {
  if (!product) return product;
  const mock = PRODUCTS.find((p) => p.slug === product.slug || p.name === product.name);
  if (!mock) return product;
  const images = Array.isArray(product.images) && product.images.length
    ? (product.images.length > 1 ? product.images : [product.images[0], mock.images?.[1]].filter(Boolean))
    : mock.images;
  const colors = Array.isArray(product.colors) && product.colors.some((c) => c.hex && c.hex !== '#E9E2D6')
    ? product.colors
    : mock.colors;
  return {
    ...mock,
    ...product,
    images,
    colors,
    color: product.color && product.color !== '#E9E2D6' ? product.color : mock.color,
    icon: product.icon || mock.icon,
    desc: product.desc || mock.desc,
    material: product.material || mock.material,
    origin: product.origin || mock.origin,
    fit: product.fit || mock.fit,
    care: product.care || mock.care,
    tags: product.tags?.length ? product.tags : mock.tags,
    oldPrice: product.oldPrice ?? mock.oldPrice,
    discount: product.discount || mock.discount,
    badge: product.badge || mock.badge,
    rating: product.rating || mock.rating,
    reviews: product.reviews || mock.reviews,
    sold: product.sold || mock.sold,
  };
}

export async function loadCatalogOrMock() {
  try {
    const list = await loadShopCatalog();
    return { products: (list || []).map(enrichWithMock), fromApi: true };
  } catch {
    /* backend tắt → dùng lookbook mock */
  }
  return { products: PRODUCTS, fromApi: false };
}

export function categoriesFrom(products) {
  const counts = new Map();
  (products || []).forEach((p) => {
    const name = p.cat || 'LYRA';
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  if (!counts.size) return [];
  const base = CATEGORIES.map((c) => ({
    ...c,
    count: counts.get(c.name) || 0,
  }));
  counts.forEach((count, name) => {
    if (!base.some((c) => c.name === name)) {
      base.push({
        id: name,
        name,
        slug: slugify(name),
        count,
        icon: 'bi-grid',
        color: '#C0B4A4',
        image: '',
        blurb: '',
      });
    }
  });
  return base.filter((c) => c.count > 0);
}

export function relatedFrom(list, product, n = 4) {
  if (!product) return (list || []).slice(0, n);
  const pool = (list || []).filter((p) => p.id !== product.id);
  const same = pool.filter((p) => p.cat === product.cat).sort((a, b) => (b.sold || 0) - (a.sold || 0));
  const rest = pool.filter((p) => p.cat !== product.cat).sort((a, b) => (b.sold || 0) - (a.sold || 0));
  return [...same, ...rest].slice(0, n);
}

export function wearWithFrom(list, product, n = 3) {
  if (!product) return (list || []).slice(0, n);
  const pool = (list || []).filter((p) => p.id !== product.id);
  const different = pool.filter((p) => p.cat !== product.cat).sort((a, b) => (b.sold || 0) - (a.sold || 0));
  const same = pool.filter((p) => p.cat === product.cat).sort((a, b) => (b.sold || 0) - (a.sold || 0));
  return [...different, ...same].slice(0, n);
}

export function colorFacetsFrom(products) {
  const map = new Map();
  (products || []).forEach((p) => {
    (Array.isArray(p.colors) ? p.colors : []).forEach((c) => {
      if (!c?.name) return;
      const found = map.get(c.name);
      if (found) found.count += 1;
      else map.set(c.name, { name: c.name, hex: c.hex, count: 1 });
    });
  });
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));
}
