# LYRA — Frontend thương mại điện tử thời trang

Nền tảng mua sắm thời trang cao cấp, xây dựng bằng **React 18 + Vite 5**, CSS thuần trên nền hệ thống thiết kế riêng. Toàn bộ giao diện bằng tiếng Việt.

---

## Khởi động nhanh

```bash
npm install     # cài dependencies
npm run dev     # chạy dev server tại http://localhost:3000
npm run build   # build production vào dist/
npm run preview # xem thử bản build
```

---

## Kiến trúc

### Định tuyến

Dự án **không dùng thư viện router**. `src/router.js` chứa toàn bộ ánh xạ URL ↔ trang dưới dạng hàm thuần (`parseLocation`, `buildUrl`, `pageTitle`, `slugify`, `deburr`); `AppContext` dùng `history.pushState` / `popstate` để đồng bộ. Nhờ vậy mọi trang đều có URL thật, chia sẻ được, tải lại được, và nút Back của trình duyệt hoạt động đúng.

| Trang | URL |
|---|---|
| Trang chủ | `/` |
| Cửa hàng | `/shop?cat=&sort=&color=&min=&max=&rating=&sale=1&stock=1&view=list&page=2` |
| Khuyến mãi | `/sale` |
| Hàng mới về | `/new` |
| Thương hiệu | `/brands?brand=` |
| Tìm kiếm | `/search?q=` |
| Chi tiết sản phẩm | `/product/<slug>` |
| Giỏ hàng | `/cart` |
| Thanh toán | `/checkout` |
| Đăng nhập / Đăng ký | `/auth?mode=register&next=/profile` |
| Yêu thích | `/wishlist` |
| Tài khoản | `/profile?tab=` |
| Chi tiết đơn hàng | `/orders/<mã đơn>` |
| Không tìm thấy | mọi đường dẫn khác |

### Cấu trúc thư mục

```
src/
├── router.js               # ánh xạ URL ↔ trang (hàm thuần, không phụ thuộc React)
├── App.jsx                 # bảng route, mount Navbar / CartDrawer / Toast
├── main.jsx                # điểm vào
├── index.css               # hệ thống thiết kế toàn cục (token, lưới, component chung)
├── context/
│   ├── AppContext.jsx      # điều hướng + URL + xác thực qua backend
│   └── CartContext.jsx     # giỏ hàng, yêu thích, coupon, đơn hàng, toast, đã xem gần đây
├── hooks/
│   └── useReveal.js        # hiệu ứng nội dung vào màn (một IntersectionObserver dùng chung)
├── data/
│   ├── products.js         # 16 sản phẩm, danh mục, coupon, đơn mẫu, đánh giá
│   └── brand.js            # thông tin thương hiệu dùng chung (mùa, hotline, cam kết)
├── services/
│   └── api.js              # axios client + tokenStore + isOffline()
├── components/
│   ├── index.jsx           # Pic, ProductCard, Stars, SectionHeader, EmptyState,
│   │                       # Marquee, Newsletter, Footer, ToastContainer, Reveal
│   ├── Navbar.jsx          # điều hướng, tìm kiếm Ctrl+K, drawer mobile
│   ├── CartDrawer.jsx      # giỏ hàng dạng ngăn kéo trượt
│   ├── SearchModal.jsx     # tìm kiếm nhanh (bỏ dấu, điều hướng bằng phím)
│   └── Modal.jsx           # modal dùng chung (ESC, khoá cuộn, quản lý focus)
├── pages/                  # 13 trang
└── styles/                 # CSS riêng cho từng trang/component
```

---

## Hệ thống thiết kế

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--cream` | `#F7F4EF` | nền chính |
| `--ink` | `#0E0E0E` | chữ & nút chính |
| `--ink-2` | `#3A3632` | chữ nội dung |
| `--warm` | `#C8A97E` | mảng màu, viền, badge |
| `--warm-text` | `#8B6840` | **chữ camel cỡ nhỏ** (đủ tương phản 4.6:1) |
| `--warm-deep` | `#A67F50` | chữ nghiêng trong tiêu đề lớn |
| `--muted` | `#6E6A64` | chữ phụ |
| `--border` | `#E2DDD8` | đường kẻ |
| `--gutter` / `--section` | `clamp(...)` | lề ngang / khoảng cách dọc |

Chữ: **Cormorant Garamond** (tiêu đề, giá) + **DM Sans** (giao diện). Bo góc luôn bằng 0. Chuyển động chậm, một chiều, dùng `--ease-out`; toàn bộ animation tự tắt khi hệ điều hành bật "giảm chuyển động".

Ảnh sản phẩm dùng Unsplash qua helper `img(id, w)`; mọi ảnh render qua `<Pic>` — có khung tỉ lệ cố định (không nhảy layout), ảnh thứ hai hiện khi rê chuột, và tự rơi về ô màu nếu ảnh lỗi.

---

## Tài khoản & dữ liệu

Ứng dụng không có chế độ đăng nhập demo. Đăng nhập và đăng ký luôn được xác thực bởi backend; sau khi nhận access token, frontend gọi `GET /me` để lấy đúng hồ sơ của người dùng.

Quản trị nằm ở repo **LyraShop-admin**, không còn route `/admin` trên storefront.

Giỏ hàng, hồ sơ và đơn hàng được lưu bởi backend theo người dùng đang đăng nhập. Backend hiện chưa có endpoint wishlist và sổ địa chỉ, vì vậy wishlist tạm thời được lưu theo khóa `lyra_wishlist:<userId>` để các tài khoản trên cùng trình duyệt không dùng chung dữ liệu; sổ địa chỉ không hiển thị dữ liệu giả. Lịch sử tìm kiếm vẫn là dữ liệu cục bộ của trình duyệt.

---

## Kết nối backend thật

`src/services/api.js` đọc `VITE_API_URL` (mặc định `/api/v1`), tự gắn `Authorization: Bearer <token>`, dùng refresh-token cookie và tự refresh access token khi gặp 401. Khi chạy `npm run dev`, Vite proxy `/api` sang backend tại `http://localhost:8080` để tránh lỗi CORS giữa cổng 3000 và 8080.

```bash
cp .env.example .env      # rồi sửa VITE_API_URL trỏ tới backend của bạn
```

Các nhóm endpoint đang dùng: `authApi`, `profileApi`, `productApi`, `categoryApi`, `cartApi` và `orderApi`. Lỗi kết nối hoặc lỗi xác thực được hiển thị cho người dùng; ứng dụng không tự chuyển sang tài khoản demo.

---

## Dependencies

| Gói | Vai trò |
|---|---|
| `react`, `react-dom` | framework giao diện |
| `bootstrap`, `bootstrap-icons` | tiện ích lưới/utility và bộ icon |
| `axios` | HTTP client |
| `vite`, `@vitejs/plugin-react` | dev server & build |

`react-router-dom` có trong dependencies nhưng **không được dùng** — định tuyến do `src/router.js` đảm nhiệm.
