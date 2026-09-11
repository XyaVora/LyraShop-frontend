import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { cartApi, extractErrorMessage, productApi } from '../services/api';
import { normalizeProduct } from '../data/products';
import { useApp } from './AppContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isLoggedIn, user, navigate } = useApp();
  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [toasts, setToasts] = useState([]);
  const variantCatalog = useRef(new Map());

  const wishlistKey = user?.id ? `lyra_wishlist:${user.id}` : 'lyra_wishlist:guest';

  useEffect(() => {
    setWishlist(readStorage(wishlistKey, []));
  }, [wishlistKey]);

  const showToast = useCallback((msg, icon = 'bi-check-circle') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, icon }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const applyCartResponse = useCallback((data) => {
    const next = (data?.items || []).map(item => normalizeCartItem(item, variantCatalog.current));
    setCart(next);
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
      variantCatalog.current = new Map();
      return;
    }
    refreshCart();
  }, [isLoggedIn, user?.id, refreshCart]);

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
    } catch (error) {
      showToast(extractErrorMessage(error, 'Không thể xóa giỏ hàng'), 'bi-x-circle');
      throw error;
    }
  }, [isLoggedIn, showToast]);

  const toggleWishlist = useCallback((product) => {
    setWishlist(prev => {
      const exists = prev.some(p => p.id === product.id);
      const next = exists ? prev.filter(p => p.id !== product.id) : [...prev, product];
      writeStorage(wishlistKey, next);
      showToast(
        exists ? 'Đã xóa khỏi danh sách yêu thích' : 'Đã thêm vào danh sách yêu thích',
        exists ? 'bi-heart' : 'bi-heart-fill',
      );
      return next;
    });
  }, [showToast, wishlistKey]);

  const isWishlisted = useCallback((id) => wishlist.some(p => p.id === id), [wishlist]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  // Backend hiện chưa có phí vận chuyển trong mô hình đơn hàng.
  const shipping = 0;
  const discount = 0;
  const total = subtotal;

  return (
    <CartContext.Provider value={{
      cart, cartCount, subtotal, shipping, discount, total, cartLoading,
      addToCart, removeFromCart, updateQty, clearCart, refreshCart,
      wishlist, toggleWishlist, isWishlisted,
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

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
