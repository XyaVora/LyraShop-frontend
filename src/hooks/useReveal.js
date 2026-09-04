// src/hooks/useReveal.js — hiệu ứng "vào màn" dùng CHUNG một IntersectionObserver.
// Mọi phần tử có [data-reveal] sẽ được gắn class 'in' khi lọt vào viewport.
// Thay thế cơ chế .fade-up-1..4 cũ (để opacity: 0 nên nội dung có thể mất hẳn).
import { useEffect } from 'react';

const SELECTOR = '[data-reveal]:not(.in)';

/** Người dùng bật "giảm chuyển động" trong hệ điều hành? */
function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Hiện ngay lập tức (không animation). */
function revealAllNow(root = document) {
  root.querySelectorAll(SELECTOR).forEach((el) => el.classList.add('in'));
}

/**
 * Kích hoạt hiệu ứng reveal cho toàn bộ [data-reveal] đang có trên trang.
 * Gọi một lần ở mỗi trang/App; hook tự theo dõi phần tử mới được thêm vào DOM.
 * @param {Array} deps - phụ thuộc để quét lại (ví dụ dữ liệu vừa đổi).
 */
export function useReveal(deps = []) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    // Không có IntersectionObserver hoặc người dùng muốn giảm chuyển động
    // → hiện toàn bộ nội dung ngay, không chờ cuộn.
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      revealAllNow();
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target); // chỉ chạy một chiều, một lần
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });

    const observeAll = () => {
      document.querySelectorAll(SELECTOR).forEach((el) => observer.observe(el));
    };
    observeAll();

    // Phần tử render sau (danh sách lọc, phân trang…) cũng được theo dõi.
    // Gom nhiều thay đổi DOM trong cùng một khung hình thành MỘT lần quét.
    // Nếu không, mỗi phím gõ trong hộp tìm kiếm sẽ kéo theo một lượt
    // querySelectorAll + đo kích thước toàn trang (forced reflow).
    let mutation;
    let pending = 0;
    if (typeof MutationObserver !== 'undefined') {
      mutation = new MutationObserver(() => {
        if (pending) return;
        pending = window.requestAnimationFrame(() => {
          pending = 0;
          observeAll();
          sweep();
        });
      });
      mutation.observe(document.body, { childList: true, subtree: true });
    }

    // ── Lưới an toàn quyết định ──────────────────────────────────────────
    // IntersectionObserver lấy mẫu theo khung hình: cuộn nhanh (vuốt trên
    // điện thoại, phím End, cuộn bằng script) có thể khiến một phần tử vào
    // rồi ra khỏi màn hình giữa hai lần lấy mẫu và KHÔNG BAO GIỜ được hiện.
    // Vì vậy mỗi lần cuộn ta quét lại: bất cứ phần tử nào đã từng lên tới
    // vùng nhìn thấy đều được hiện, không phụ thuộc observer.
    // Chạy đồng bộ ngay trong sự kiện scroll (không qua requestAnimationFrame:
    // rAF có thể bị hoãn/bỏ khi cuộn rất nhanh hoặc cuộn bằng script, khiến
    // nội dung không bao giờ hiện). Chi phí thấp vì tập [data-reveal]:not(.in)
    // teo dần về rỗng.
    const sweep = () => {
      const nodes = document.querySelectorAll(SELECTOR);
      if (!nodes.length) return;
      const vh = window.innerHeight || 0;
      nodes.forEach((el) => {
        const r = el.getBoundingClientRect();
        // Đã lọt vào vùng nhìn thấy, hoặc đã cuộn qua khỏi (bottom <= 0).
        if (r.bottom <= 0 || (r.top < vh - 40 && r.bottom > 0)) el.classList.add('in');
      });
    };
    const schedule = () => { sweep(); };

    sweep();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (pending) window.cancelAnimationFrame(pending);
      if (mutation) mutation.disconnect();
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useReveal;
