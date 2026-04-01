# MAISON — Fashion E-Commerce Frontend

Nền tảng mua sắm thời trang cao cấp xây dựng bằng React 18 + Bootstrap 5.

---

## 🚀 Khởi động nhanh

```bash
# 1. Cài dependencies
npm install

# 2. Chạy dev server
npm run dev

# 3. Build production
npm run build
```

Mở trình duyệt tại: http://localhost:3000

---

## 📁 Cấu trúc thư mục

```
maison-shop/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Navbar.jsx         # Navigation bar (responsive, mobile drawer)
│   │   └── index.jsx          # Shared components:
│   │                          #   ProductCard, Stars, Marquee,
│   │                          #   Newsletter, Footer, ToastContainer
│   ├── context/
│   │   ├── AppContext.jsx     # App state: page nav, auth, selected product
│   │   └── CartContext.jsx    # Cart state: add/remove/qty, wishlist, coupon, toast
│   ├── data/
│   │   └── products.js        # Mock data: 16 products, categories, coupons, orders
│   ├── pages/
│   │   ├── HomePage.jsx       # Trang chủ: Hero, Categories, Featured, Newsletter
│   │   ├── ShopPage.jsx       # Trang shop: Filter sidebar, product grid, pagination
│   │   ├── ProductDetailPage.jsx  # Chi tiết SP: Gallery, options, reviews, related
│   │   ├── CartPage.jsx       # Giỏ hàng + Checkout + Order success
│   │   ├── AuthPage.jsx       # Đăng nhập / Đăng ký
│   │   ├── ProfilePage.jsx    # Hồ sơ: Đơn hàng, Wishlist, Địa chỉ, Cài đặt
│   │   ├── AdminPage.jsx      # Admin: Dashboard, Products, Orders, Customers, Coupons
│   │   └── NotFoundPage.jsx   # 404 + Loading Screen
│   ├── App.jsx                # Root component, page routing
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles (CSS variables, all component styles)
├── index.html
├── vite.config.js
└── package.json
```

---

## 🎨 Design System

| Token | Giá trị |
|---|---|
| `--cream` | `#F7F4EF` — Background chính |
| `--ink` | `#0E0E0E` — Text & button |
| `--warm` | `#C8A97E` — Accent vàng camel |
| `--muted` | `#8A8680` — Text phụ |
| `--border` | `#E2DDD8` — Viền |
| Font Serif | Cormorant Garamond |
| Font Sans | DM Sans |

---

## 📄 Các trang

| Trang | Mô tả |
|---|---|
| **Home** | Hero, marquee, categories grid, featured products, sale banner, new arrivals, perks, newsletter, footer |
| **Shop** | Filter sidebar (danh mục, giá, màu, rating), sort, grid/list view, pagination |
| **Product Detail** | Gallery 4 thumbnail, chọn màu/size/qty, tabs (mô tả/thông số/đánh giá), related products |
| **Cart** | Danh sách sản phẩm, cập nhật số lượng, coupon, order summary |
| **Checkout** | 4-bước: địa chỉ giao hàng, phương thức thanh toán, xác nhận đơn |
| **Auth** | Login/Register, social auth (UI), forgot password |
| **Profile** | Đơn hàng, wishlist, địa chỉ, thông tin cá nhân, đổi mật khẩu |
| **Admin** | Dashboard + charts, quản lý sản phẩm, đơn hàng, khách hàng, coupon, settings |
| **404** | Not found page + Loading screen |

---

## 🔌 Kết nối Backend (Python Flask/Django)

Thay mock data trong `src/data/products.js` bằng API calls thực:

```js
// Ví dụ dùng axios để fetch products
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const fetchProducts = () => axios.get(`${API_BASE}/products`);
export const fetchProduct  = (id) => axios.get(`${API_BASE}/products/${id}`);
export const createOrder   = (data) => axios.post(`${API_BASE}/orders`, data);
export const loginUser     = (data) => axios.post(`${API_BASE}/auth/login`, data);
```

Tạo `src/services/api.js` và thay thế từng hàm trong context.

---

## 🧪 Mã coupon demo

| Mã | Ưu đãi |
|---|---|
| `MAISON10` | Giảm 10% |
| `MAISON20` | Giảm 20% |
| `FREESHIP` | Miễn phí vận chuyển |
| `SAVE100K` | Giảm 100.000đ |

---

## 📦 Dependencies

```
react@18          — UI framework
react-dom@18      — DOM rendering
react-router-dom  — (cài sẵn, có thể dùng thay routing hiện tại)
bootstrap@5.3     — CSS grid & utilities
bootstrap-icons   — Icon set
axios             — HTTP client cho API calls
vite              — Dev server & build tool
```
