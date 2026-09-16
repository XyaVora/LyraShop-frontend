// src/hooks/useReveal.js — hiệu ứng "vào màn" dùng CHUNG một IntersectionObserver.
// Cuộn xuống: phần tử trượt lên vào khung. Cuộn lên: trượt xuống vào khung.
import { useEffect } from 'react';

const SELECTOR = '[data-reveal]';

function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function revealAllNow(root = document) {
  root.querySelectorAll(SELECTOR).forEach((el) => el.classList.add('in'));
}

function inViewport(el, vh) {
  const r = el.getBoundingClientRect();
  return r.top < vh - 48 && r.bottom > 48;
}

/**
 * Kích hoạt hiệu ứng reveal cho toàn bộ [data-reveal] đang có trên trang.
 * Vào viewport → thêm .in; ra khỏi viewport → gỡ .in để lần vào sau (kể cả
 * khi kéo lên) chạy lại animation.
 */
export function useReveal(deps = []) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      revealAllNow();
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('in');
        else entry.target.classList.remove('in');
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

    const observed = new WeakSet();
    const observeAll = () => {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (observed.has(el)) return;
        observed.add(el);
        observer.observe(el);
      });
    };
    observeAll();

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

    const sweep = () => {
      const vh = window.innerHeight || 0;
      document.querySelectorAll(SELECTOR).forEach((el) => {
        el.classList.toggle('in', inViewport(el, vh));
      });
    };

    sweep();
    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('resize', sweep, { passive: true });

    return () => {
      window.removeEventListener('scroll', sweep);
      window.removeEventListener('resize', sweep);
      if (pending) window.cancelAnimationFrame(pending);
      if (mutation) mutation.disconnect();
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useReveal;
