// src/context/CartContext.jsx
// Cart và Wishlist lưu trữ tại client (localStorage).
// Không dùng mock coupon hay mock product.
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fmt } from '../data/products';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart]         = useState(() => readStorage('lyra_cart', []));
  const [wishlist, setWishlist] = useState(() => readStorage('lyra_wishlist', []));
  const [toasts, setToasts]     = useState([]);

  useEffect(() => { localStorage.setItem('lyra_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('lyra_wishlist', JSON.stringify(wishlist)); }, [wishlist]);

  /* ── TOAST ────────────────────────────────── */
  const showToast = useCallback((msg, icon = 'bi-check-circle') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, icon }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  /* ── CART ─────────────────────────────────── */
  /**
   * Thêm sản phẩm vào giỏ.
   * product: { id, name, price, icon, color, brand, stock }
   * variant (tuỳ chọn): { id, size, color, price, stock }
   */
  const addToCart = useCallback((product, qty = 1, size = null, color = null, variantId = null) => {
    const effectiveSize  = size  || product.size  || 'Tiêu chuẩn';
    const effectiveColor = color || product.colorName || 'Mặc định';
    const effectivePrice = product.variantPrice ?? product.price;

    setCart(prev => {
      const key = `${product.id}-${effectiveSize}-${effectiveColor}`;
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i =>
          i.key === key
            ? { ...i, qty: Math.min(i.stock || 99, i.qty + qty) }
            : i
        );
      }
      return [...prev, {
        key,
        id:        product.id,
        variantId: variantId || null,
        name:      product.name,
        price:     effectivePrice,
        icon:      product.icon,
        color:     product.color,
        brand:     product.brand || 'LYRA',
        size:      effectiveSize,
        colorName: effectiveColor,
        qty,
        stock:     product.stock || 99,
      }];
    });
    showToast(`Đã thêm "${product.name}" vào giỏ`, 'bi-bag-check');
  }, [showToast]);

  const removeFromCart = useCallback((key) => {
    setCart(prev => prev.filter(i => i.key !== key));
    showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'bi-trash');
  }, [showToast]);

  const updateQty = useCallback((key, delta) => {
    setCart(prev => prev.map(i =>
      i.key === key
        ? { ...i, qty: Math.max(1, Math.min(i.stock || 99, i.qty + delta)) }
        : i
    ));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  /* ── WISHLIST ─────────────────────────────── */
  const toggleWishlist = useCallback((product) => {
    setWishlist(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        showToast('Đã xóa khỏi danh sách yêu thích', 'bi-heart');
        return prev.filter(p => p.id !== product.id);
      }
      showToast('Đã thêm vào danh sách yêu thích', 'bi-heart-fill');
      return [...prev, product];
    });
  }, [showToast]);

  const isWishlisted = useCallback((id) => wishlist.some(p => p.id === id), [wishlist]);

  /* ── COMPUTED ─────────────────────────────── */
  const cartCount = cart.reduce((a, i) => a + i.qty, 0);
  const subtotal  = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const shipping  = subtotal >= 500000 || subtotal === 0 ? 0 : 30000;
  const discount  = 0;
  const total     = Math.max(0, subtotal - discount + shipping);

  return (
    <CartContext.Provider value={{
      cart, cartCount, subtotal, shipping, discount, total,
      addToCart, removeFromCart, updateQty, clearCart,
      wishlist, toggleWishlist, isWishlisted,
      toasts, showToast,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
