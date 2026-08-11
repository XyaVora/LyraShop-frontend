// src/data/products.js
export const PRODUCTS = [
  { id: 1,  name: 'Áo lụa cổ V premium',       brand: 'Lyra',  cat: 'Thời trang nữ', price: 890000,  oldPrice: 1290000, discount: 31, rating: 4.3, reviews: 128, badge: 'Sale', icon: 'bi-bag-heart',  color: '#E4DAD0', stock: 24 },
  { id: 2,  name: 'Quần culotte high-waist',    brand: 'Maison',  cat: 'Thời trang nữ', price: 650000,  oldPrice: null,    discount: 0,  rating: 4.7, reviews: 84,  badge: 'New',  icon: 'bi-bag',        color: '#D8D0C6', stock: 12 },
  { id: 3,  name: 'Giày mule da thật',          brand: 'Maison',  cat: 'Giày dép',      price: 1290000, oldPrice: 1890000, discount: 32, rating: 4.5, reviews: 201, badge: 'Sale', icon: 'bi-star',       color: '#CCC0B0', stock: 8  },
  { id: 4,  name: 'Túi mini bucket da bò',      brand: 'Maison',  cat: 'Phụ kiện',      price: 1850000, oldPrice: null,    discount: 0,  rating: 4.8, reviews: 56,  badge: 'Hot',  icon: 'bi-heart',      color: '#C9B99A', stock: 6  },
  { id: 5,  name: 'Blazer unstructured',         brand: 'Maison',  cat: 'Thời trang nữ', price: 1490000, oldPrice: 1990000, discount: 25, rating: 4.6, reviews: 93,  badge: 'Sale', icon: 'bi-bag-heart',  color: '#BEB0A0', stock: 15 },
  { id: 6,  name: 'Váy midi floral lụa',        brand: 'Maison',  cat: 'Thời trang nữ', price: 780000,  oldPrice: null,    discount: 0,  rating: 4.4, reviews: 147, badge: 'New',  icon: 'bi-bag',        color: '#D8D0C4', stock: 20 },
  { id: 7,  name: 'Sneaker leather trắng',      brand: 'Maison',  cat: 'Giày dép',      price: 1150000, oldPrice: 1450000, discount: 21, rating: 4.2, reviews: 312, badge: 'Sale', icon: 'bi-star',       color: '#E8E0D5', stock: 30 },
  { id: 8,  name: 'Áo sơ mi cotton oversize',  brand: 'Maison',  cat: 'Thời trang nam', price: 590000,  oldPrice: null,    discount: 0,  rating: 4.5, reviews: 178, badge: 'New',  icon: 'bi-person',     color: '#D4CCB8', stock: 18 },
  { id: 9,  name: 'Quần jean slim fit',         brand: 'Maison',  cat: 'Thời trang nam', price: 820000,  oldPrice: 1100000, discount: 25, rating: 4.3, reviews: 265, badge: 'Sale', icon: 'bi-bag',        color: '#B8C4CC', stock: 22 },
  { id: 10, name: 'Sandal gót thấp da lộn',    brand: 'Maison',  cat: 'Giày dép',      price: 680000,  oldPrice: null,    discount: 0,  rating: 4.6, reviews: 89,  badge: 'New',  icon: 'bi-star',       color: '#C8BEB0', stock: 10 },
  { id: 11, name: 'Áo khoác denim',            brand: 'Maison',  cat: 'Thời trang nam', price: 950000,  oldPrice: 1350000, discount: 30, rating: 4.4, reviews: 134, badge: 'Sale', icon: 'bi-bag-heart',  color: '#A8B8C0', stock: 7  },
  { id: 12, name: 'Ví da nhỏ card holder',     brand: 'Maison',  cat: 'Phụ kiện',      price: 420000,  oldPrice: null,    discount: 0,  rating: 4.7, reviews: 207, badge: 'Hot',  icon: 'bi-heart',      color: '#C0B4A4', stock: 35 },
  { id: 13, name: 'Đầm wrap dress chiffon',    brand: 'Maison',  cat: 'Thời trang nữ', price: 1120000, oldPrice: 1580000, discount: 29, rating: 4.5, reviews: 76,  badge: 'Sale', icon: 'bi-bag-heart',  color: '#D4C8B8', stock: 9  },
  { id: 14, name: 'Boot ankle da thật',         brand: 'Maison',  cat: 'Giày dép',      price: 1680000, oldPrice: null,    discount: 0,  rating: 4.9, reviews: 42,  badge: 'New',  icon: 'bi-star',       color: '#B4A898', stock: 5  },
  { id: 15, name: 'Áo polo cotton pima',        brand: 'Maison',  cat: 'Thời trang nam', price: 490000,  oldPrice: 690000,  discount: 29, rating: 4.3, reviews: 156, badge: 'Sale', icon: 'bi-person',     color: '#C4D0C8', stock: 28 },
  { id: 16, name: 'Belt da bò handmade',       brand: 'Maison',  cat: 'Phụ kiện',      price: 320000,  oldPrice: null,    discount: 0,  rating: 4.6, reviews: 98,  badge: 'Hot',  icon: 'bi-heart',      color: '#C8B89A', stock: 40 },
];

export const CATEGORIES = [
  { id: 1, name: 'Thời trang nữ', count: 248, icon: 'bi-bag-heart', color: '#C9B99A' },
  { id: 2, name: 'Thời trang nam', count: 184, icon: 'bi-person',    color: '#A8B8C0' },
  { id: 3, name: 'Giày dép',       count: 312, icon: 'bi-star',      color: '#8B7860' },
  { id: 4, name: 'Phụ kiện',       count: 96,  icon: 'bi-heart',     color: '#B4A898' },
];

export const COUPONS = {
  'MAISON10':  { type: 'percent', value: 10,     label: 'Giảm 10%' },
  'MAISON20':  { type: 'percent', value: 20,     label: 'Giảm 20%' },
  'FREESHIP':  { type: 'shipping', value: 0,     label: 'Miễn phí vận chuyển' },
  'SAVE100K':  { type: 'fixed',   value: 100000, label: 'Giảm 100.000đ' },
};

export const ORDERS_MOCK = [
  { id: '#MSN240001', date: '15/01/2025', total: 2740000, status: 'delivered', items: [1, 3, 4] },
  { id: '#MSN240002', date: '22/01/2025', total: 1290000, status: 'shipping',  items: [5, 8] },
  { id: '#MSN240003', date: '28/01/2025', total: 820000,  status: 'processing', items: [9] },
];

export const fmt = (n) => n.toLocaleString('vi-VN') + 'đ';