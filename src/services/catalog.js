import { categoryApi, productApi } from './api';
import { isUuid, mapProductDetail } from './shopContract.mjs';

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
    productApi.list({ page: 0, size: 48, sort: 'createdAt,desc' }),
    categoryApi.list().catch(() => ({ data: [] })),
  ]);
  const content = Array.isArray(listRes.data?.content) ? listRes.data.content : [];
  const categories = Array.isArray(catRes.data) ? catRes.data : [];
  const categoryName = (id) => categories.find((c) => String(c.id) === String(id))?.name || 'LYRA';

  const details = await Promise.all(content.map(async (item) => {
    try {
      const { data } = await productApi.get(item.id);
      return rememberProduct(mapProductDetail(data, { categoryName: categoryName(data.categoryId) }));
    } catch {
      return rememberProduct(mapProductDetail({
        ...item,
        variants: [],
        images: [],
      }, { categoryName: categoryName(item.categoryId) }));
    }
  }));
  return details.filter(Boolean);
}
