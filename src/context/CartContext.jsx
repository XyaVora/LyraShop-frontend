import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { cartApi, extractErrorMessage, productApi, wishlistApi } from '../services/api';
import { normalizeProduct } from '../data/products';
import { useApp } from './AppContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isLoggedIn, user, navigate } = useApp();
  const [cart, setCart] = useState([]);
  const [cartPricing, setCartPricing] = useState({ subtotal: 0, discount: 0, shipping: 0, total: 0 });
  const [cartLoading, setCartLoading] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState('');
  const [toasts, setToasts] = useState([]);
  const variantCatalog = useRef(new Map());

  const showToast = useCallback((msg, icon = 'bi-check-circle') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, icon }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const refreshWishlist = useCallback(async ({ silent = false } = {}) => {
    if (!isLoggedIn) {
      setWishlist([]);
      setWishlistError('');
      return [];
    }
    if (!silent) setWishlistLoading(true);
    try {
      const { data } = await wishlistApi.list();
      const next = await normalizeWishlistResponse(data);
      setWishlist(next);
      setWishlistError('');
      return next;
    } catch (error) {
      const message = extractErrorMessage(error, 'Không thể tải danh sách yêu thích');
      setWishlistError(message);
      if (!silent) showToast(message, 'bi-exclamation-circle');
      return [];
    } finally {
      if (!silent) setWishlistLoading(false);
    }
  }, [isLoggedIn, showToast]);

  const applyCartResponse = useCallback((data) => {
    const next = (data?.items || []).map(item => normalizeCartItem(item, variantCatalog.current));
    setCart(next);
    const fallbackSubtotal = next.reduce((sum, item) => sum + item.price * item.qty, 0);
    setCartPricing({
      subtotal: Number(data?.subtotalAmount ?? fallbackSubtotal),
      discount: Number(data?.discountAmount ?? 0),
      shipping: Number(data?.shippingFee ?? 0),
      total: Number(data?.totalAmount ?? fallbackSubtotal),
    });
    return next;
  }, []);

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn) {
      setCart([]);
      return [];
    }
    setCartLoading(true);
    try {
      const [cartResult, catalogResult] = await Promise.allSettled([
        cartApi.get(),
        loadVariantCatalog(),
      ]);
      if (catalogResult.status === 'fulfilled') variantCatalog.current = catalogResult.value;
      if (cartResult.status === 'rejected') throw cartResult.reason;
      return applyCartResponse(cartResult.value.data);
    } catch (error) {
      showToast(extractErrorMessage(error, 'Không thể tải giỏ hàng'), 'bi-exclamation-circle');
      return [];
    } finally {
      setCartLoading(false);
    }
  }, [applyCartResponse, isLoggedIn, showToast]);

  useEffect(() => {
    if (!isLoggedIn) {
      setCart([]);
      setCartPricing({ subtotal: 0, discount: 0, shipping: 0, total: 0 });
      variantCatalog.current = new Map();
      return;
    }
    refreshCart();
  }, [isLoggedIn, user?.id, refreshCart]);

  useEffect(() => {
    refreshWishlist();
  }, [isLoggedIn, user?.id, refreshWishlist]);

  const addToCart = useCallback(async (
    product,
    qty = 1,
    size = null,
    color = null,
    variantId = null,
  ) => {
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ', 'bi-person');
      navigate('auth');
      return false;
    }

    try {
      let detail = product;
      if (!detail?.variants?.length && product?.id) {
        const response = await productApi.get(product.id);
        detail = normalizeProduct(response.data);
      }

      const variants = detail?.variants || [];
      const selected = variants.find(v => v.id === variantId)
        || variants.find(v =>
          (!size || v.size === size) && (!color || v.color === color) && v.stock > 0
        )
        || variants.find(v => v.stock > 0);

      if (!selected?.id) throw new Error('Sản phẩm chưa có phiên bản còn hàng');

      variantCatalog.current.set(String(selected.id), { ...detail, variant: selected });
      const response = await cartApi.addItem(selected.id, qty);
      applyCartResponse(response.data);
      showToast(`Đã thêm "${detail.name}" vào giỏ`, 'bi-bag-check');
      return true;
    } catch (error) {
      showToast(extractErrorMessage(error, error.message || 'Không thể thêm vào giỏ hàng'), 'bi-x-circle');
      return false;
    }
  }, [applyCartResponse, isLoggedIn, navigate, showToast]);

  const removeFromCart = useCallback(async (key) => {
    const item = cart.find(entry => entry.key === key);
    if (!item) return;
    try {
      const response = await cartApi.removeItem(item.cartItemId);
      applyCartResponse(response.data);
      showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'bi-trash');
    } catch (error) {
      showToast(extractErrorMessage(error, 'Không thể xóa sản phẩm'), 'bi-x-circle');
    }
  }, [applyCartResponse, cart, showToast]);

  const updateQty = useCallback(async (key, delta) => {
    const item = cart.find(entry => entry.key === key);
    if (!item) return;
    const quantity = Math.max(1, Math.min(item.stock || 99, item.qty + delta));
    if (quantity === item.qty) return;
    try {
      const response = await cartApi.updateItem(item.cartItemId, quantity);
      applyCartResponse(response.data);
    } catch (error) {
      showToast(extractErrorMessage(error, 'Không thể cập nhật số lượng'), 'bi-x-circle');
    }
  }, [applyCartResponse, cart, showToast]);

  const clearCart = useCallback(async () => {
    if (!isLoggedIn) {
      setCart([]);
      return;
    }
    try {
      await cartApi.clear();
      setCart([]);
      setCartPricing({ subtotal: 0, discount: 0, shipping: 0, total: 0 });
    } catch (error) {
      showToast(extractErrorMessage(error, 'Không thể xóa giỏ hàng'), 'bi-x-circle');
      throw error;
    }
  }, [isLoggedIn, showToast]);

  const toggleWishlist = useCallback(async (product) => {
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập để lưu sản phẩm yêu thích', 'bi-person');
      navigate('auth');
      return false;
    }
    const exists = wishlist.some(item => item.id === product.id);
    try {
      if (exists) await wishlistApi.remove(product.id);
      else await wishlistApi.add(product.id);
      await refreshWishlist({ silent: true });
      showToast(
        exists ? 'Đã xóa khỏi danh sách yêu thích' : 'Đã thêm vào danh sách yêu thích',
        exists ? 'bi-heart' : 'bi-heart-fill',
      );
      return true;
    } catch (error) {
      showToast(extractErrorMessage(error, 'Không thể cập nhật danh sách yêu thích'), 'bi-x-circle');
      return false;
    }
  }, [isLoggedIn, navigate, refreshWishlist, showToast, wishlist]);

  const isWishlisted = useCallback((id) => wishlist.some(p => p.id === id), [wishlist]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const { subtotal, shipping, discount, total } = cartPricing;

  return (
    <CartContext.Provider value={{
      cart, cartCount, subtotal, shipping, discount, total, cartLoading,
      addToCart, removeFromCart, updateQty, clearCart, refreshCart,
      wishlist, wishlistLoading, wishlistError, refreshWishlist, toggleWishlist, isWishlisted,
      toasts, showToast,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

function normalizeCartItem(item, catalog) {
  const meta = catalog.get(String(item.variantId));
  const variant = meta?.variant;
  return {
    key: String(item.id),
    cartItemId: item.id,
    id: meta?.id || item.variantId,
    productId: meta?.id || null,
    slug: meta?.slug || null,
    variantId: item.variantId,
    name: meta?.name || item.sku,
    price: Number(item.unitPrice || 0),
    icon: meta?.icon || 'bi-bag',
    color: meta?.color || '#E4DAD0',
    brand: meta?.brand || 'LYRA',
    size: item.size || 'Tiêu chuẩn',
    colorName: item.color || 'Mặc định',
    qty: item.quantity || 1,
    stock: variant?.stock ?? Math.max(item.quantity || 1, 99),
  };
}

let catalogPromise;
function loadVariantCatalog() {
  if (catalogPromise) return catalogPromise;
  catalogPromise = productApi.list({ size: 100 })
    .then(({ data }) => {
      const catalog = new Map();
      (data?.content || []).forEach((rawProduct, index) => {
        const product = normalizeProduct(rawProduct, index);
        product.variants.forEach(variant => {
          catalog.set(String(variant.id), { ...product, variant });
        });
      });
      return catalog;
    })
    .catch(error => {
      catalogPromise = null;
      throw error;
    });
  return catalogPromise;
}

async function normalizeWishlistResponse(data) {
  const entries = Array.isArray(data) ? data : (data?.items || []);
  const products = await Promise.all(entries.map(async (entry, index) => {
    const embedded = entry?.product || entry;
    if (embedded?.name && embedded?.id) return normalizeProduct(embedded, index);
    const productId = entry?.productId || embedded?.productId;
    if (!productId) return null;
    try {
      const response = await productApi.get(productId);
      return normalizeProduct(response.data, index);
    } catch {
      return null;
    }
  }));
  return products.filter(Boolean);
}
