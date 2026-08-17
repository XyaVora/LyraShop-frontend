// src/context/CartContext.jsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { COUPONS, fmt } from '../data/products';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => readStorage('maison_cart', []));
  const [wishlist, setWishlist] = useState(() => readStorage('maison_wishlist', []));
  const [coupon, setCoupon] = useState(() => readStorage('maison_coupon', null));
  const [toasts, setToasts] = useState([]);

  useEffect(() => { localStorage.setItem('maison_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('maison_wishlist', JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { localStorage.setItem('maison_coupon', JSON.stringify(coupon)); }, [coupon]);

  // ── TOAST ──────────────────────────────────────
  const showToast = useCallback((msg, icon = 'bi-check-circle') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, icon }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // ── CART ───────────────────────────────────────
  const addToCart = useCallback((product, qty = 1, size = 'M', color = 'Mặc định') => {
    setCart(prev => {
      const key = `${product.id}-${size}-${color}`;
      const existing = prev.find(i => i.key === key);
      if (existing) return prev.map(i => i.key === key ? { ...i, qty: Math.min(i.stock || 99, i.qty + qty) } : i);
      return [...prev, { ...product, qty, size, color, key }];
    });
    showToast(`Đã thêm "${product.name}" vào giỏ`, 'bi-bag-check');
  }, [showToast]);

  const removeFromCart = useCallback((key) => {
    setCart(prev => prev.filter(i => i.key !== key));
    showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'bi-trash');
  }, [showToast]);

  const updateQty = useCallback((key, delta) => {
    setCart(prev => prev.map(i =>
      i.key === key ? { ...i, qty: Math.max(1, Math.min(i.stock || 99, i.qty + delta)) } : i
    ));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  // ── WISHLIST ───────────────────────────────────
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

  // ── COUPON ─────────────────────────────────────
  const applyCoupon = useCallback((code) => {
    const c = COUPONS[code.toUpperCase()];
    if (c) {
      setCoupon({ code: code.toUpperCase(), ...c });
      showToast(`Áp dụng mã "${code.toUpperCase()}" thành công! ${c.label}`, 'bi-tag');
      return true;
    }
    showToast('Mã giảm giá không hợp lệ', 'bi-x-circle');
    return false;
  }, [showToast]);

  // ── COMPUTED ───────────────────────────────────
  const cartCount  = cart.reduce((a, i) => a + i.qty, 0);
  const subtotal   = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const shipping   = subtotal >= 500000 || (coupon?.type === 'shipping') ? 0 : 30000;
  const discount   = coupon?.type === 'percent'  ? Math.round(subtotal * coupon.value / 100)
                   : coupon?.type === 'fixed'    ? coupon.value
                   : 0;
  const total = subtotal - discount + shipping;

  return (
    <CartContext.Provider value={{
      cart, cartCount, subtotal, shipping, discount, total,
      addToCart, removeFromCart, updateQty, clearCart,
      wishlist, toggleWishlist, isWishlisted,
      coupon, applyCoupon,
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
