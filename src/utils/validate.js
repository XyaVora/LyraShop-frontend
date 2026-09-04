// src/utils/validate.js — Quy tắc kiểm tra email / số điện thoại dùng chung.
//
// Module "lá": KHÔNG import bất cứ thứ gì trong dự án, nên mọi trang đều có thể
// dùng mà không sinh vòng phụ thuộc (đặc biệt là components/index.jsx vốn đã
// import AppContext). Trước đây mỗi trang tự khai một bản regex riêng, dẫn tới
// cùng một email / số điện thoại được nơi này chấp nhận nhưng nơi kia từ chối.

/**
 * Email: phần trước và sau '@' không chứa khoảng trắng, đuôi chỉ gồm chữ cái
 * ASCII từ 2 ký tự. Cố ý KHÔNG dùng dải 'À-ỹ' — dải đó chứa cả '×' (U+00D7) và
 * '÷' (U+00F7) nên 'a@b.××' sẽ lọt qua.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/** Số điện thoại Việt Nam: 0 + 9 chữ số, hoặc +84 + 9 chữ số. */
export const PHONE_RE = /^(0|\+84)\d{9}$/;

/**
 * Chuẩn hoá số điện thoại trước khi kiểm tra hoặc lưu: bỏ khoảng trắng, dấu
 * chấm, gạch ngang và ngoặc đơn — những cách viết rất phổ biến ở Việt Nam
 * (091.234.5678, 091-234-5678, (091) 234 5678).
 * Dấu '-' đặt CUỐI lớp ký tự để không tạo thành dải ngoài ý muốn.
 */
export const normPhone = (v) => String(v ?? '').replace(/[\s.()-]/g, '');

/** Email hợp lệ (đã bỏ khoảng trắng thừa hai đầu). */
export const isEmail = (v) => EMAIL_RE.test(String(v ?? '').trim());

/** Số điện thoại hợp lệ sau khi chuẩn hoá. */
export const isPhone = (v) => PHONE_RE.test(normPhone(v));
