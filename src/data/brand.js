// src/data/brand.js — nguồn duy nhất cho thông tin thương hiệu LYRA.
// Mọi trang (Footer, Home, Brands, Checkout…) đọc từ đây, không hard-code.

export const BRAND = {
  name: 'LYRA',
  season: 'Thu – Đông 2026',
  founded: 2018,
  hotline: '1900 1234',
  email: 'hello@lyra.vn',
  address: '128 Phố Huế, Hai Bà Trưng, Hà Nội',

  // Bốn cam kết hiển thị ở dải cam kết trang chủ + trang giỏ hàng.
  promises: [
    {
      icon: 'bi-truck',
      title: 'Miễn phí vận chuyển',
      sub: 'Cho mọi đơn hàng từ 500.000đ trên toàn quốc',
    },
    {
      icon: 'bi-arrow-repeat',
      title: 'Đổi trả 30 ngày',
      sub: 'Đổi size hoặc hoàn tiền trong 30 ngày, không cần lý do',
    },
    {
      icon: 'bi-patch-check',
      title: 'Cam kết chính hãng',
      sub: 'Thiết kế và sản xuất bởi xưởng riêng của LYRA',
    },
    {
      icon: 'bi-headset',
      title: 'Hỗ trợ 24/7',
      sub: 'Tư vấn chất liệu và chọn size mọi ngày trong tuần',
    },
  ],

  socials: [
    { name: 'Facebook', icon: 'bi-facebook', url: '#' },
    { name: 'Instagram', icon: 'bi-instagram', url: '#' },
    { name: 'TikTok', icon: 'bi-tiktok', url: '#' },
    { name: 'YouTube', icon: 'bi-youtube', url: '#' },
    { name: 'Pinterest', icon: 'bi-pinterest', url: '#' },
  ],
};

export default BRAND;
